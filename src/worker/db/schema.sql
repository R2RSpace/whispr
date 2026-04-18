-- Whispr Database Schema (Cloudflare D1 / SQLite)
-- Amended by PATCH 08 (mailboxes), PATCH 14 (epoch blocks), PATCH 04 (key_log)
-- PATCH 01: crp_metadata removed from messages (blind server)

CREATE TABLE IF NOT EXISTS users (
  id                      TEXT PRIMARY KEY,     -- immutable UUID
  username                TEXT UNIQUE NOT NULL,
  password_hash           TEXT NOT NULL,         -- bcrypt(argon2_hash)
  argon2_salt             TEXT NOT NULL,
  encrypted_key_bundle    BLOB,
  key_bundle_iv           TEXT NOT NULL,
  recovery_bundle         BLOB,                  -- AES-GCM(recovery_key, key_bundle)
  recovery_iv             TEXT,
  recovery_bundle_duress  BLOB,                  -- PATCH 12: decoy key_bundle
  recovery_iv_duress      TEXT,                   -- PATCH 12: decoy IV
  bundle_seq              INTEGER DEFAULT 0,      -- PATCH 13: monotonic sequence
  bundle_seq_signature    TEXT,                    -- PATCH 13: Ed25519 signed
  oprf_state              TEXT,                    -- PATCH 09: OPRF server state
  status                  TEXT DEFAULT 'active',   -- 'active'|'migrated'|'suspended'
  r2_quota_mb             INTEGER DEFAULT 50,
  d1_quota_mb             INTEGER DEFAULT 10,
  created_at              INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  device_pubkey TEXT NOT NULL,        -- PATCH 02: crypto device keypair
  last_nonce    TEXT NOT NULL,        -- PATCH 02: anti-replay
  created_at    INTEGER NOT NULL,
  last_seen     INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL
);

-- PATCH 08: Mailbox system (replaces conversations table)
CREATE TABLE IF NOT EXISTS mailboxes (
  mailbox_id  TEXT PRIMARY KEY,       -- random UUID, disposable
  owner_uuid  TEXT NOT NULL,
  expires_at  INTEGER,                -- optional expiry
  created_at  INTEGER NOT NULL
);

-- PATCH 08: Messages routed to mailboxes, no social graph
-- PATCH 14: created_block instead of created_at
CREATE TABLE IF NOT EXISTS mailbox_messages (
  id            TEXT PRIMARY KEY,
  mailbox_id    TEXT NOT NULL,         -- no FK to users
  payload       BLOB NOT NULL,         -- E2EE blob (includes crp_flag per PATCH 01)
  message_iv    TEXT NOT NULL,
  created_block INTEGER NOT NULL       -- PATCH 14: epoch / 43200 (12hr resolution)
);

-- Audit log: append-only, no UPDATE or DELETE
CREATE TABLE IF NOT EXISTS audit_log (
  id            TEXT PRIMARY KEY,
  message_id    TEXT,
  author_id     TEXT NOT NULL,
  crp_result    TEXT NOT NULL,         -- JSON: full CRP output (encrypted)
  created_block INTEGER NOT NULL       -- PATCH 14: epoch blocks
);

CREATE TABLE IF NOT EXISTS prekeys (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL,
  key_type       TEXT NOT NULL,        -- "signed"|"one_time"|"kyber"|"last_resort"
  public_key     BLOB NOT NULL,
  signature      BLOB,
  is_last_resort INTEGER DEFAULT 0,    -- PATCH 10: never deleted by server
  used           INTEGER DEFAULT 0,
  created_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS storage_usage (
  user_id      TEXT PRIMARY KEY,
  r2_bytes     INTEGER DEFAULT 0,
  d1_bytes     INTEGER DEFAULT 0,
  last_updated INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS storage_objects (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  object_type         TEXT NOT NULL,    -- "media"|"message"|"prekey"
  r2_key              TEXT,
  size_bytes          INTEGER NOT NULL,
  last_accessed       INTEGER NOT NULL,
  flagged_for_cleanup INTEGER DEFAULT 0,
  created_at          INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS key_rotation_certs (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL,
  old_identity_pubkey  TEXT NOT NULL,
  new_identity_pubkey  TEXT NOT NULL,
  new_kyber_pubkey     TEXT NOT NULL,
  signature            TEXT NOT NULL,
  created_at           INTEGER NOT NULL
);

-- PATCH 04: Append-only key transparency log with Merkle root
CREATE TABLE IF NOT EXISTS key_log (
  entry_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_uuid      TEXT NOT NULL,
  identity_pubkey TEXT NOT NULL,
  kyber_pubkey   TEXT NOT NULL,
  rotation_cert  TEXT NOT NULL,        -- JSON + Ed25519 signature
  merkle_root    TEXT NOT NULL,        -- BLAKE2b(prev_root + this_entry)
  created_block  INTEGER NOT NULL      -- PATCH 14: epoch block
);
-- key_log is APPEND-ONLY: application layer enforces no UPDATE/DELETE

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mailboxes_owner ON mailboxes(owner_uuid);
CREATE INDEX IF NOT EXISTS idx_mailbox_messages_mailbox ON mailbox_messages(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_prekeys_user ON prekeys(user_id);
CREATE INDEX IF NOT EXISTS idx_prekeys_user_type ON prekeys(user_id, key_type, used);
CREATE INDEX IF NOT EXISTS idx_storage_objects_user ON storage_objects(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_objects_cleanup ON storage_objects(flagged_for_cleanup);
CREATE INDEX IF NOT EXISTS idx_key_log_user ON key_log(user_uuid);
CREATE INDEX IF NOT EXISTS idx_audit_log_author ON audit_log(author_id);
