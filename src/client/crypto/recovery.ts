/** Whipsr — Recovery Phrase (BIP-39 Mnemonic)
 * PATCH 12: Dual mnemonic system — real + duress (plausible deniability).
 * Uses @scure/bip39 for BIP-39 compliant mnemonic generation.
 */
import { generateMnemonic, mnemonicToEntropy, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { aesGcmEncrypt, aesGcmDecrypt } from './aesGcm';
import { shred } from './keyDerivation';

export interface RecoveryPhrases {
  real: string;    // 24-word mnemonic for actual key_bundle
  duress: string;  // 24-word mnemonic for decoy key_bundle (PATCH 12)
}

export interface RecoveryBundle {
  encryptedBundle: Uint8Array;
  iv: Uint8Array;
}

/**
 * Generate recovery phrases — both real and duress (PATCH 12).
 * Display BOTH to user at registration with clear warnings.
 * User must type back 3 random words from the REAL phrase to confirm.
 */
export function generateRecoveryPhrases(): RecoveryPhrases {
  return {
    real: generateMnemonic(wordlist, 256),     // 24 words (256 bits entropy)
    duress: generateMnemonic(wordlist, 256),   // 24 words (different)
  };
}

/**
 * Derive recovery master key from mnemonic entropy.
 * recovery_master_key = HKDF(mnemonic_entropy, 'whipsr-recovery')
 */
export function deriveRecoveryKey(mnemonic: string): Uint8Array {
  if (!validateMnemonic(mnemonic, wordlist)) {
    throw new Error('Invalid recovery phrase');
  }

  const entropy = mnemonicToEntropy(mnemonic, wordlist);
  const entropyBytes = hexToBytes(entropy);
  const recoveryKey = hkdf(sha256, entropyBytes, undefined, 'whipsr-recovery-v1', 32);

  shred(entropyBytes);
  return recoveryKey;
}

/**
 * Encrypt key_bundle with recovery key.
 * Used to create both real and duress recovery bundles.
 */
export async function encryptForRecovery(
  keyBundle: Uint8Array,
  recoveryKey: Uint8Array
): Promise<RecoveryBundle> {
  const { ciphertext, iv } = await aesGcmEncrypt(recoveryKey, keyBundle);
  return { encryptedBundle: ciphertext, iv };
}

/**
 * Decrypt key_bundle using recovery phrase.
 * Works with both real and duress mnemonics — user just enters one.
 * If duress mnemonic: decrypts to decoy data (looks valid cryptographically).
 */
export async function decryptWithRecovery(
  mnemonic: string,
  encryptedBundle: Uint8Array,
  iv: Uint8Array
): Promise<Uint8Array> {
  const recoveryKey = deriveRecoveryKey(mnemonic);
  try {
    const decrypted = await aesGcmDecrypt(recoveryKey, encryptedBundle, iv);
    return decrypted;
  } finally {
    shred(recoveryKey);
  }
}

/**
 * Generate 3 random word positions for confirmation.
 * User must type these 3 words from their recovery phrase.
 */
export function getConfirmationIndices(): number[] {
  const indices = new Set<number>();
  while (indices.size < 3) {
    const idx = Math.floor(Math.random() * 24);
    indices.add(idx);
  }
  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Verify user typed the correct confirmation words.
 */
export function verifyConfirmationWords(
  mnemonic: string,
  indices: number[],
  userWords: string[]
): boolean {
  const words = mnemonic.split(' ');
  for (let i = 0; i < indices.length; i++) {
    if (words[indices[i]]?.toLowerCase() !== userWords[i]?.toLowerCase()) {
      return false;
    }
  }
  return true;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
