import pool, { tenantStorage } from './db.js';

export async function scopeToTenant(req, res, next) {
  const tenantId = req.user && req.user.tenant_id;
  const isSuperAdmin = req.user && req.user.role_id === 1;

  if (isSuperAdmin) {
    // Keep tenant context for INSERT routes (so Super Admin after switch-tenant creates data in the right tenant)
    // Auto-scoping is still bypassed because we don't run tenantStorage (Super Admin sees all data on reads)
    req.tenantId = req.user.tenant_id || null;
    return next();
  }

  if (!tenantId) {
    return res.status(401).json({ error: 'Missing tenant context. Please log in again.' });
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT status FROM tenant_companies WHERE id = $1',
      [tenantId]
    );
    if (rows.length === 0 || rows[0].status !== 'active') {
      client.release();
      return res.status(403).json({ error: 'Company account is not active.' });
    }

    req.tenantId = tenantId;

    await client.query("SELECT set_config('app.current_tenant_id', $1, false)", [tenantId]);

    let released = false;
    const release = () => { if (!released) { released = true; client.release(); } };
    res.on('finish', release);
    res.on('close', release);

    tenantStorage.run({ client, tenantId }, () => next());
  } catch (err) {
    client.release();
    console.error('scopeToTenant error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function withTenantScope(baseQuery, params, tenantId) {
  if (!tenantId) return { text: baseQuery, values: params };
  const hasWhere = /\bWHERE\b/i.test(baseQuery);
  const clause = hasWhere ? ' AND tenant_id = $' : ' WHERE tenant_id = $';
  const newParams = [...params, tenantId];
  return {
    text: baseQuery + clause + newParams.length,
    values: newParams,
  };
}

export async function resolveTenantFromChannel(req, res, next) {
  try {
    const externalChannelId =
      req.body?.entry?.[0]?.id ||
      req.body?.destination ||
      null;

    if (!externalChannelId) {
      return res.status(400).json({ error: 'Unable to resolve channel' });
    }

    const { rows } = await pool.query(
      'SELECT tenant_id FROM social_channels WHERE page_id = $1',
      [externalChannelId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Channel not registered' });
    }

    req.tenantId = rows[0].tenant_id;
    next();
  } catch (err) {
    console.error('resolveTenantFromChannel error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
