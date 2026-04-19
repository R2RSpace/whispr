/** Whispr — AES-256-GCM Encrypt/Decrypt
 * Symmetric encryption for message payloads.
 * 96-bit random nonce per message (never reused).
 * Used as the final layer in the Double Ratchet output.
 */

/**
 * Encrypt plaintext with AES-256-GCM.
 * @param key - 256-bit key as Uint8Array
 * @param plaintext - string or Uint8Array to encrypt
 * @returns { ciphertext: Uint8Array, iv: Uint8Array }
 */
export async function aesGcmEncrypt(
  key: Uint8Array,
  plaintext: string | Uint8Array
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit nonce
  const data = typeof plaintext === 'string'
    ? new TextEncoder().encode(plaintext)
    : plaintext;

  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'AES-GCM' }, false, ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, cryptoKey, data
  );

  return { ciphertext: new Uint8Array(encrypted), iv };
}

/**
 * Decrypt ciphertext with AES-256-GCM.
 * @param key - 256-bit key as Uint8Array
 * @param ciphertext - encrypted data
 * @param iv - 96-bit nonce used during encryption
 * @returns decrypted Uint8Array
 */
export async function aesGcmDecrypt(
  key: Uint8Array,
  ciphertext: Uint8Array,
  iv: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'AES-GCM' }, false, ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, cryptoKey, ciphertext
  );

  return new Uint8Array(decrypted);
}

/**
 * Encrypt a string and return base64-encoded result.
 * Convenience wrapper for message encryption.
 */
export async function encryptMessage(
  key: Uint8Array,
  message: string
): Promise<{ payload: string; iv: string }> {
  const { ciphertext, iv } = await aesGcmEncrypt(key, message);
  return {
    payload: uint8ToBase64(ciphertext),
    iv: uint8ToBase64(iv),
  };
}

/**
 * Decrypt a base64-encoded message.
 * Convenience wrapper for message decryption.
 */
export async function decryptMessage(
  key: Uint8Array,
  payload: string,
  iv: string
): Promise<string> {
  const ciphertext = base64ToUint8(payload);
  const ivBytes = base64ToUint8(iv);
  const decrypted = await aesGcmDecrypt(key, ciphertext, ivBytes);
  return new TextDecoder().decode(decrypted);
}

// --- Utility functions ---

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
