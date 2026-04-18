/** Whispr — Storage Quota Durable Object (QuotaLedger)
 * PATCH 15: Single-threaded per-user quota enforcement.
 * Eliminates TOCTOU race conditions in storage quota checks.
 * One DO per user — hibernates when inactive.
 */
import { DurableObject } from 'cloudflare:workers';

interface Env {
  DB: D1Database;
}

export class QuotaLedger extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/request': {
        const body = await request.json() as { bytes: number; type: 'r2' | 'd1' };
        const allowed = await this.requestTokens(body.bytes, body.type);
        return Response.json({ allowed });
      }

      case '/release': {
        const body = await request.json() as { bytes: number; type: 'r2' | 'd1' };
        await this.releaseTokens(body.bytes, body.type);
        return Response.json({ success: true });
      }

      case '/init': {
        const body = await request.json() as { r2_quota_bytes: number; d1_quota_bytes: number };
        await this.ctx.storage.put('r2_quota_bytes', body.r2_quota_bytes);
        await this.ctx.storage.put('d1_quota_bytes', body.d1_quota_bytes);
        if (!(await this.ctx.storage.get('r2_used_bytes'))) {
          await this.ctx.storage.put('r2_used_bytes', 0);
        }
        if (!(await this.ctx.storage.get('d1_used_bytes'))) {
          await this.ctx.storage.put('d1_used_bytes', 0);
        }
        return Response.json({ success: true });
      }

      case '/usage': {
        const r2Used = (await this.ctx.storage.get<number>('r2_used_bytes')) ?? 0;
        const d1Used = (await this.ctx.storage.get<number>('d1_used_bytes')) ?? 0;
        const r2Quota = (await this.ctx.storage.get<number>('r2_quota_bytes')) ?? 136 * 1024 * 1024;
        const d1Quota = (await this.ctx.storage.get<number>('d1_quota_bytes')) ?? 10 * 1024 * 1024;
        return Response.json({
          r2_used_bytes: r2Used,
          d1_used_bytes: d1Used,
          r2_quota_bytes: r2Quota,
          d1_quota_bytes: d1Quota,
          r2_percent: (r2Used / r2Quota) * 100,
          d1_percent: (d1Used / d1Quota) * 100,
        });
      }

      default:
        return new Response('Not found', { status: 404 });
    }
  }

  /**
   * Request storage tokens — single-threaded, race-condition-free.
   * PATCH 15: 1000 concurrent requests → DO processes one at a time → only valid ones pass.
   */
  private async requestTokens(bytes: number, type: 'r2' | 'd1'): Promise<boolean> {
    const usedKey = `${type}_used_bytes`;
    const quotaKey = `${type}_quota_bytes`;

    const current = (await this.ctx.storage.get<number>(usedKey)) ?? 0;
    const quota = (await this.ctx.storage.get<number>(quotaKey)) ?? (type === 'r2' ? 136 * 1024 * 1024 : 10 * 1024 * 1024);

    // 95% threshold — leave 5% buffer
    if (current + bytes > quota * 0.95) {
      return false;
    }

    await this.ctx.storage.put(usedKey, current + bytes);
    return true;
  }

  /**
   * Release storage tokens when media is deleted.
   */
  private async releaseTokens(bytes: number, type: 'r2' | 'd1'): Promise<void> {
    const usedKey = `${type}_used_bytes`;
    const current = (await this.ctx.storage.get<number>(usedKey)) ?? 0;
    await this.ctx.storage.put(usedKey, Math.max(0, current - bytes));
  }
}
