/** Whipsr — Key Derivation
 * Argon2id → master_key derivation with OPRF augmentation (PATCH 09).
 * PATCH 07: Non-extractable CryptoKey import + memory shredding.
 * PATCH 16: Entropy Fusion for key generation.
 * All operations run inside crypto.worker.ts (Web Worker quarantine).
 * 
 * Implements key derivation per Signal spec + OPRF hardening.
 */
import { argon2id } from '@noble/hashes/argon2';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { blake2b } from '@noble/hashes/blake2b';

/**
 * PATCH 07: Memory shredding for sensitive key material.
 * Overwrites array contents with random data, then zeros.
 * MUST be called immediately after a key is no longer needed.
 */
export function shred(arr: Uint8Array): void {
  crypto.getRandomValues(arr); // Overwrite with random
  arr.fill(0);                 // Then zero-out
}

/**
 * PATCH 16: Entropy Fusion for key generation.
 * Combines multiple entropy sources for maximum unpredictability.
 * Never relies solely on crypto.getRandomValues().
 */
export async function collectEntropy(humanEntropy?: Uint8Array): Promise<Uint8Array> {
  const sources: Uint8Array[] = [];

  // Source 1: Browser CSPRNG
  sources.push(crypto.getRandomValues(new Uint8Array(32)));

  // Source 2: Human entropy (mouse/touch timing jitter)
  if (humanEntropy && humanEntropy.length > 0) {
    sources.push(humanEntropy);
  } else {
    // Fallback: additional CSPRNG bytes
    sources.push(crypto.getRandomValues(new Uint8Array(32)));
  }

  // Source 3: performance.now() timing jitter
  const timings = new Float64Array(100);
  for (let i = 0; i < 100; i++) {
    timings[i] = performance.now();
    // Introduce tiny computation to create jitter
    for (let j = 0; j < 100; j++) { Math.random(); }
  }
  sources.push(blake2b(new Uint8Array(timings.buffer), { dkLen: 32 }));

  // Source 4: Date-based seed (weak but adds a bit)
  const dateSeed = new TextEncoder().encode(
    Date.now().toString() + Math.random().toString()
  );
  sources.push(blake2b(dateSeed, { dkLen: 32 }));

  // Fuse all sources with BLAKE2b
  const combined = new Uint8Array(sources.reduce((acc, s) => acc + s.length, 0));
  let offset = 0;
  for (const source of sources) {
    combined.set(source, offset);
    offset += source.length;
  }

  const fused = blake2b(combined, { dkLen: 32 });

  // Shred intermediate values
  shred(combined);
  for (const source of sources) {
    if (source.length > 0) shred(source);
  }

  return fused;
}

/**
 * Derive master_key from password using Argon2id.
 * Parameters: m=65536 (64MB), t=3, p=4 — per spec.
 * 
 * PATCH 09: If OPRF output is available, it replaces the raw password
 * in the Argon2id input, making offline brute-force impossible without
 * the server's OPRF_SECRET_KEY.
 * 
 * @param password - User's plaintext password
 * @param salt - Server-provided argon2_salt
 * @param oprfOutput - Optional OPRF output (PATCH 09)
 * @returns master_key as Uint8Array (32 bytes)
 */
export function deriveMasterKey(
  password: string,
  salt: string,
  oprfOutput?: Uint8Array
): Uint8Array {
  const encoder = new TextEncoder();

  // If OPRF output is available (PATCH 09), use it instead of raw password
  const input = oprfOutput || encoder.encode(password);
  const saltBytes = encoder.encode(salt);

  // Argon2id: m=65536 (64MB), t=3 iterations, p=4 parallelism
  const masterKey = argon2id(input, saltBytes, {
    t: 3,      // time cost
    m: 65536,  // memory cost (KB)
    p: 4,      // parallelism
    dkLen: 32, // 256-bit output
  });

  return masterKey;
}

/**
 * Derive authentication hash from password (sent to server).
 * This is SEPARATE from master_key — server never sees master_key.
 * 
 * auth_hash = Argon2id(password, salt + "auth", {m:65536, t:3, p:4})
 * Server stores: PBKDF2(auth_hash) — two layers of hashing.
 */
export function deriveAuthHash(password: string, salt: string): Uint8Array {
  const encoder = new TextEncoder();
  const authSalt = encoder.encode(salt + ':auth');

  return argon2id(encoder.encode(password), authSalt, {
    t: 3,
    m: 65536,
    p: 4,
    dkLen: 32,
  });
}

/**
 * Derive identity keypair from master_key using HKDF.
 * The Ed25519 seed is derived deterministically from master_key.
 * Same password + salt → same identity on any device.
 */
export function deriveIdentitySeed(masterKey: Uint8Array): Uint8Array {
  return hkdf(sha512, masterKey, undefined, 'whipsr-identity-v1', 32);
}

/**
 * PATCH 07: Import raw key bytes as non-extractable CryptoKey.
 * After import, the raw bytes are shredded immediately.
 * The CryptoKey can only be used for HKDF — cannot be exported.
 */
export async function importAsNonExtractable(
  rawKey: Uint8Array
): Promise<CryptoKey> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'HKDF' },
    false, // extractable: FALSE — MANDATORY (PATCH 07)
    ['deriveKey', 'deriveBits']
  );

  // Immediately shred raw bytes
  shred(rawKey);

  return cryptoKey;
}

/**
 * Derive encryption key for key_bundle storage.
 * key_bundle is encrypted with this before upload to server.
 */
export function deriveKeyBundleKey(masterKey: Uint8Array): Uint8Array {
  return hkdf(sha512, masterKey, undefined, 'whipsr-keybundle-v1', 32);
}

/**
 * Helper: convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Helper: convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
