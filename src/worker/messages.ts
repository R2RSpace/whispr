/** Whispr — Messages API
 * PATCH 08: Mailbox-based routing (no social graph on server)
 * PATCH 01: No crp_metadata column — CRP flags inside E2EE payload
 * PATCH 14: Epoch blocks instead of precise timestamps
 */
import { Hono } from 'hono';
import { storeMailboxMessage, getMailboxMessages, createMailbox, getMailboxesByOwner } from './db/queries';
import { toEpochBlock } from './blind-server';
import { assertEncryptedPayload } from './blind-server';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  CONVERSATION_ROOM: DurableObjectNamespace;
}

export const messageRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /api/mailbox/:mailbox_id — Send encrypted message to a mailbox
 * Server receives only: encrypted blob + IV. No plaintext, no CRP metadata.
 * PATCH 08: Mailbox system replaces conversation-based routing.
 */
messageRoutes.post('/:mailbox_id', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const mailboxId = c.req.param('mailbox_id');
  const body = await c.req.json();

  // Blind server enforcement: verify payload is encrypted
  assertEncryptedPayload(body);

  const { payload, message_iv } = body;

  const messageId = crypto.randomUUID();
  const createdBlock = toEpochBlock();

  // Store encrypted message — server cannot read it
  await storeMailboxMessage(c.env.DB, {
    id: messageId,
    mailbox_id: mailboxId,
    payload: base64ToBuffer(payload),
    message_iv,
    created_block: createdBlock,
  });

  // Notify via Durable Object if recipient is connected
  try {
    const doId = c.env.CONVERSATION_ROOM.idFromName(mailboxId);
    const doStub = c.env.CONVERSATION_ROOM.get(doId);
    await doStub.fetch(new Request('https://internal/notify', {
      method: 'POST',
      body: JSON.stringify({ message_id: messageId, mailbox_id: mailboxId }),
    }));
  } catch {
    // Recipient not connected — message stored for later retrieval
  }

  return c.json({ message_id: messageId, created_block: createdBlock }, 201);
});

/**
 * GET /api/messages/:mailbox_id — Paginated message history
 * Returns only encrypted blobs. Client decrypts locally.
 */
messageRoutes.get('/:mailbox_id', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const mailboxId = c.req.param('mailbox_id');
  const page = parseInt(c.req.query('page') || '0');
  const limit = 50;

  const messages = await getMailboxMessages(c.env.DB, mailboxId, limit, page * limit);

  return c.json({
    messages: messages.map(m => ({
      id: m.id,
      mailbox_id: m.mailbox_id,
      payload: bufferToBase64(m.payload),
      message_iv: m.message_iv,
      created_block: m.created_block,
    })),
    page,
    has_more: messages.length === limit,
  });
});

/**
 * POST /api/mailboxes — Create new mailboxes for a user
 * PATCH 08: Generate batch of random mailbox IDs
 */
messageRoutes.post('/create-mailboxes', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const count = Math.min(body.count || 10, 100); // max 100 at a time
  const now = Date.now();

  const mailboxIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const mailboxId = crypto.randomUUID();
    await createMailbox(c.env.DB, {
      mailbox_id: mailboxId,
      owner_uuid: userId,
      expires_at: body.expires_at || null,
      created_at: now,
    });
    mailboxIds.push(mailboxId);
  }

  return c.json({ mailbox_ids: mailboxIds }, 201);
});

/**
 * GET /api/mailboxes — List user's mailboxes
 */
messageRoutes.get('/list', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const mailboxes = await getMailboxesByOwner(c.env.DB, userId);
  return c.json({
    mailboxes: mailboxes.map(m => ({
      mailbox_id: m.mailbox_id,
      expires_at: m.expires_at,
      created_at: m.created_at,
    })),
  });
});

// --- Helpers ---

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
