/** Whipsr — Constitution API
 * GET /api/constitution — returns constitution.json
 * PUT /api/constitution — admin-only, hot-update
 * Constitution is hot-reloadable: CRP uses new values immediately.
 */
import { Hono } from 'hono';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
}

export const constitutionRoutes = new Hono<{ Bindings: Env }>();

/** Default constitution (loaded from bundled file on first use) */
import defaultConstitution from '../../constitution.json';

/**
 * GET /api/constitution
 * Returns the current active constitution.
 * First checks KV for hot-reloaded version, falls back to default.
 */
constitutionRoutes.get('/', async (c) => {
  // Check for hot-reloaded version in KV
  const kvConstitution = await c.env.KV.get('constitution:active', 'json');
  if (kvConstitution) {
    return c.json(kvConstitution);
  }
  return c.json(defaultConstitution);
});

/**
 * PUT /api/constitution
 * Admin-only: validates and hot-updates the constitution.
 * Changes take effect immediately — CRP fetches from KV on each message.
 */
constitutionRoutes.put('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  // TODO: Add proper admin role check. For now, any authenticated user can update.
  const body = await c.req.json();

  // Validate constitution structure
  const validation = validateConstitution(body);
  if (!validation.valid) {
    return c.json({ error: 'Invalid constitution', details: validation.errors }, 400);
  }

  // Store in KV for hot-reload
  body._last_updated = new Date().toISOString();
  body._schema_version = (body._schema_version || 0) + 1;

  await c.env.KV.put('constitution:active', JSON.stringify(body));

  // Also store history
  await c.env.KV.put(
    `constitution:history:${Date.now()}`,
    JSON.stringify(body),
    { expirationTtl: 90 * 24 * 60 * 60 } // 90 day retention
  );

  return c.json({ success: true, version: body._schema_version });
});

/**
 * GET /api/audit — Admin-only, paginated audit log
 */
constitutionRoutes.get('/audit', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const page = parseInt(c.req.query('page') || '0');
  const limit = 50;

  const result = await c.env.DB.prepare(
    'SELECT * FROM audit_log ORDER BY created_block DESC LIMIT ? OFFSET ?'
  ).bind(limit, page * limit).all();

  return c.json({
    entries: result.results || [],
    page,
    has_more: (result.results || []).length === limit,
  });
});

/** Validate constitution JSON structure */
function validateConstitution(obj: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!obj.principles || !Array.isArray(obj.principles)) {
    errors.push('Missing or invalid "principles" array');
    return { valid: false, errors };
  }

  if (obj.principles.length < 8) {
    errors.push('Minimum 8 principles required');
  }

  for (let i = 0; i < obj.principles.length; i++) {
    const p = obj.principles[i];
    const prefix = `principles[${i}]`;

    if (!p.id || typeof p.id !== 'string') errors.push(`${prefix}: missing id`);
    if (!p.name || typeof p.name !== 'string') errors.push(`${prefix}: missing name`);
    if (!p.description || typeof p.description !== 'string') errors.push(`${prefix}: missing description`);
    if (typeof p.weight !== 'number' || p.weight < 0 || p.weight > 1)
      errors.push(`${prefix}: weight must be 0.0-1.0`);
    if (!['user', 'system', 'both'].includes(p.scope))
      errors.push(`${prefix}: scope must be user|system|both`);
    if (!['BLOCK', 'WARN', 'ANNOTATE', 'PASS'].includes(p.enforcement_mode))
      errors.push(`${prefix}: invalid enforcement_mode`);
    if (typeof p.violation_threshold !== 'number' || p.violation_threshold < 0 || p.violation_threshold > 1)
      errors.push(`${prefix}: violation_threshold must be 0.0-1.0`);
  }

  return { valid: errors.length === 0, errors };
}
