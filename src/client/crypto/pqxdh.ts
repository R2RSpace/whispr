/** Whispr — PQXDH Key Exchange
 * Implements PQXDH = X25519 + ML-KEM-768 hybrid key exchange.
 * Per Signal spec + ML-KEM-768 for post-quantum security.
 * PATCH 08: Generates mailbox IDs during handshake.
 * 
 * Key Agreement Output: shared_secret used to initialize Triple Ratchet.
 */
import { x25519 } from '@noble/curves/ed25519';
import { ml_kem768 } from '@noble/post-quantum/ml-kem';
import { hkdf } from '@noble/hashes/hkdf';
import { sha512 } from '@noble/hashes/sha512';
import { shred } from './keyDerivation';

export interface X25519KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface KyberKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface PQXDHInitResult {
  sharedSecret: Uint8Array;          // 32 bytes — init Triple Ratchet with this
  ephemeralX25519Pub: Uint8Array;    // sent to recipient
  kyberCiphertext: Uint8Array;       // sent to recipient
  mailboxIds: string[];               // PATCH 08: generated for recipient
}

export interface PQXDHResponseResult {
  sharedSecret: Uint8Array;           // 32 bytes — same as initiator
}

/**
 * Generate X25519 keypair for Diffie-Hellman key exchange.
 */
export function generateX25519KeyPair(): X25519KeyPair {
  const privateKey = crypto.getRandomValues(new Uint8Array(32));
  const publicKey = x25519.getPublicKey(privateKey);
  return { publicKey, privateKey };
}

/**
 * Generate ML-KEM-768 keypair for post-quantum key encapsulation.
 */
export function generateKyberKeyPair(): KyberKeyPair {
  const keys = ml_kem768.keygen();
  return {
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
  };
}

/**
 * Initiator: Perform PQXDH key exchange (Alice → Bob).
 * 
 * Combines:
 * - X25519(ephemeral_a, identity_b) — classical DH
 * - X25519(ephemeral_a, signed_prekey_b) — classical DH
 * - X25519(ephemeral_a, one_time_prekey_b) — classical DH (if available)
 * - ML-KEM-768.encapsulate(kyber_prekey_b) — post-quantum KEM
 * 
 * Final: HKDF-SHA512(classical_secrets || kyber_secret) → 32 bytes
 * 
 * @param identityKeyB - Recipient's identity public key (X25519)
 * @param signedPrekeyB - Recipient's signed prekey (X25519)
 * @param oneTimePrekeyB - Recipient's one-time prekey (X25519, optional)
 * @param kyberPrekeyB - Recipient's ML-KEM-768 public key
 */
export function pqxdhInitiate(
  identityKeyB: Uint8Array,
  signedPrekeyB: Uint8Array,
  oneTimePrekeyB: Uint8Array | null,
  kyberPrekeyB: Uint8Array
): PQXDHInitResult {
  // Generate ephemeral X25519 keypair
  const ephemeral = generateX25519KeyPair();

  // Classical DH exchanges
  const dh1 = x25519.getSharedSecret(ephemeral.privateKey, identityKeyB);
  const dh2 = x25519.getSharedSecret(ephemeral.privateKey, signedPrekeyB);
  const dh3 = oneTimePrekeyB
    ? x25519.getSharedSecret(ephemeral.privateKey, oneTimePrekeyB)
    : new Uint8Array(32);

  // Post-quantum KEM: encapsulate with Bob's Kyber public key
  const { cipherText: kyberCiphertext, sharedSecret: kyberShared } =
    ml_kem768.encapsulate(kyberPrekeyB);

  // Combine all DH outputs + KEM output
  const combined = new Uint8Array(dh1.length + dh2.length + dh3.length + kyberShared.length);
  combined.set(dh1, 0);
  combined.set(dh2, dh1.length);
  combined.set(dh3, dh1.length + dh2.length);
  combined.set(kyberShared, dh1.length + dh2.length + dh3.length);

  // Final key: HKDF-SHA512(combined) → 32 bytes
  const sharedSecret = hkdf(sha512, combined, undefined, 'Whispr-pqxdh-v1', 32);

  // Shred intermediate secrets (PATCH 07)
  shred(ephemeral.privateKey);
  shred(dh1);
  shred(dh2);
  shred(dh3);
  shred(kyberShared);
  shred(combined);

  // PATCH 08: Generate mailbox IDs for recipient
  const mailboxIds: string[] = [];
  for (let i = 0; i < 10; i++) {
    mailboxIds.push(crypto.randomUUID());
  }

  return {
    sharedSecret,
    ephemeralX25519Pub: ephemeral.publicKey,
    kyberCiphertext,
    mailboxIds,
  };
}

/**
 * Responder: Complete PQXDH key exchange (Bob processes Alice's message).
 * 
 * @param identityKeyBPriv - Bob's identity private key
 * @param signedPrekeyBPriv - Bob's signed prekey private key
 * @param oneTimePrekeyBPriv - Bob's one-time prekey private key (optional)
 * @param kyberSecretKeyB - Bob's ML-KEM-768 secret key
 * @param ephemeralPubA - Alice's ephemeral X25519 public key
 * @param kyberCiphertextA - Alice's KEM ciphertext
 */
export function pqxdhRespond(
  identityKeyBPriv: Uint8Array,
  signedPrekeyBPriv: Uint8Array,
  oneTimePrekeyBPriv: Uint8Array | null,
  kyberSecretKeyB: Uint8Array,
  ephemeralPubA: Uint8Array,
  kyberCiphertextA: Uint8Array
): PQXDHResponseResult {
  // Classical DH exchanges (mirror of initiator)
  const dh1 = x25519.getSharedSecret(identityKeyBPriv, ephemeralPubA);
  const dh2 = x25519.getSharedSecret(signedPrekeyBPriv, ephemeralPubA);
  const dh3 = oneTimePrekeyBPriv
    ? x25519.getSharedSecret(oneTimePrekeyBPriv, ephemeralPubA)
    : new Uint8Array(32);

  // Post-quantum KEM: decapsulate
  const kyberShared = ml_kem768.decapsulate(kyberCiphertextA, kyberSecretKeyB);

  // Combine all DH outputs + KEM output
  const combined = new Uint8Array(dh1.length + dh2.length + dh3.length + kyberShared.length);
  combined.set(dh1, 0);
  combined.set(dh2, dh1.length);
  combined.set(dh3, dh1.length + dh2.length);
  combined.set(kyberShared, dh1.length + dh2.length + dh3.length);

  // Final key: HKDF-SHA512(combined) → 32 bytes
  const sharedSecret = hkdf(sha512, combined, undefined, 'Whispr-pqxdh-v1', 32);

  // Shred intermediate secrets (PATCH 07)
  shred(dh1);
  shred(dh2);
  shred(dh3);
  shred(kyberShared);
  shred(combined);

  return { sharedSecret };
}
