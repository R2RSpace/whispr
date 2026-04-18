/** Whispr — 0 Budget WebRTC Signaling
 * Replaces WebSockets & Durable Objects with KV-based polling
 * for SDP offers, answers, and ICE candidates.
 */
import { Hono } from 'hono';

interface Env {
  KV: KVNamespace;
}

export const signalingRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /api/webrtc/signal/:channel_id
 * Post a signaling payload (offer, answer, candidate, end)
 */
signalingRoutes.post('/:channel_id', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const channelId = c.req.param('channel_id');
  const payload = await c.req.json();

  // Add timestamp and sender info
  const packet = {
    ...payload,
    sender: userId,
    timestamp: Date.now(),
  };

  // We append to a list in KV (or just overwrite if it's simple state)
  // Since KV doesn't have lists natively, we fetch, push, put.
  const key = `webrtc:${channelId}`;
  const existingStr = await c.env.KV.get(key);
  const queue = existingStr ? JSON.parse(existingStr) : [];
  
  queue.push(packet);
  
  // Keep only the last 20 messages to save space, and set an expiration of 5 minutes
  await c.env.KV.put(key, JSON.stringify(queue.slice(-20)), { expirationTtl: 300 });

  return c.json({ success: true });
});

/**
 * GET /api/webrtc/poll/:channel_id
 * Long-polling replacement to fetch the latest signals
 */
signalingRoutes.get('/poll/:channel_id', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const channelId = c.req.param('channel_id');
  const since = parseInt(c.req.query('since') || '0');

  const key = `webrtc:${channelId}`;
  const existingStr = await c.env.KV.get(key);
  
  if (!existingStr) {
    return c.json({ signals: [] });
  }

  const queue = JSON.parse(existingStr);
  
  // Return signals strictly newer than 'since' and NOT sent by the current user
  const newSignals = queue.filter((item: any) => item.timestamp > since && item.sender !== userId);

  return c.json({ signals: newSignals });
});
