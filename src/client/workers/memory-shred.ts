/** Whispr — Memory Shredding 
 * Explicitly overwrites sensitive memory to prevent extraction from memory dumps.
 */

/**
 * Shreds the contents of a TypedArray to zeros and random bytes.
 * Double wiping technique prevents simple memory recovery.
 * @param array - The array to securely wipe
 */
export function shred(array: Uint8Array | Float64Array | null | undefined): void {
  if (!array) return;
  // Pass 1: Zero out array
  array.fill(0);
  // Pass 2: Cryptographic trash
  crypto.getRandomValues(array as any);
  // Pass 3: Zero out again
  array.fill(0);
}
