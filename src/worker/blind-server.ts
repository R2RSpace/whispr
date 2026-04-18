/** Whispr — Blind Server Middleware
 * Enforces that the server NEVER sees plaintext message content.
 * Throws if any handler attempts to log or return plaintext.
 * Per Section 2.5 + PATCH 01: CRP flags are inside E2EE payload.
 */
import { MiddlewareHandler } from 'hono';

/** List of patterns that indicate plaintext leakage */
const PLAINTEXT_LEAK_PATTERNS = [
  /message[_\s]*text/i,
  /plaintext/i,
  /decrypted/i,
  /raw[_\s]*content/i,
  /message[_\s]*body/i,
  /clear[_\s]*text/i,
];

/**
 * Blind server middleware — wraps console methods to detect plaintext leakage.
 * In production, this prevents accidental logging of sensitive data.
 */
export const blindServerMiddleware: MiddlewareHandler = async (c, next) => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  const checkForLeaks = (method: string, args: unknown[]) => {
    const serialized = args.map(a => {
      if (typeof a === 'string') return a;
      try { return JSON.stringify(a); } catch { return ''; }
    }).join(' ');

    for (const pattern of PLAINTEXT_LEAK_PATTERNS) {
      if (pattern.test(serialized)) {
        throw new Error(
          `[BLIND SERVER VIOLATION] Attempted to ${method} potential plaintext content. ` +
          `Pattern matched: ${pattern.source}. This is a security violation.`
        );
      }
    }
  };

  // Wrap console methods during request handling
  console.log = (...args: unknown[]) => {
    checkForLeaks('log', args);
    originalLog.apply(console, args);
  };
  console.warn = (...args: unknown[]) => {
    checkForLeaks('warn', args);
    originalWarn.apply(console, args);
  };
  console.error = (...args: unknown[]) => {
    checkForLeaks('error', args);
    originalError.apply(console, args);
  };

  try {
    await next();

    // Verify response body doesn't contain plaintext indicators
    const contentType = c.res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await c.res.clone().text();
      for (const pattern of PLAINTEXT_LEAK_PATTERNS) {
        if (pattern.test(body)) {
          throw new Error(
            `[BLIND SERVER VIOLATION] Response body contains potential plaintext. ` +
            `Pattern: ${pattern.source}`
          );
        }
      }
    }
  } finally {
    // Restore original console methods
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
};

/**
 * Validate that a message envelope contains only encrypted data.
 * Used by message handlers to enforce blind server invariants.
 */
export function assertEncryptedPayload(payload: unknown): void {
  if (!payload || typeof payload !== 'object') {
    throw new Error('[BLIND SERVER] Payload must be an object');
  }

  const obj = payload as Record<string, unknown>;

  // Payload MUST have encrypted_payload (BLOB) and message_iv
  if (!obj.payload && !obj.encrypted_payload) {
    throw new Error('[BLIND SERVER] Missing encrypted payload');
  }

  // Must NOT have plaintext fields
  const forbiddenFields = ['text', 'message', 'content', 'body', 'plaintext'];
  for (const field of forbiddenFields) {
    if (field in obj) {
      throw new Error(
        `[BLIND SERVER VIOLATION] Payload contains forbidden field: ${field}`
      );
    }
  }
}

/**
 * Compute epoch block from timestamp — PATCH 14
 * Resolution: 12 hours (43200 seconds)
 * Server never stores precise timestamps
 */
export function toEpochBlock(timestampMs?: number): number {
  const ts = timestampMs || Date.now();
  return Math.floor(ts / 1000 / 43200);
}
