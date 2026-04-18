/** Whipsr — Credential & Identity Rotation
 * Layer 1: Password/username rotation (atomic D1 transaction)
 * Layer 2: Identity key rotation (with key_log per PATCH 04)
 * Layer 3: Account migration (transfer cert broadcast)
 */
import { Hono } from 'hono';
import { getUserById, updateUserCredentials, deleteAllSessions, appendKeyLog, createUser } from './db/queries';
import { toEpochBlock } from './blind-server';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
}

export const credentialRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /api/auth/rotate-credentials — Layer 1
 * Rotate password and/or username. Identity keys do NOT change.
 * All existing conversations continue normally.
 */
credentialRoutes.post('/rotate-credentials', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const {
    old_password_hash,
    new_username,
    new_password_hash,
    new_argon2_salt,
    new_encrypted_key_bundle,
    new_key_bundle_iv,
    session_revoke_all,
  } = body;

  const user = await getUserById(c.env.DB, userId);
  if (!user) return c.json({ error: 'User not found' }, 404);

  // Verify old password hash
  const [serverSalt, storedHash] = user.password_hash.split(':');
  const computedHash = await serverSideHash(old_password_hash, serverSalt);
  if (computedHash !== storedHash) {
    return c.json({ error: 'Current password verification failed' }, 401);
  }

  // Build updates atomically
  const newServerSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const newServerHash = await serverSideHash(new_password_hash, newServerSalt);

  const updates: Record<string, unknown> = {
    password_hash: `${newServerSalt}:${newServerHash}`,
    argon2_salt: new_argon2_salt,
  };

  if (new_encrypted_key_bundle) {
    updates.encrypted_key_bundle = base64ToBuffer(new_encrypted_key_bundle);
    updates.key_bundle_iv = new_key_bundle_iv;
    updates.bundle_seq = (user.bundle_seq || 0) + 1;
  }

  // Check username uniqueness if changing
  if (new_username && new_username !== user.username) {
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ?'
    ).bind(new_username).first();
    if (existing) {
      return c.json({ error: 'Username already taken' }, 409);
    }
    updates.username = new_username;
  }

  // Atomic update
  await updateUserCredentials(c.env.DB, userId, updates as any);

  // Revoke all sessions if requested (always true in security emergency)
  if (session_revoke_all) {
    const sessions = await c.env.DB.prepare(
      'SELECT id FROM sessions WHERE user_id = ?'
    ).bind(userId).all();
    for (const s of (sessions.results || [])) {
      await c.env.KV.delete(`session:${(s as any).id}`);
    }
    await deleteAllSessions(c.env.DB, userId);
  }

  return c.json({ success: true, username: new_username || user.username });
});

/**
 * POST /api/keys/rotate-identity — Layer 2
 * Rotate identity keypair when private key is suspected compromised.
 * Appends to key_log (PATCH 04) for Merkle-chain verification.
 */
credentialRoutes.post('/rotate-identity', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const {
    old_identity_pubkey,
    new_identity_pubkey,
    new_kyber_pubkey,
    rotation_cert,
    signature,
  } = body;

  // Get latest Merkle root for this user
  const lastEntry = await c.env.DB.prepare(
    'SELECT merkle_root FROM key_log WHERE user_uuid = ? ORDER BY entry_id DESC LIMIT 1'
  ).bind(userId).first<{ merkle_root: string }>();

  const prevRoot = lastEntry?.merkle_root || '0'.repeat(64);

  // Compute new Merkle root: BLAKE2b(prev_root + this_entry)
  // Using SHA-256 as BLAKE2b isn't available in Workers natively
  const entryData = new TextEncoder().encode(
    prevRoot + new_identity_pubkey + new_kyber_pubkey + rotation_cert
  );
  const newRootBuf = await crypto.subtle.digest('SHA-256', entryData);
  const newRoot = bytesToHex(new Uint8Array(newRootBuf));

  // Store rotation cert
  await c.env.DB.prepare(
    `INSERT INTO key_rotation_certs (id, user_id, old_identity_pubkey, new_identity_pubkey, 
     new_kyber_pubkey, signature, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(), userId, old_identity_pubkey, new_identity_pubkey,
    new_kyber_pubkey, signature, Date.now()
  ).run();

  // Append to key_log (PATCH 04: append-only, never update/delete)
  await appendKeyLog(c.env.DB, {
    user_uuid: userId,
    identity_pubkey: new_identity_pubkey,
    kyber_pubkey: new_kyber_pubkey,
    rotation_cert: JSON.stringify({ rotation_cert, signature }),
    merkle_root: newRoot,
    created_block: toEpochBlock(),
  });

  return c.json({
    success: true,
    merkle_root: newRoot,
  });
});

/**
 * POST /api/auth/migrate — Layer 3
 * Full account migration when attacker has active session.
 * Old account set to migrated (read-only), auto-deletes after 30 days.
 */
credentialRoutes.post('/migrate', async (c) => {
  const body = await c.req.json();
  const {
    old_uuid,
    new_uuid,
    new_username,
    transfer_cert,
    signature,
  } = body;

  // Verify old account exists and is active
  const oldUser = await getUserById(c.env.DB, old_uuid);
  if (!oldUser) return c.json({ error: 'Old account not found' }, 404);

  // Set old account to migrated
  await c.env.DB.prepare(
    "UPDATE users SET status = 'migrated' WHERE id = ?"
  ).bind(old_uuid).run();

  // Revoke all old sessions
  const oldSessions = await c.env.DB.prepare(
    'SELECT id FROM sessions WHERE user_id = ?'
  ).bind(old_uuid).all();
  for (const s of (oldSessions.results || [])) {
    await c.env.KV.delete(`session:${(s as any).id}`);
  }
  await deleteAllSessions(c.env.DB, old_uuid);

  // Schedule auto-delete after 30 days
  await c.env.KV.put(`migrate:delete:${old_uuid}`, 'pending', {
    expirationTtl: 30 * 24 * 60 * 60,
  });

  // Store transfer cert for contacts to verify
  await c.env.DB.prepare(
    `INSERT INTO key_rotation_certs (id, user_id, old_identity_pubkey, new_identity_pubkey, 
     new_kyber_pubkey, signature, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(), old_uuid,
    'migration', new_uuid,
    '', JSON.stringify({ transfer_cert, signature, new_username }),
    Date.now()
  ).run();

  return c.json({ success: true, old_uuid, new_uuid });
});

// --- Helpers ---

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
