import pool, { tenantStorage } from './db.js';

// -------------------------------------------------------------------
// 1. Core middleware: run AFTER authenticateToken (which sets req.user)
//    and BEFORE any controller/route handler.
//    Acquires a dedicated client, sets the RLS session variable so that
//    every pool.query() implicitly inherits the tenant scope via the
//    proxied pool, and attaches tenant info to req.
//    Super Admin (role_id=6) bypasses tenant scoping.
// -------------------------------------------------------------------
export async function scopeToTenant(req, res, next) {
  const tenantId = req.user && req.user.tenant_id;
  const isSuperAdmin = req.user && req.user.role_id === 6;

  if (isSuperAdmin) {
    req.tenantId = null;
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

    // Set session variable for RLS — is_local=false so it persists across
    // all client.query() calls within this connection's lifetime.
    await client.query("SELECT set_config('app.current_tenant_id', $1, false)", [tenantId]);

    // Release client when response finishes
    let released = false;
    const release = () => { if (!released) { released = true; client.release(); } };
    res.on('finish', release);
    res.on('close', release);

    // Create AsyncLocalStorage context so the proxied pool.query() in db.js
    // transparently routes all queries to this dedicated client.
    tenantStorage.run({ client, tenantId }, () => next());
  } catch (err) {
    client.release();
    console.error('scopeToTenant error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// -------------------------------------------------------------------
// 2. Per-request DB client that sets the Postgres session variable
//    used by Row-Level Security policies.
// -------------------------------------------------------------------
export async function getScopedClient(tenantId) {
  const client = await pool.connect();
  await client.query('BEGIN');
  await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId || '']);
  return client;
}

// -------------------------------------------------------------------
// 3. Convenience helper — explicitly appends tenant_id filter so
//    isolation doesn't rely on RLS alone.
// -------------------------------------------------------------------
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

// -------------------------------------------------------------------
// 4. Webhook company resolution (no JWT — resolve from channel)
// -------------------------------------------------------------------
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
