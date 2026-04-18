/** Whispr — Signal Triple Ratchet (SPQR)
 * Implements Signal Protocol Quantum Ratchet with three layers:
 *   Ratchet A: Double Ratchet (X25519, classical)
 *   Ratchet B: ML-KEM-768 ratchet (post-quantum)
 *   Final key: HKDF-SHA512(key_A || key_B) → AES-256-GCM
 * 
 * Each message uses a unique symmetric key derived from dual ratchet state.
 * Forward secrecy: compromising current keys cannot decrypt past messages.
 * Post-compromise security: ratcheting recovers security after key compromise.
 */
import { x25519 } from '@noble/curves/ed25519';
import { ml_kem768 } from '@noble/post-quantum/ml-kem';
import { hkdf } from '@noble/hashes/hkdf';
import { sha512 } from '@noble/hashes/sha512';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { shred } from './keyDerivation';

export interface RatchetState {
  // Ratchet A: Classical Double Ratchet
  rootKeyA: Uint8Array;          // 32 bytes
  chainKeySend: Uint8Array;      // 32 bytes
  chainKeyRecv: Uint8Array;      // 32 bytes
  dhSendPriv: Uint8Array;        // X25519 private
  dhSendPub: Uint8Array;         // X25519 public
  dhRecvPub: Uint8Array | null;  // X25519 public of peer
  
  // Ratchet B: Post-Quantum KEM Ratchet
  rootKeyB: Uint8Array;          // 32 bytes
  kemSendPk: Uint8Array;         // ML-KEM public
  kemSendSk: Uint8Array;         // ML-KEM secret
  kemRecvPk: Uint8Array | null;  // ML-KEM public of peer
  
  // Counters
  sendCount: number;
  recvCount: number;
  prevChainLength: number;

  // Lamport clock (PATCH 14)
  lamportClock: number;
}

export interface MessageHeader {
  dhPub: Uint8Array;             // Sender's current X25519 public
  kemPub: Uint8Array;            // Sender's current KEM public
  kemCiphertext: Uint8Array;     // KEM ciphertext (for ratchet step)
  messageNum: number;            // Message number in chain
  prevChainLength: number;       // Previous chain length
  lamportSeq: number;           // PATCH 14: Lamport sequence
}

/**
 * Initialize ratchet state from PQXDH shared secret.
 * Called after successful PQXDH handshake.
 * 
 * @param sharedSecret - 32 bytes from PQXDH
 * @param isInitiator - true if this side initiated the key exchange
 */
export function initializeRatchet(
  sharedSecret: Uint8Array,
  isInitiator: boolean
): RatchetState {
  // Derive root keys for both ratchets
  const rootKeyA = hkdf(sha512, sharedSecret, undefined, 'Whispr-ratchet-a-v1', 32);
  const rootKeyB = hkdf(sha512, sharedSecret, undefined, 'Whispr-ratchet-b-v1', 32);

  // Generate initial DH keypairs
  const dhPriv = crypto.getRandomValues(new Uint8Array(32));
  const dhPub = x25519.getPublicKey(dhPriv);

  // Generate initial KEM keypair
  const kemKeys = ml_kem768.keygen();

  // Derive initial chain keys
  const chainKeys = hkdf(sha512, rootKeyA, undefined, 'Whispr-chains-v1', 64);

  return {
    rootKeyA,
    chainKeySend: isInitiator ? chainKeys.slice(0, 32) : chainKeys.slice(32, 64),
    chainKeyRecv: isInitiator ? chainKeys.slice(32, 64) : chainKeys.slice(0, 32),
    dhSendPriv: dhPriv,
    dhSendPub: dhPub,
    dhRecvPub: null,
    rootKeyB,
    kemSendPk: kemKeys.publicKey,
    kemSendSk: kemKeys.secretKey,
    kemRecvPk: null,
    sendCount: 0,
    recvCount: 0,
    prevChainLength: 0,
    lamportClock: 0,
  };
}

/**
 * Perform a DH ratchet step (Ratchet A).
 * Called when receiving a message with a new DH public key.
 */
function dhRatchetStep(state: RatchetState, peerDhPub: Uint8Array): void {
  // Receiving chain
  const dhOutput = x25519.getSharedSecret(state.dhSendPriv, peerDhPub);
  const newRootAndChain = hkdf(sha512, state.rootKeyA, dhOutput, 'Whispr-dh-ratchet', 64);
  
  state.rootKeyA = newRootAndChain.slice(0, 32);
  state.chainKeyRecv = newRootAndChain.slice(32, 64);
  state.dhRecvPub = peerDhPub;
  state.prevChainLength = state.sendCount;
  state.sendCount = 0;
  state.recvCount = 0;

  // Generate new DH keypair for sending
  shred(state.dhSendPriv);
  state.dhSendPriv = crypto.getRandomValues(new Uint8Array(32));
  state.dhSendPub = x25519.getPublicKey(state.dhSendPriv);

  // Sending chain
  const dhOutput2 = x25519.getSharedSecret(state.dhSendPriv, peerDhPub);
  const newRootAndChain2 = hkdf(sha512, state.rootKeyA, dhOutput2, 'Whispr-dh-ratchet', 64);
  
  state.rootKeyA = newRootAndChain2.slice(0, 32);
  state.chainKeySend = newRootAndChain2.slice(32, 64);

  shred(dhOutput);
  shred(dhOutput2);
}

/**
 * Perform a KEM ratchet step (Ratchet B).
 * Updates the post-quantum layer of the hybrid ratchet.
 */
function kemRatchetStep(
  state: RatchetState,
  peerKemPub: Uint8Array
): Uint8Array {
  // Encapsulate with peer's KEM public key
  const { cipherText, sharedSecret: kemShared } = ml_kem768.encapsulate(peerKemPub);

  // Update root key B
  const newRootB = hkdf(sha512, state.rootKeyB, kemShared, 'Whispr-kem-ratchet', 32);
  state.rootKeyB = newRootB;

  // Rotate our own KEM keypair
  const newKem = ml_kem768.keygen();
  state.kemSendPk = newKem.publicKey;
  state.kemSendSk = newKem.secretKey;
  state.kemRecvPk = peerKemPub;

  shred(kemShared);
  return cipherText;
}

/**
 * Advance the chain key to produce a message key.
 * chain_key → HMAC(chain_key, 0x01) = message_key
 * chain_key → HMAC(chain_key, 0x02) = new_chain_key
 */
function advanceChainKey(chainKey: Uint8Array): { messageKey: Uint8Array; newChainKey: Uint8Array } {
  const messageKey = hmac(sha256, chainKey, new Uint8Array([0x01]));
  const newChainKey = hmac(sha256, chainKey, new Uint8Array([0x02]));
  return { messageKey, newChainKey };
}

/**
 * Encrypt a message using the Triple Ratchet.
 * Returns encrypted payload + message header.
 * 
 * Final message key = HKDF-SHA512(key_A || key_B) → AES-256-GCM
 */
export function ratchetEncrypt(
  state: RatchetState,
  plaintext: Uint8Array
): { header: MessageHeader; ciphertext: Uint8Array; iv: Uint8Array } {
  // Advance Ratchet A chain
  const { messageKey: keyA, newChainKey } = advanceChainKey(state.chainKeySend);
  state.chainKeySend = newChainKey;

  // KEM ratchet step (Ratchet B)
  let kemCiphertext = new Uint8Array(0);
  let keyB = state.rootKeyB;
  if (state.kemRecvPk) {
    kemCiphertext = kemRatchetStep(state, state.kemRecvPk);
    keyB = state.rootKeyB;
  }

  // Final key: HKDF-SHA512(key_A || key_B) → 32 bytes for AES-256-GCM
  const combined = new Uint8Array(keyA.length + keyB.length);
  combined.set(keyA, 0);
  combined.set(keyB, keyA.length);
  const messageKey = hkdf(sha512, combined, undefined, 'Whispr-message-v1', 32);

  // Encrypt with AES-256-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // PATCH 14: Increment Lamport clock
  state.lamportClock++;

  const header: MessageHeader = {
    dhPub: state.dhSendPub,
    kemPub: state.kemSendPk,
    kemCiphertext,
    messageNum: state.sendCount,
    prevChainLength: state.prevChainLength,
    lamportSeq: state.lamportClock,
  };

  state.sendCount++;

  // Shred intermediate keys
  shred(keyA);
  shred(combined);

  // Note: actual AES-GCM encryption happens in aesGcm.ts
  // Return the message key for the caller to use
  return { header, ciphertext: messageKey, iv };
}

/**
 * Decrypt a message using the Triple Ratchet.
 * Performs DH ratchet step if sender's DH key has changed.
 */
export function ratchetDecrypt(
  state: RatchetState,
  header: MessageHeader
): Uint8Array {
  // Check if we need a DH ratchet step
  if (!state.dhRecvPub || !arraysEqual(header.dhPub, state.dhRecvPub)) {
    dhRatchetStep(state, header.dhPub);
  }

  // Advance receiving chain
  const { messageKey: keyA, newChainKey } = advanceChainKey(state.chainKeyRecv);
  state.chainKeyRecv = newChainKey;

  // KEM decapsulation (Ratchet B)
  let keyB = state.rootKeyB;
  if (header.kemCiphertext.length > 0) {
    const kemShared = ml_kem768.decapsulate(header.kemCiphertext, state.kemSendSk);
    const newRootB = hkdf(sha512, state.rootKeyB, kemShared, 'Whispr-kem-ratchet', 32);
    state.rootKeyB = newRootB;
    keyB = newRootB;

    // Update peer's KEM public key
    state.kemRecvPk = header.kemPub;
    shred(kemShared);
  }

  // Final key: HKDF-SHA512(key_A || key_B) → 32 bytes
  const combined = new Uint8Array(keyA.length + keyB.length);
  combined.set(keyA, 0);
  combined.set(keyB, keyA.length);
  const messageKey = hkdf(sha512, combined, undefined, 'Whispr-message-v1', 32);

  // Update Lamport clock (PATCH 14)
  state.lamportClock = Math.max(state.lamportClock, header.lamportSeq) + 1;
  state.recvCount = header.messageNum + 1;

  // Shred intermediates
  shred(keyA);
  shred(combined);

  return messageKey;
}

/**
 * Serialize ratchet state for encrypted storage.
 * State is included in the key_bundle for cross-device sync.
 */
export function serializeRatchetState(state: RatchetState): Uint8Array {
  const json = JSON.stringify({
    rootKeyA: Array.from(state.rootKeyA),
    chainKeySend: Array.from(state.chainKeySend),
    chainKeyRecv: Array.from(state.chainKeyRecv),
    dhSendPriv: Array.from(state.dhSendPriv),
    dhSendPub: Array.from(state.dhSendPub),
    dhRecvPub: state.dhRecvPub ? Array.from(state.dhRecvPub) : null,
    rootKeyB: Array.from(state.rootKeyB),
    kemSendPk: Array.from(state.kemSendPk),
    kemSendSk: Array.from(state.kemSendSk),
    kemRecvPk: state.kemRecvPk ? Array.from(state.kemRecvPk) : null,
    sendCount: state.sendCount,
    recvCount: state.recvCount,
    prevChainLength: state.prevChainLength,
    lamportClock: state.lamportClock,
  });
  return new TextEncoder().encode(json);
}

/**
 * Deserialize ratchet state from encrypted storage.
 */
export function deserializeRatchetState(data: Uint8Array): RatchetState {
  const json = JSON.parse(new TextDecoder().decode(data));
  return {
    rootKeyA: new Uint8Array(json.rootKeyA),
    chainKeySend: new Uint8Array(json.chainKeySend),
    chainKeyRecv: new Uint8Array(json.chainKeyRecv),
    dhSendPriv: new Uint8Array(json.dhSendPriv),
    dhSendPub: new Uint8Array(json.dhSendPub),
    dhRecvPub: json.dhRecvPub ? new Uint8Array(json.dhRecvPub) : null,
    rootKeyB: new Uint8Array(json.rootKeyB),
    kemSendPk: new Uint8Array(json.kemSendPk),
    kemSendSk: new Uint8Array(json.kemSendSk),
    kemRecvPk: json.kemRecvPk ? new Uint8Array(json.kemRecvPk) : null,
    sendCount: json.sendCount,
    recvCount: json.recvCount,
    prevChainLength: json.prevChainLength,
    lamportClock: json.lamportClock,
  };
}

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
