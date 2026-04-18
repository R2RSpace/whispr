/** Whispr — Media Encryption
 * PATCH 03: Convergent encryption for deduplication
 * PATCH 11: Tiered padding to eliminate size fingerprinting
 * PATCH 19: Ephemeral key wrapping for true deletion
 */
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { aesGcmEncrypt, aesGcmDecrypt, uint8ToBase64 } from './aesGcm';
import { MEDIA_TIER_SIZES } from '../../worker/config/limits';

export interface EncryptedMedia {
  encryptedData: Uint8Array;
  r2Key: string;                    // SHA-256 hash of ciphertext — R2 object name
  mediaKey: Uint8Array;             // convergent media key
  wrappedMediaKey: Uint8Array;      // AES-GCM(ephemeral_wrap_key, media_key)
  wrappedMediaKeyIv: Uint8Array;
  ephemeralWrapKey: Uint8Array;     // stored in KV with TTL
  ephemeralWrapKeyId: string;
  originalSize: number;
  paddedSize: number;
}

/**
 * PATCH 11: Get padded size from tier list.
 * Hides the true file size from the server.
 */
export function getPaddedSize(originalBytes: number): number {
  for (const tier of MEDIA_TIER_SIZES) {
    if (originalBytes <= tier) return tier;
  }
  throw new Error(`File size ${originalBytes} exceeds maximum allowed size`);
}

/**
 * PATCH 03: Derive convergent media key from file contents.
 * Same file → same key → same ciphertext → server can dedup.
 */
function deriveConvergentKey(fileData: Uint8Array): Uint8Array {
  const fileHash = sha256(fileData);
  return hkdf(sha256, fileHash, 'media-convergent', 'Whispr-media-key-v1', 32);
}

/**
 * Encrypt media file for blind server upload.
 * 
 * Steps:
 * 1. Derive convergent media_key from file hash (PATCH 03)
 * 2. Pad to nearest tier size (PATCH 11)
 * 3. Encrypt padded file with AES-256-GCM
 * 4. Wrap media_key with ephemeral key (PATCH 19)
 * 5. R2 object key = SHA-256(ciphertext) for dedup
 */
export async function encryptMedia(fileData: Uint8Array): Promise<EncryptedMedia> {
  // PATCH 03: Convergent key derivation
  const mediaKey = deriveConvergentKey(fileData);

  // PATCH 11: Pad to tier size
  const paddedSize = getPaddedSize(fileData.length);
  const paddedFile = new Uint8Array(paddedSize);
  paddedFile.set(fileData, 0);
  // Fill padding with random data (not zeros — prevents padding-based attacks)
  const padding = crypto.getRandomValues(new Uint8Array(paddedSize - fileData.length));
  paddedFile.set(padding, fileData.length);

  // Add original size as the last 4 bytes (for depadding after decrypt)
  const sizeHeader = new Uint8Array(4);
  new DataView(sizeHeader.buffer).setUint32(0, fileData.length);

  // Prepend size header to padded data
  const withHeader = new Uint8Array(4 + paddedFile.length);
  withHeader.set(sizeHeader, 0);
  withHeader.set(paddedFile, 4);

  // Encrypt with AES-256-GCM
  const { ciphertext: encryptedData, iv: mediaIv } = await aesGcmEncrypt(mediaKey, withHeader);

  // R2 key = SHA-256(ciphertext) for dedup detection
  const ciphertextHash = sha256(encryptedData);
  const r2Key = Array.from(ciphertextHash).map(b => b.toString(16).padStart(2, '0')).join('');

  // PATCH 19: Ephemeral key wrapping
  const ephemeralWrapKey = crypto.getRandomValues(new Uint8Array(32));
  const ephemeralWrapKeyId = crypto.randomUUID();
  const { ciphertext: wrappedMediaKey, iv: wrappedMediaKeyIv } = await aesGcmEncrypt(
    ephemeralWrapKey, mediaKey
  );

  return {
    encryptedData,
    r2Key,
    mediaKey,
    wrappedMediaKey,
    wrappedMediaKeyIv,
    ephemeralWrapKey,
    ephemeralWrapKeyId,
    originalSize: fileData.length,
    paddedSize,
  };
}

/**
 * Decrypt media file.
 * 
 * Steps:
 * 1. Unwrap media_key using ephemeral key
 * 2. Decrypt ciphertext with AES-256-GCM
 * 3. Read original size from header
 * 4. Strip padding
 */
export async function decryptMedia(
  encryptedData: Uint8Array,
  mediaIv: Uint8Array,
  mediaKey: Uint8Array
): Promise<Uint8Array> {
  // Decrypt
  const decrypted = await aesGcmDecrypt(mediaKey, encryptedData, mediaIv);

  // Read original size from first 4 bytes
  const originalSize = new DataView(decrypted.buffer).getUint32(0);

  // Strip header and padding
  return decrypted.slice(4, 4 + originalSize);
}

/**
 * Unwrap media key using ephemeral wrap key (PATCH 19).
 * Called when ephemeral key is retrieved from KV.
 */
export async function unwrapMediaKey(
  wrappedMediaKey: Uint8Array,
  wrappedMediaKeyIv: Uint8Array,
  ephemeralWrapKey: Uint8Array
): Promise<Uint8Array> {
  return aesGcmDecrypt(ephemeralWrapKey, wrappedMediaKey, wrappedMediaKeyIv);
}
