/** Whispr — Signal Double Ratchet (Fallback)
 * 
 * THIS IS CLASSICAL DOUBLE RATCHET FALLBACK ONLY
 * A robust classical approach for v0.1-alpha.
 * 
 * Implements standard classical Double Ratchet (X25519) 
 * as the minimum viable E2EE for this v0.1-alpha prototype.
 */
import { x25519 } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha512 } from '@noble/hashes/sha512';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { shred } from '../../worker/memory-shred';

export interface DoubleRatchetState {
  rootKey: Uint8Array;          // 32 bytes
  chainKeySend: Uint8Array;      // 32 bytes
  chainKeyRecv: Uint8Array;      // 32 bytes
  dhSendPriv: Uint8Array;        // X25519 private
  dhSendPub: Uint8Array;         // X25519 public
  dhRecvPub: Uint8Array | null;  // X25519 public of peer
  sendCount: number;
  recvCount: number;
}

export function initializeDoubleRatchet(
  sharedSecret: Uint8Array,
  isInitiator: boolean
): DoubleRatchetState {
  const rootKey = hkdf(sha512, sharedSecret, undefined, 'Whispr-dr-v1', 32);
  const dhPriv = crypto.getRandomValues(new Uint8Array(32));
  const dhPub = x25519.getPublicKey(dhPriv);
  const chainKeys = hkdf(sha512, rootKey, undefined, 'Whispr-dr-chains-v1', 64);

  return {
    rootKey,
    chainKeySend: isInitiator ? chainKeys.slice(0, 32) : chainKeys.slice(32, 64),
    chainKeyRecv: isInitiator ? chainKeys.slice(32, 64) : chainKeys.slice(0, 32),
    dhSendPriv: dhPriv,
    dhSendPub: dhPub,
    dhRecvPub: null,
    sendCount: 0,
    recvCount: 0,
  };
}

export function advanceChainKey(chainKey: Uint8Array): { messageKey: Uint8Array; newChainKey: Uint8Array } {
  const messageKey = hmac(sha256, chainKey, new Uint8Array([0x01]));
  const newChainKey = hmac(sha256, chainKey, new Uint8Array([0x02]));
  return { messageKey, newChainKey };
}
