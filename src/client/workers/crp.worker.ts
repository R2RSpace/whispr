/** Whipsr — CRP Web Worker
 * Runs Constitutional Review Pipeline in a non-blocking Web Worker.
 * PATCH 05: Dual enforcement — both sender and receiver side.
 * PATCH 17: NFKC canonicalization included in pipeline.
 */
import { runPipeline, CRPInput, CRPOutput } from '../../worker/crp/pipeline';
import type { ConstitutionalPrinciple } from '../../worker/crp/scorer';

export interface CRPWorkerMessage {
  type: string;
  id: string;
  payload: any;
}

/** In-memory shunned list (PATCH 05) */
const shunnedIdentities = new Set<string>();

/** Cached constitution (hot-reloadable) */
let cachedConstitution: ConstitutionalPrinciple[] | null = null;

self.onmessage = async (event: MessageEvent<CRPWorkerMessage>) => {
  const { type, id, payload } = event.data;

  try {
    switch (type) {
      /** Load/reload constitution */
      case 'load_constitution': {
        cachedConstitution = payload.principles;
        self.postMessage({ type: 'result', id, payload: { loaded: true } });
        break;
      }

      /** Sender-side CRP — before encryption (existing flow) */
      case 'evaluate_send': {
        if (!cachedConstitution) {
          self.postMessage({ type: 'error', id, payload: 'Constitution not loaded' });
          return;
        }

        const input: CRPInput = {
          raw_text: payload.text,
          author_id: payload.author_id,
          channel_id: payload.channel_id || '',
          timestamp: Date.now(),
        };

        const result = runPipeline(input, cachedConstitution);
        self.postMessage({ type: 'result', id, payload: result });
        break;
      }

      /** Receiver-side CRP — after decryption (PATCH 05) */
      case 'evaluate_receive': {
        if (!cachedConstitution) {
          self.postMessage({ type: 'error', id, payload: 'Constitution not loaded' });
          return;
        }

        const { text, sender_crp_flag, sender_identity_pubkey } = payload;

        // Check shunned list first
        if (shunnedIdentities.has(sender_identity_pubkey)) {
          self.postMessage({
            type: 'result', id,
            payload: { action: 'DROP', reason: 'Sender is shunned (cryptographic shunning)' },
          });
          return;
        }

        const input: CRPInput = {
          raw_text: text,
          author_id: sender_identity_pubkey,
          channel_id: '',
          timestamp: Date.now(),
        };

        const localResult = runPipeline(input, cachedConstitution);

        // PATCH 05: Compare sender's CRP flag vs local result
        // If sender says PASS but local says BLOCK → DROP + shun
        if (sender_crp_flag === 'pass' && localResult.action === 'BLOCK') {
          shunnedIdentities.add(sender_identity_pubkey);
          self.postMessage({
            type: 'result', id,
            payload: {
              action: 'DROP',
              reason: 'Sender CRP bypass detected — message dropped, sender shunned',
              local_result: localResult,
            },
          });
          return;
        }

        self.postMessage({ type: 'result', id, payload: localResult });
        break;
      }

      /** Add to shunned list manually */
      case 'shun': {
        shunnedIdentities.add(payload.identity_pubkey);
        self.postMessage({ type: 'result', id, payload: { shunned: true } });
        break;
      }

      /** Remove from shunned list */
      case 'unshun': {
        shunnedIdentities.delete(payload.identity_pubkey);
        self.postMessage({ type: 'result', id, payload: { unshunned: true } });
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
