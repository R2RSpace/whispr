/** Whipsr — PoW Web Worker
 * PATCH 06: Solves Proof-of-Work challenges in background.
 * SHA-256 nonce search — finds value where hash starts with N zeros.
 * Runs in Web Worker to avoid blocking UI (~3-5 seconds on average).
 */

export interface PoWWorkerMessage {
  type: 'solve';
  id: string;
  payload: {
    seed: string;
    difficulty: number;
  };
}

self.onmessage = async (event: MessageEvent<PoWWorkerMessage>) => {
  const { type, id, payload } = event.data;

  if (type !== 'solve') {
    self.postMessage({ type: 'error', id, payload: 'Unknown type' });
    return;
  }

  const { seed, difficulty } = payload;
  const requiredPrefix = '0'.repeat(difficulty);
  const encoder = new TextEncoder();

  let nonce = 0;
  const startTime = performance.now();

  // Progress reporting
  const reportInterval = 100000;

  while (true) {
    const attempt = nonce.toString(16);
    const data = encoder.encode(attempt + seed);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (hashHex.startsWith(requiredPrefix)) {
      const elapsed = performance.now() - startTime;
      self.postMessage({
        type: 'result',
        id,
        payload: {
          nonce: attempt,
          hash: hashHex,
          attempts: nonce + 1,
          elapsed_ms: Math.round(elapsed),
        },
      });
      return;
    }

    nonce++;

    // Report progress periodically
    if (nonce % reportInterval === 0) {
      const elapsed = performance.now() - startTime;
      self.postMessage({
        type: 'progress',
        id,
        payload: {
          attempts: nonce,
          elapsed_ms: Math.round(elapsed),
          rate: Math.round(nonce / (elapsed / 1000)),
        },
      });
    }
  }
};
