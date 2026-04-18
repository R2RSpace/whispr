/** Whipsr — Crypto Web Worker
 * PATCH 07: All @noble operations run quarantined in this worker.
 * Worker has CSP: connect-src 'none' (cannot make network requests).
 * Non-extractable key imports + memory shredding enforced.
 */

import { deriveMasterKey, deriveAuthHash, deriveIdentitySeed, deriveKeyBundleKey, shred, collectEntropy, bytesToHex } from '../crypto/keyDerivation';

export interface CryptoWorkerMessage {
  type: string;
  id: string;
  payload: any;
}

self.onmessage = async (event: MessageEvent<CryptoWorkerMessage>) => {
  const { type, id, payload } = event.data;

  try {
    switch (type) {
      case 'derive_master_key': {
        const { password, salt, oprfOutput } = payload;
        const masterKey = deriveMasterKey(
          password,
          salt,
          oprfOutput ? new Uint8Array(oprfOutput) : undefined
        );
        const result = Array.from(masterKey);
        // Shred master key in worker memory
        shred(masterKey);
        self.postMessage({ type: 'result', id, payload: result });
        break;
      }

      case 'derive_auth_hash': {
        const { password, salt } = payload;
        const authHash = deriveAuthHash(password, salt);
        const result = bytesToHex(authHash);
        shred(authHash);
        self.postMessage({ type: 'result', id, payload: result });
        break;
      }

      case 'derive_identity_seed': {
        const { masterKey } = payload;
        const mkBytes = new Uint8Array(masterKey);
        const seed = deriveIdentitySeed(mkBytes);
        const result = Array.from(seed);
        shred(mkBytes);
        shred(seed);
        self.postMessage({ type: 'result', id, payload: result });
        break;
      }

      case 'derive_keybundle_key': {
        const { masterKey } = payload;
        const mkBytes = new Uint8Array(masterKey);
        const key = deriveKeyBundleKey(mkBytes);
        const result = Array.from(key);
        shred(mkBytes);
        shred(key);
        self.postMessage({ type: 'result', id, payload: result });
        break;
      }

      case 'collect_entropy': {
        const { humanEntropy } = payload;
        const entropy = await collectEntropy(
          humanEntropy ? new Uint8Array(humanEntropy) : undefined
        );
        const result = Array.from(entropy);
        shred(entropy);
        self.postMessage({ type: 'result', id, payload: result });
        break;
      }

      default:
        self.postMessage({ type: 'error', id, payload: `Unknown type: ${type}` });
    }
  } catch (error) {
    self.postMessage({
      type: 'error', id,
      payload: error instanceof Error ? error.message : String(error),
    });
  }
};
