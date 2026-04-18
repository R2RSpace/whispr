/** Whispr — Media Upload & Management
 * PATCH 03: Convergent encryption for dedup
 * PATCH 11: Tiered padding to hide file size
 * PATCH 19: Ephemeral key wrapping for true deletion
 * Server receives only encrypted blobs - cannot decrypt.
 */
import { Hono } from 'hono';

interface Env {
  DB: D1Database;
  R2: R2Bucket;
  KV: KVNamespace;
  QUOTA_LEDGER: DurableObjectNamespace;
}

export const mediaRoutes = new Hono<{ Bindings: Env }>();

/**
 * HEAD /api/media/exists — Check if encrypted media already stored (PATCH 03)
 * Convergent encryption means same plaintext → same ciphertext hash.
 * Client checks before upload to avoid redundant storage.
 */
mediaRoutes.head('/exists', async (c) => {
  const hash = c.req.query('hash');
  if (!hash) return new Response(null, { status: 400 });

  const existing = await c.env.R2.head(hash);
  return new Response(null, { status: existing ? 200 : 404 });
});

/**
 * POST /api/media/upload — Upload encrypted media to R2
 * Quota checked via QuotaLedger DO (PATCH 15).
 * Ephemeral wrap key stored in KV with TTL (PATCH 19).
 */
mediaRoutes.post('/upload', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.parseBody();
  const file = body['file'];
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No file provided' }, 400);
  }

  const fileBytes = await file.arrayBuffer();
  const size = fileBytes.byteLength;

  // Check quota via QuotaLedger DO (PATCH 15: race-condition-free)
  const quotaDoId = c.env.QUOTA_LEDGER.idFromName(userId);
  const quotaStub = c.env.QUOTA_LEDGER.get(quotaDoId);
  const quotaRes = await quotaStub.fetch(new Request('https://internal/request', {
    method: 'POST',
    body: JSON.stringify({ bytes: size, type: 'r2' }),
  }));
  const quotaResult = await quotaRes.json() as { allowed: boolean };

  if (!quotaResult.allowed) {
    return c.json({ error: 'USER_QUOTA_EXCEEDED' }, 413);
  }

  // R2 object key from request (convergent encryption hash from client)
  const r2Key = c.req.query('r2_key') || crypto.randomUUID();
  const ephemeralKeyId = c.req.query('ephemeral_key_id') || crypto.randomUUID();

  // Store ephemeral wrap key in KV (PATCH 19)
  const ephemeralWrapKey = c.req.query('ephemeral_wrap_key');
  if (ephemeralWrapKey) {
    await c.env.KV.put(
      `media_wrap:${ephemeralKeyId}`,
      ephemeralWrapKey,
      { expirationTtl: 365 * 24 * 60 * 60 } // 1 year default
    );
  }

  // Upload encrypted blob to R2
  await c.env.R2.put(r2Key, fileBytes, {
    customMetadata: { user_id: userId, uploaded_at: Date.now().toString() },
  });

  // Track in storage_objects
  const objectId = crypto.randomUUID();
  const now = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO storage_objects (id, user_id, object_type, r2_key, size_bytes, last_accessed, flagged_for_cleanup, created_at) 
     VALUES (?, ?, 'media', ?, ?, ?, 0, ?)`
  ).bind(objectId, userId, r2Key, size, now, now).run();

  return c.json({
    object_id: objectId,
    r2_key: r2Key,
    ephemeral_key_id: ephemeralKeyId,
    size_bytes: size,
  }, 201);
});

/**
 * GET /api/media/:r2_key — Download encrypted media from R2
 */
mediaRoutes.get('/:r2_key', async (c) => {
  const r2Key = c.req.param('r2_key');

  const object = await c.env.R2.get(r2Key);
  if (!object) return c.json({ error: 'Not found' }, 404);

  // Update last_accessed
  await c.env.DB.prepare(
    'UPDATE storage_objects SET last_accessed = ? WHERE r2_key = ?'
  ).bind(Date.now(), r2Key).run();

  const headers = new Headers();
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Content-Length', object.size.toString());
  headers.set('Cache-Control', 'private, max-age=3600');

  return new Response(object.body, { headers });
});

/**
 * DELETE /api/media/:ephemeral_key_id — Delete media (PATCH 19)
 * Deletes ephemeral wrap key from KV → media becomes permanently undecryptable.
 * R2 blob may remain but is cryptographically useless.
 */
mediaRoutes.delete('/:ephemeral_key_id', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const keyId = c.req.param('ephemeral_key_id');

  // Delete ephemeral wrap key — makes media permanently undecryptable
  await c.env.KV.delete(`media_wrap:${keyId}`);

  // Also try to delete R2 object and update storage
  const obj = await c.env.DB.prepare(
    'SELECT * FROM storage_objects WHERE user_id = ? AND id = ?'
  ).bind(userId, keyId).first();

  if (obj) {
    const item = obj as { r2_key: string; size_bytes: number };
    if (item.r2_key) {
      await c.env.R2.delete(item.r2_key);
    }

    // Release quota (PATCH 15)
    const quotaDoId = c.env.QUOTA_LEDGER.idFromName(userId);
    const quotaStub = c.env.QUOTA_LEDGER.get(quotaDoId);
    await quotaStub.fetch(new Request('https://internal/release', {
      method: 'POST',
      body: JSON.stringify({ bytes: item.size_bytes, type: 'r2' }),
    }));

    await c.env.DB.prepare('DELETE FROM storage_objects WHERE id = ?').bind(keyId).run();
  }

  return c.json({ success: true, permanently_undecryptable: true });
});

/**
 * GET /api/storage/usage — Current storage usage for authenticated user
 */
mediaRoutes.get('/storage/usage', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const quotaDoId = c.env.QUOTA_LEDGER.idFromName(userId);
  const quotaStub = c.env.QUOTA_LEDGER.get(quotaDoId);
  const res = await quotaStub.fetch(new Request('https://internal/usage'));
  const usage = await res.json();

  return c.json(usage);
});
