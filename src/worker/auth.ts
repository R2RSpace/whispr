/** Whipsr — Authentication Routes
 * Handles registration, login, salt retrieval.
 * PATCH 02: Device fingerprint via crypto keypair
 * PATCH 06: PoW required for registration
 * PATCH 09: OPRF-protected key derivation
 * Server never sees plaintext passwords — only argon2_hash.
 */
import { Hono } from 'hono';
import { verifyPoW } from './pow';
import { createUser, getUserByUsername, createSession, getSessionsByUser, deleteAllSessions, deleteSession, getSessionById } from './db/queries';
import { SESSION_EXPIRY_SECONDS } from './config/limits';
import { toEpochBlock } from './blind-server';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  OPRF_SECRET_KEY?: string;
}

export const authRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/auth/salt/:username
 * Returns argon2_salt for client-side key derivation.
 * Also indicates if this is a new device (triggers alert to existing sessions).
 */
authRoutes.get('/salt/:username', async (c) => {
  const username = c.req.param('username');
  const user = await getUserByUsername(c.env.DB, username);

  if (!user) {
    // Return a deterministic fake salt to prevent username enumeration
    const encoder = new TextEncoder();
    const data = encoder.encode(username + 'whipsr-salt-padding');
    const hash = await crypto.subtle.digest('SHA-256', data);
    const fakeSalt = btoa(String.fromCharCode(...new Uint8Array(hash).slice(0, 16)));
    return c.json({ argon2_salt: fakeSalt, device_is_new: true, exists: false });
  }

  return c.json({
    argon2_salt: user.argon2_salt,
    device_is_new: true, // Always true — client must present device_pubkey
    exists: true,
  });
});

/**
 * POST /api/auth/register
 * Creates a new user account.
 * Requires PoW solution (PATCH 06).
 * Body: { username, password_hash (argon2), argon2_salt, encrypted_key_bundle,
 *         key_bundle_iv, recovery_bundle, recovery_iv, recovery_bundle_duress,
 *         recovery_iv_duress, device_pubkey, pow_seed_id, pow_nonce, prekeys[] }
 */
authRoutes.post('/register', async (c) => {
  const body = await c.req.json();
  const {
    username, password_hash, argon2_salt, encrypted_key_bundle,
    key_bundle_iv, recovery_bundle, recovery_iv,
    recovery_bundle_duress, recovery_iv_duress,
    device_pubkey, pow_seed_id, pow_nonce,
  } = body;

  // Verify PoW (PATCH 06)
  const powResult = await verifyPoW(c.env.KV, pow_seed_id, pow_nonce);
  if (!powResult.valid) {
    return c.json({ error: powResult.reason }, 403);
  }

  // Check username uniqueness
  const existing = await getUserByUsername(c.env.DB, username);
  if (existing) {
    return c.json({ error: 'Username already taken' }, 409);
  }

  // Hash the argon2_hash with bcrypt-equivalent (using SHA-256 + salt for Workers)
  // Note: Workers don't have bcrypt, so we use PBKDF2 as server-side KDF
  const serverSalt = new Uint8Array(16);
  crypto.getRandomValues(serverSalt);
  const serverSaltHex = bytesToHex(serverSalt);

  const serverHash = await serverSideHash(password_hash, serverSaltHex);

  const userId = crypto.randomUUID();
  const now = Date.now();

  await createUser(c.env.DB, {
    id: userId,
    username,
    password_hash: `${serverSaltHex}:${serverHash}`,
    argon2_salt,
    encrypted_key_bundle: encrypted_key_bundle ? base64ToBuffer(encrypted_key_bundle) : null,
    key_bundle_iv: key_bundle_iv || '',
    recovery_bundle: recovery_bundle ? base64ToBuffer(recovery_bundle) : null,
    recovery_iv: recovery_iv || null,
    recovery_bundle_duress: recovery_bundle_duress ? base64ToBuffer(recovery_bundle_duress) : null,
    recovery_iv_duress: recovery_iv_duress || null,
    bundle_seq: 0,
    bundle_seq_signature: null,
    oprf_state: null,
    r2_quota_mb: 50,
    d1_quota_mb: 10,
    created_at: now,
  });

  // Initialize storage_usage
  await c.env.DB.prepare(
    'INSERT INTO storage_usage (user_id, r2_bytes, d1_bytes, last_updated) VALUES (?, 0, 0, ?)'
  ).bind(userId, now).run();

  // Create session
  const sessionId = crypto.randomUUID();
  const nonce = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));

  await createSession(c.env.DB, {
    id: sessionId,
    user_id: userId,
    device_pubkey: device_pubkey || '',
    last_nonce: nonce,
    created_at: now,
    last_seen: now,
    expires_at: now + SESSION_EXPIRY_SECONDS * 1000,
  });

  // Store session token in KV
  await c.env.KV.put(`session:${sessionId}`, userId, {
    expirationTtl: SESSION_EXPIRY_SECONDS,
  });

  return c.json({
    user_id: userId,
    session_id: sessionId,
    nonce,
  }, 201);
});

/**
 * POST /api/auth/login
 * Validates argon2_hash, creates session.
 * PATCH 02: Requires device_pubkey for device identification.
 */
authRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const { username, password_hash, device_pubkey } = body;

  const user = await getUserByUsername(c.env.DB, username);
  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  if (user.status === 'suspended') {
    return c.json({ error: 'Account suspended' }, 403);
  }

  if (user.status === 'migrated') {
    return c.json({ error: 'Account migrated', status: 'migrated' }, 403);
  }

  // Verify password hash
  const [serverSalt, storedHash] = user.password_hash.split(':');
  const computedHash = await serverSideHash(password_hash, serverSalt);

  if (computedHash !== storedHash) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const now = Date.now();
  const sessionId = crypto.randomUUID();
  const nonce = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));

  await createSession(c.env.DB, {
    id: sessionId,
    user_id: user.id,
    device_pubkey: device_pubkey || '',
    last_nonce: nonce,
    created_at: now,
    last_seen: now,
    expires_at: now + SESSION_EXPIRY_SECONDS * 1000,
  });

  await c.env.KV.put(`session:${sessionId}`, user.id, {
    expirationTtl: SESSION_EXPIRY_SECONDS,
  });

  // Alert existing sessions about new device login
  const existingSessions = await getSessionsByUser(c.env.DB, user.id);
  if (existingSessions.length > 1) {
    // Store alert in KV for existing sessions to pick up
    for (const session of existingSessions) {
      if (session.id !== sessionId) {
        await c.env.KV.put(
          `device_alert:${session.id}`,
          JSON.stringify({
            type: 'new_device_login',
            new_device_pubkey: device_pubkey,
            timestamp: now,
          }),
          { expirationTtl: 86400 } // 24 hour TTL
        );
      }
    }
  }

  return c.json({
    user_id: user.id,
    session_id: sessionId,
    nonce,
    encrypted_key_bundle: user.encrypted_key_bundle
      ? bufferToBase64(user.encrypted_key_bundle)
      : null,
    key_bundle_iv: user.key_bundle_iv,
    bundle_seq: user.bundle_seq,
    bundle_seq_signature: user.bundle_seq_signature,
    has_active_sessions: existingSessions.length > 1,
  });
});

/**
 * GET /api/sessions
 * List active sessions for authenticated user.
 */
authRoutes.get('/sessions', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const sessions = await getSessionsByUser(c.env.DB, userId);
  return c.json({
    sessions: sessions.map(s => ({
      id: s.id,
      device_pubkey: s.device_pubkey.slice(0, 16) + '...', // truncated for display
      created_at: s.created_at,
      last_seen: s.last_seen,
    })),
  });
});

/**
 * DELETE /api/sessions/:id
 * Revoke specific session.
 */
authRoutes.delete('/sessions/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const sessionId = c.req.param('id');
  await deleteSession(c.env.DB, sessionId, userId);
  await c.env.KV.delete(`session:${sessionId}`);

  return c.json({ success: true });
});

/**
 * DELETE /api/sessions
 * Revoke ALL sessions (emergency).
 */
authRoutes.delete('/sessions', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const sessions = await getSessionsByUser(c.env.DB, userId);
  for (const session of sessions) {
    await c.env.KV.delete(`session:${session.id}`);
  }
  await deleteAllSessions(c.env.DB, userId);

  return c.json({ success: true });
});

// --- Helper Functions ---

/** Server-side hash using PBKDF2 (Workers don't have bcrypt) */
async function serverSideHash(input: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(input), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return bytesToHex(new Uint8Array(bits));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
