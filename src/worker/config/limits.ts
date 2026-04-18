/** Whispr — Global Safe Storage Limits
 * 90% of Cloudflare free tier to prevent service disruption.
 * These constants are the single source of truth for all quota checks.
 */

/** R2 free tier: 10 GB → safe limit 90% = 9,216 MB */
export const R2_SAFE_LIMIT_BYTES = 9_216 * 1024 * 1024;

/** D1 free tier: 5 GB → safe limit 90% = 4,608 MB */
export const D1_SAFE_LIMIT_BYTES = 4_608 * 1024 * 1024;

/** KV free tier: 1 GB → safe limit 90% = 921 MB */
export const KV_SAFE_LIMIT_BYTES = 921 * 1024 * 1024;

/** Default per-user R2 quota in MB */
export const DEFAULT_R2_QUOTA_MB = 50;

/** Default per-user D1 quota in MB */
export const DEFAULT_D1_QUOTA_MB = 10;

/** Media tier sizes for padding (PATCH 11) — in bytes */
export const MEDIA_TIER_SIZES = [
  1 * 1024 * 1024,    // 1 MB
  5 * 1024 * 1024,    // 5 MB
  15 * 1024 * 1024,   // 15 MB
  50 * 1024 * 1024,   // 50 MB
  100 * 1024 * 1024,  // 100 MB
];

/** Max media file size */
export const MAX_MEDIA_SIZE = 100 * 1024 * 1024;

/** Mailbox rotation: every 50 messages or 7 days (PATCH 08) */
export const MAILBOX_ROTATION_MSG_LIMIT = 50;
export const MAILBOX_ROTATION_DAYS = 7;

/** PoW difficulty (PATCH 06) — number of leading zero hex chars */
export const POW_DIFFICULTY = 4;

/** PoW challenge TTL in seconds */
export const POW_CHALLENGE_TTL = 60;

/** Prekey fetch rate limit: max per hour (PATCH 10) */
export const PREKEY_FETCH_RATE_LIMIT = 10;

/** Storage cleanup: days before flagging, grace period days */
export const CLEANUP_FLAG_DAYS = 90;
export const CLEANUP_GRACE_DAYS = 14;

/** Session expiry in seconds (30 days) */
export const SESSION_EXPIRY_SECONDS = 30 * 24 * 60 * 60;

/** Epoch block resolution in seconds (12 hours = 43200s) — PATCH 14 */
export const EPOCH_BLOCK_RESOLUTION = 43200;
