/** Whispr — D1 Query Helpers
 * Typed query functions for all database tables.
 * All queries respect blind server constraints.
 */

export interface DBUser {
  id: string;
  username: string;
  password_hash: string;
  argon2_salt: string;
  encrypted_key_bundle: ArrayBuffer | null;
  key_bundle_iv: string;
  recovery_bundle: ArrayBuffer | null;
  recovery_iv: string | null;
  recovery_bundle_duress: ArrayBuffer | null;
  recovery_iv_duress: string | null;
  bundle_seq: number;
  bundle_seq_signature: string | null;
  oprf_state: string | null;
  status: string;
  r2_quota_mb: number;
  d1_quota_mb: number;
  created_at: number;
}

export interface DBSession {
  id: string;
  user_id: string;
  device_pubkey: string;
  last_nonce: string;
  created_at: number;
  last_seen: number;
  expires_at: number;
}

export interface DBMailbox {
  mailbox_id: string;
  owner_uuid: string;
  expires_at: number | null;
  created_at: number;
}

export interface DBMailboxMessage {
  id: string;
  mailbox_id: string;
  payload: ArrayBuffer;
  message_iv: string;
  created_block: number;
}

export interface DBPrekey {
  id: string;
  user_id: string;
  key_type: string;
  public_key: ArrayBuffer;
  signature: ArrayBuffer | null;
  is_last_resort: number;
  used: number;
  created_at: number;
}

export interface DBKeyLogEntry {
  entry_id: number;
  user_uuid: string;
  identity_pubkey: string;
  kyber_pubkey: string;
  rotation_cert: string;
  merkle_root: string;
  created_block: number;
}

export interface DBAuditEntry {
  id: string;
  message_id: string | null;
  author_id: string;
  crp_result: string;
  created_block: number;
}

export interface DBStorageUsage {
  user_id: string;
  r2_bytes: number;
  d1_bytes: number;
  last_updated: number;
}

export interface DBStorageObject {
  id: string;
  user_id: string;
  object_type: string;
  r2_key: string | null;
  size_bytes: number;
  last_accessed: number;
  flagged_for_cleanup: number;
  created_at: number;
}

// ---- Query Functions ----

export async function getUserByUsername(db: D1Database, username: string): Promise<DBUser | null> {
  return db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<DBUser>();
}

export async function getUserById(db: D1Database, id: string): Promise<DBUser | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<DBUser>();
}

export async function createUser(db: D1Database, user: Omit<DBUser, 'status'>): Promise<void> {
  await db.prepare(
    `INSERT INTO users (id, username, password_hash, argon2_salt, encrypted_key_bundle, 
     key_bundle_iv, recovery_bundle, recovery_iv, recovery_bundle_duress, recovery_iv_duress,
     bundle_seq, bundle_seq_signature, oprf_state, status, r2_quota_mb, d1_quota_mb, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`
  ).bind(
    user.id, user.username, user.password_hash, user.argon2_salt,
    user.encrypted_key_bundle, user.key_bundle_iv,
    user.recovery_bundle, user.recovery_iv,
    user.recovery_bundle_duress, user.recovery_iv_duress,
    user.bundle_seq, user.bundle_seq_signature, user.oprf_state,
    user.r2_quota_mb, user.d1_quota_mb, user.created_at
  ).run();
}

export async function getSessionsByUser(db: D1Database, userId: string): Promise<DBSession[]> {
  const result = await db.prepare('SELECT * FROM sessions WHERE user_id = ?').bind(userId).all<DBSession>();
  return result.results || [];
}

export async function createSession(db: D1Database, session: DBSession): Promise<void> {
  await db.prepare(
    `INSERT INTO sessions (id, user_id, device_pubkey, last_nonce, created_at, last_seen, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(session.id, session.user_id, session.device_pubkey, session.last_nonce,
    session.created_at, session.last_seen, session.expires_at).run();
}

export async function deleteSession(db: D1Database, sessionId: string, userId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').bind(sessionId, userId).run();
}

export async function deleteAllSessions(db: D1Database, userId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
}

export async function getSessionById(db: D1Database, sessionId: string): Promise<DBSession | null> {
  return db.prepare('SELECT * FROM sessions WHERE id = ?').bind(sessionId).first<DBSession>();
}

export async function createMailbox(db: D1Database, mailbox: DBMailbox): Promise<void> {
  await db.prepare(
    'INSERT INTO mailboxes (mailbox_id, owner_uuid, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).bind(mailbox.mailbox_id, mailbox.owner_uuid, mailbox.expires_at, mailbox.created_at).run();
}

export async function getMailboxesByOwner(db: D1Database, ownerUuid: string): Promise<DBMailbox[]> {
  const result = await db.prepare('SELECT * FROM mailboxes WHERE owner_uuid = ?').bind(ownerUuid).all<DBMailbox>();
  return result.results || [];
}

export async function storeMailboxMessage(db: D1Database, msg: DBMailboxMessage): Promise<void> {
  await db.prepare(
    'INSERT INTO mailbox_messages (id, mailbox_id, payload, message_iv, created_block) VALUES (?, ?, ?, ?, ?)'
  ).bind(msg.id, msg.mailbox_id, msg.payload, msg.message_iv, msg.created_block).run();
}

export async function getMailboxMessages(
  db: D1Database, mailboxId: string, limit = 50, offset = 0
): Promise<DBMailboxMessage[]> {
  const result = await db.prepare(
    'SELECT * FROM mailbox_messages WHERE mailbox_id = ? ORDER BY created_block DESC LIMIT ? OFFSET ?'
  ).bind(mailboxId, limit, offset).all<DBMailboxMessage>();
  return result.results || [];
}

export async function getPrekeys(db: D1Database, userId: string): Promise<DBPrekey[]> {
  const result = await db.prepare(
    `SELECT * FROM prekeys WHERE user_id = ? AND used = 0 
     ORDER BY is_last_resort ASC, created_at ASC LIMIT 1`
  ).bind(userId).all<DBPrekey>();
  return result.results || [];
}

export async function markPrekeyUsed(db: D1Database, prekeyId: string): Promise<void> {
  await db.prepare('UPDATE prekeys SET used = 1 WHERE id = ? AND is_last_resort = 0').bind(prekeyId).run();
}

export async function uploadPrekeys(db: D1Database, prekeys: DBPrekey[]): Promise<void> {
  const stmt = db.prepare(
    `INSERT INTO prekeys (id, user_id, key_type, public_key, signature, is_last_resort, used, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
  );
  const batch = prekeys.map(pk =>
    stmt.bind(pk.id, pk.user_id, pk.key_type, pk.public_key, pk.signature, pk.is_last_resort, pk.created_at)
  );
  await db.batch(batch);
}

export async function appendKeyLog(db: D1Database, entry: Omit<DBKeyLogEntry, 'entry_id'>): Promise<void> {
  await db.prepare(
    `INSERT INTO key_log (user_uuid, identity_pubkey, kyber_pubkey, rotation_cert, merkle_root, created_block)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(entry.user_uuid, entry.identity_pubkey, entry.kyber_pubkey,
    entry.rotation_cert, entry.merkle_root, entry.created_block).run();
}

export async function getKeyLog(
  db: D1Database, userUuid: string, sinceEntry = 0
): Promise<DBKeyLogEntry[]> {
  const result = await db.prepare(
    'SELECT * FROM key_log WHERE user_uuid = ? AND entry_id > ? ORDER BY entry_id ASC'
  ).bind(userUuid, sinceEntry).all<DBKeyLogEntry>();
  return result.results || [];
}

export async function appendAuditLog(db: D1Database, entry: DBAuditEntry): Promise<void> {
  await db.prepare(
    'INSERT INTO audit_log (id, message_id, author_id, crp_result, created_block) VALUES (?, ?, ?, ?, ?)'
  ).bind(entry.id, entry.message_id, entry.author_id, entry.crp_result, entry.created_block).run();
}

export async function getAuditLog(
  db: D1Database, limit = 50, offset = 0
): Promise<DBAuditEntry[]> {
  const result = await db.prepare(
    'SELECT * FROM audit_log ORDER BY created_block DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all<DBAuditEntry>();
  return result.results || [];
}

export async function getStorageUsage(db: D1Database, userId: string): Promise<DBStorageUsage | null> {
  return db.prepare('SELECT * FROM storage_usage WHERE user_id = ?').bind(userId).first<DBStorageUsage>();
}

export async function updateStorageUsage(
  db: D1Database, userId: string, r2Delta: number, d1Delta: number
): Promise<void> {
  await db.prepare(
    `INSERT INTO storage_usage (user_id, r2_bytes, d1_bytes, last_updated) 
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET 
       r2_bytes = r2_bytes + ?, d1_bytes = d1_bytes + ?, last_updated = ?`
  ).bind(userId, Math.max(0, r2Delta), Math.max(0, d1Delta), Date.now(),
    r2Delta, d1Delta, Date.now()).run();
}

export async function updateUserCredentials(
  db: D1Database,
  userId: string,
  updates: {
    username?: string;
    password_hash?: string;
    argon2_salt?: string;
    encrypted_key_bundle?: ArrayBuffer;
    key_bundle_iv?: string;
    bundle_seq?: number;
    bundle_seq_signature?: string;
  }
): Promise<void> {
  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (updates.username !== undefined) { setClauses.push('username = ?'); values.push(updates.username); }
  if (updates.password_hash !== undefined) { setClauses.push('password_hash = ?'); values.push(updates.password_hash); }
  if (updates.argon2_salt !== undefined) { setClauses.push('argon2_salt = ?'); values.push(updates.argon2_salt); }
  if (updates.encrypted_key_bundle !== undefined) { setClauses.push('encrypted_key_bundle = ?'); values.push(updates.encrypted_key_bundle); }
  if (updates.key_bundle_iv !== undefined) { setClauses.push('key_bundle_iv = ?'); values.push(updates.key_bundle_iv); }
  if (updates.bundle_seq !== undefined) { setClauses.push('bundle_seq = ?'); values.push(updates.bundle_seq); }
  if (updates.bundle_seq_signature !== undefined) { setClauses.push('bundle_seq_signature = ?'); values.push(updates.bundle_seq_signature); }

  if (setClauses.length === 0) return;
  values.push(userId);

  await db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values).run();
}
