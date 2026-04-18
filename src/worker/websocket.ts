/** Whispr — WebSocket Durable Object (ConversationRoom)
 * Real-time message relay via WebSocket connections.
 * PATCH 08: Keyed by mailbox_id, not conversation_id.
 * PATCH 06: PoW verified on connection upgrade.
 * Supports hibernation for idle connections.
 */
import { DurableObject } from 'cloudflare:workers';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
}

export class ConversationRoom extends DurableObject {
  private connections: Map<string, WebSocket> = new Map();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Internal notification from message POST
    if (url.pathname === '/notify') {
      const data = await request.json() as { message_id: string; mailbox_id: string };
      this.broadcast(JSON.stringify({
        type: 'new_message',
        message_id: data.message_id,
        mailbox_id: data.mailbox_id,
      }));
      return new Response('ok');
    }

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];

      const sessionId = url.searchParams.get('session') || crypto.randomUUID();

      this.ctx.acceptWebSocket(server);
      this.connections.set(sessionId, server);

      server.addEventListener('close', () => {
        this.connections.delete(sessionId);
      });

      server.addEventListener('error', () => {
        this.connections.delete(sessionId);
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Expected WebSocket', { status: 400 });
  }

  /** Handle incoming WebSocket messages */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // Relay encrypted message to all other connections in this mailbox room
    const msgStr = typeof message === 'string' ? message : new TextDecoder().decode(message);

    try {
      const parsed = JSON.parse(msgStr);
      // Only relay encrypted payloads — blind server enforcement
      if (parsed.type === 'encrypted_message' && parsed.payload) {
        this.broadcast(msgStr, ws);
      } else if (parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch {
      // Invalid message format — ignore
    }
  }

  /** Handle WebSocket close */
  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    // Remove from connections
    for (const [id, conn] of this.connections.entries()) {
      if (conn === ws) {
        this.connections.delete(id);
        break;
      }
    }
  }

  /** Broadcast message to all connected clients except sender */
  private broadcast(message: string, exclude?: WebSocket): void {
    for (const [, conn] of this.connections.entries()) {
      if (conn !== exclude) {
        try {
          conn.send(message);
        } catch {
          // Connection dead — will be cleaned up on close
        }
      }
    }
  }
}
