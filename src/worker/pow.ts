/** Whipsr — Proof-of-Work Challenge System
 * PATCH 06: Anti-botnet admission control.
 * Protects registration, WebSocket connections, and conversation creation.
 * SHA-256 based PoW with configurable difficulty.
 */
import { Hono } from 'hono';
import { POW_DIFFICULTY, POW_CHALLENGE_TTL } from './config/limits';

interface Env {
  KV: KVNamespace;
}

export const powRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/pow/challenge
 * Returns a PoW challenge seed + difficulty.
 * Seed is single-use, stored in KV with TTL.
 */
powRoutes.get('/challenge', async (c) => {
  const seedBytes = new Uint8Array(32);
  crypto.getRandomValues(seedBytes);
  const seed = bytesToHex(seedBytes);
  const seedId = crypto.randomUUID();

  // Store seed in KV with TTL — single-use
  await c.env.KV.put(`pow:${seedId}`, seed, { expirationTtl: POW_CHALLENGE_TTL });

  return c.json({
    seed_id: seedId,
    seed,
    difficulty: POW_DIFFICULTY,
    expires_in: POW_CHALLENGE_TTL,
  });
});

/**
 * Verify a PoW solution.
 * Returns true if SHA-256(nonce + seed) starts with required leading zeros.
 * Consumes the seed (single-use).
 */
export async function verifyPoW(
  kv: KVNamespace,
  seedId: string,
  nonce: string
): Promise<{ valid: boolean; reason?: string }> {
  // Retrieve and consume seed
  const seed = await kv.get(`pow:${seedId}`);
  if (!seed) {
    return { valid: false, reason: 'Challenge expired or already used' };
  }

  // Delete immediately — single-use
  await kv.delete(`pow:${seedId}`);

  // Verify: SHA-256(nonce + seed) must start with N leading zeros
  const data = new TextEncoder().encode(nonce + seed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = bytesToHex(new Uint8Array(hashBuffer));

  const requiredPrefix = '0'.repeat(POW_DIFFICULTY);
  if (!hashHex.startsWith(requiredPrefix)) {
    return { valid: false, reason: 'Invalid PoW solution' };
  }

  return { valid: true };
}

/** Convert bytes to hex string */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
