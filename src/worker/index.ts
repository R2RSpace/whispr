/** Whipsr — Main Worker Entry Point
 * Hono-based Cloudflare Worker with all route registrations.
 * Exports Durable Object classes.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { securityHeaders } from './security-headers';
import { blindServerMiddleware } from './blind-server';
import { authRoutes } from './auth';
import { credentialRoutes } from './credential-rotation';
import { messageRoutes } from './messages';
import { constitutionRoutes } from './constitution-api';
import { mediaRoutes } from './media';
import { powRoutes } from './pow';
import { handleStorageCleanup } from './storage/cleanup';

// Re-export Durable Objects
export { ConversationRoom } from './websocket';
export { QuotaLedger } from './storage/quota';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  CONVERSATION_ROOM: DurableObjectNamespace;
  QUOTA_LEDGER: DurableObjectNamespace;
  OPRF_SECRET_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

// --- Global Middleware ---

// CORS for development
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Security headers (A+ rating)
app.use('/api/*', securityHeaders);

// Blind server middleware (prevents plaintext leakage)
app.use('/api/mailbox/*', blindServerMiddleware);

// Auth middleware — extract userId from session token
app.use('/api/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const userId = await c.env.KV.get(`session:${token}`);
    if (userId) {
      c.set('userId', userId);
      // Update last_seen
      await c.env.DB.prepare(
        'UPDATE sessions SET last_seen = ? WHERE id = ?'
      ).bind(Date.now(), token).run().catch(() => {});
    }
  }
  await next();
});

// --- Route Registration ---

// Auth routes
app.route('/api/auth', authRoutes);

// PoW challenges
app.route('/api/pow', powRoutes);

// Credential rotation
app.route('/api/auth', credentialRoutes);
app.route('/api/keys', credentialRoutes);

// Messages (mailbox-based, PATCH 08)
app.route('/api/mailbox', messageRoutes);
app.route('/api/messages', messageRoutes);

// Constitution
app.route('/api/constitution', constitutionRoutes);

// Media
app.route('/api/media', mediaRoutes);

// Key management routes
app.get('/api/keys/:username', async (c) => {
  const username = c.req.param('username');
  const requesterId = c.get('userId');

  // Rate limit prekey fetches (PATCH 10)
  if (requesterId) {
    const rateKey = `prekey_fetch:${requesterId}`;
    const count = parseInt(await c.env.KV.get(rateKey) || '0');
    if (count >= 10) {
      return c.json({ error: 'Rate limited' }, 429);
    }
    await c.env.KV.put(rateKey, String(count + 1), { expirationTtl: 3600 });
  }

  const user = await c.env.DB.prepare(
    'SELECT id FROM users WHERE username = ?'
  ).bind(username).first<{ id: string }>();

  if (!user) return c.json({ error: 'User not found' }, 404);

  // Fetch available prekey
  const prekey = await c.env.DB.prepare(
    `SELECT * FROM prekeys WHERE user_id = ? AND used = 0 
     ORDER BY is_last_resort ASC, created_at ASC LIMIT 1`
  ).bind(user.id).first();

  if (!prekey) return c.json({ error: 'No prekeys available' }, 404);

  // Mark non-last-resort prekeys as used
  const pk = prekey as any;
  if (!pk.is_last_resort) {
    await c.env.DB.prepare(
      'UPDATE prekeys SET used = 1 WHERE id = ?'
    ).bind(pk.id).run();
  }

  // Fetch key log for this user (PATCH 04)
  const keyLog = await c.env.DB.prepare(
    'SELECT * FROM key_log WHERE user_uuid = ? ORDER BY entry_id DESC LIMIT 1'
  ).bind(user.id).all();

  return c.json({
    user_id: user.id,
    prekey: {
      id: pk.id,
      key_type: pk.key_type,
      public_key: pk.public_key,
      signature: pk.signature,
      is_last_resort: pk.is_last_resort,
    },
    key_log: keyLog.results || [],
  });
});

// Upload prekeys
app.post('/api/keys/upload', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const { prekeys } = body;

  if (!Array.isArray(prekeys) || prekeys.length === 0) {
    return c.json({ error: 'No prekeys provided' }, 400);
  }

  const stmt = c.env.DB.prepare(
    `INSERT INTO prekeys (id, user_id, key_type, public_key, signature, is_last_resort, used, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
  );

  const batch = prekeys.map((pk: any) =>
    stmt.bind(
      pk.id || crypto.randomUUID(),
      userId,
      pk.key_type,
      pk.public_key,
      pk.signature || null,
      pk.is_last_resort ? 1 : 0,
      Date.now()
    )
  );

  await c.env.DB.batch(batch);
  return c.json({ success: true, count: prekeys.length });
});

// Key log endpoint (PATCH 04)
app.get('/api/keys/log/:uuid', async (c) => {
  const uuid = c.req.param('uuid');
  const since = parseInt(c.req.query('since') || '0');

  const entries = await c.env.DB.prepare(
    'SELECT * FROM key_log WHERE user_uuid = ? AND entry_id > ? ORDER BY entry_id ASC'
  ).bind(uuid, since).all();

  return c.json({ entries: entries.results || [] });
});

// WebSocket upgrade route
app.get('/api/ws/:mailbox_id', async (c) => {
  const mailboxId = c.req.param('mailbox_id');
  const doId = c.env.CONVERSATION_ROOM.idFromName(mailboxId);
  const doStub = c.env.CONVERSATION_ROOM.get(doId);
  return doStub.fetch(c.req.raw);
});

// Storage usage
app.get('/api/storage/usage', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const usage = await c.env.DB.prepare(
    'SELECT * FROM storage_usage WHERE user_id = ?'
  ).bind(userId).first();

  const user = await c.env.DB.prepare(
    'SELECT r2_quota_mb, d1_quota_mb FROM users WHERE id = ?'
  ).bind(userId).first();

  return c.json({
    usage: usage || { r2_bytes: 0, d1_bytes: 0 },
    quotas: user || { r2_quota_mb: 50, d1_quota_mb: 10 },
  });
});

// Sessions management
app.get('/api/sessions', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const sessions = await c.env.DB.prepare(
    'SELECT id, device_pubkey, created_at, last_seen FROM sessions WHERE user_id = ?'
  ).bind(userId).all();

  return c.json({ sessions: sessions.results || [] });
});

app.delete('/api/sessions/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const sessionId = c.req.param('id');
  await c.env.KV.delete(`session:${sessionId}`);
  await c.env.DB.prepare(
    'DELETE FROM sessions WHERE id = ? AND user_id = ?'
  ).bind(sessionId, userId).run();

  return c.json({ success: true });
});

app.delete('/api/sessions', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const sessions = await c.env.DB.prepare(
    'SELECT id FROM sessions WHERE user_id = ?'
  ).bind(userId).all();

  for (const s of (sessions.results || [])) {
    await c.env.KV.delete(`session:${(s as any).id}`);
  }
  await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();

  return c.json({ success: true });
});

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', service: 'whipsr' }));

// Static file serving (SPA fallback)
app.get('*', async (c) => {
  // In production, this would serve from R2/static assets
  // For dev, Vite handles this
  return c.html('<!DOCTYPE html><html><head><title>Whipsr</title></head><body><div id="root"></div></body></html>');
});

// --- Cron Trigger ---
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env) {
    await handleStorageCleanup(env);
  },
};
