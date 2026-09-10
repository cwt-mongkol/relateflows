// Public API (/api/v1/*) — external systems (n8n, ERP, ...) authenticate with an API key instead of the
// internal JWT session, so this router is mounted outside the app.js JWT/tenant middleware chain (see
// the SKIP checks in app.js right next to the '/webhook/' exclusion) and does its own tenant scoping by
// hand, the same way the inbound webhook handler already does.
import express from 'express';
import crypto from 'crypto';
import pool from './db.js';
import { runWorkflows, VALID_TRIGGER_TYPES } from './automation.js';
import { dispatchWebhooks } from './webhooks.js';

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function authenticateApiKey(req, res, next) {
  const authHeader = req.headers['authorization'];
  const key = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-api-key'] || '');
  if (!key) return res.status(401).json({ error: 'Missing API key. Send it as "Authorization: Bearer <key>".' });

  try {
    const keyHash = hashKey(key);
    const result = await pool.query(
      `SELECT id, tenant_id, scopes, status FROM api_keys WHERE key_hash = $1`,
      [keyHash]
    );
    const row = result.rows[0];
    if (!row || row.status !== 'active') return res.status(401).json({ error: 'Invalid or revoked API key' });

    req.apiKeyId = row.id;
    req.tenantId = row.tenant_id;
    req.apiScopes = Array.isArray(row.scopes) ? row.scopes : [];
    pool.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1 AND tenant_id = $2', [row.id, row.tenant_id])
      .catch((err) => console.error('api_keys last_used_at update error:', err.message));
    next();
  } catch (err) {
    console.error('authenticateApiKey error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

function requireScope(scope) {
  return (req, res, next) => {
    if (!req.apiScopes?.includes(scope)) {
      return res.status(403).json({ error: `Forbidden: this API key is missing the "${scope}" scope` });
    }
    next();
  };
}

// In-memory per-key rate limiter — separate bucket from the internal app's IP-based one, since many
// external systems can share one outbound IP (e.g. an n8n instance calling on behalf of many tenants).
const rateBuckets = new Map();
function rateLimitByKey(maxRequests, windowMs) {
  return (req, res, next) => {
    const key = req.apiKeyId || 'anonymous';
    const now = Date.now();
    const entry = rateBuckets.get(key);
    if (!entry || now - entry.resetAt > windowMs) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > maxRequests) return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateBuckets) {
    if (now - entry.resetAt > 60000) rateBuckets.delete(key);
  }
}, 300000).unref();

export function createApiV1Router() {
  const router = express.Router();
  router.use(authenticateApiKey);
  router.use(rateLimitByKey(300, 60000));

  // ── Contacts ──
  router.get('/contacts', requireScope('contacts:read'), async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, name, email, phone, company, created_at AS "createdAt" FROM contacts WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [req.tenantId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error('API v1 GET /contacts error:', err.message);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/contacts', requireScope('contacts:write'), async (req, res) => {
    try {
      const { name, email, phone, company } = req.body || {};
      if (!name) return res.status(400).json({ error: 'name is required' });
      const id = `CNT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const result = await pool.query(
        `INSERT INTO contacts (id, name, email, phone, company, tenant_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, name, email, phone, company, created_at AS "createdAt"`,
        [id, name, email || '', phone || '', company || '', req.tenantId]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('API v1 POST /contacts error:', err.message);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ── Leads ──
  router.get('/leads', requireScope('leads:read'), async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, name, channel, status, lead_score AS "leadScore", assigned_to AS "assignedTo", created_at AS "createdAt"
         FROM leads WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [req.tenantId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error('API v1 GET /leads error:', err.message);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/leads', requireScope('leads:write'), async (req, res) => {
    try {
      const { name, channel } = req.body || {};
      if (!name || !channel) return res.status(400).json({ error: 'name and channel are required' });
      const id = `LD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const result = await pool.query(
        `INSERT INTO leads (id, tenant_id, name, channel, status) VALUES ($1, $2, $3, $4, 'new')
         RETURNING id, name, channel, status, lead_score AS "leadScore", created_at AS "createdAt"`,
        [id, req.tenantId, name, channel]
      );
      const savedLead = result.rows[0];
      const eventPayload = { name, channel, status: 'new' };
      runWorkflows({ tenantId: req.tenantId, eventType: 'lead.created', entityType: 'lead', entityId: savedLead.id, payload: eventPayload })
        .catch((err) => console.error('runWorkflows (api/v1 lead.created) error:', err.message));
      dispatchWebhooks({ tenantId: req.tenantId, eventType: 'lead.created', entityType: 'lead', entityId: savedLead.id, payload: eventPayload })
        .catch((err) => console.error('dispatchWebhooks (api/v1 lead.created) error:', err.message));
      res.status(201).json(savedLead);
    } catch (err) {
      console.error('API v1 POST /leads error:', err.message);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ── Deals ──
  router.get('/deals', requireScope('deals:read'), async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, title, company, value, stage, pipeline_id AS "pipelineId", created_at AS "createdAt"
         FROM deals WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [req.tenantId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error('API v1 GET /deals error:', err.message);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/deals', requireScope('deals:write'), async (req, res) => {
    try {
      const { title, company, value, stage, pipelineId } = req.body || {};
      if (!title || !company) return res.status(400).json({ error: 'title and company are required' });
      const targetPipeline = pipelineId || (await pool.query(
        `SELECT id FROM pipelines WHERE tenant_id = $1 AND is_default = true LIMIT 1`, [req.tenantId]
      )).rows[0]?.id || 'sales';
      let targetStage = stage;
      if (targetStage) {
        const stageCheck = await pool.query(
          'SELECT 1 FROM pipeline_stages WHERE tenant_id = $1 AND pipeline_id = $2 AND id = $3',
          [req.tenantId, targetPipeline, targetStage]
        );
        if (stageCheck.rows.length === 0) return res.status(400).json({ error: `Stage "${targetStage}" does not belong to pipeline "${targetPipeline}"` });
      } else {
        targetStage = (await pool.query(
          `SELECT id FROM pipeline_stages WHERE tenant_id = $1 AND pipeline_id = $2 ORDER BY sort_order ASC LIMIT 1`,
          [req.tenantId, targetPipeline]
        )).rows[0]?.id;
      }
      if (!targetStage) return res.status(400).json({ error: 'No stage available in the target pipeline — create one first' });
      const id = `DEAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const result = await pool.query(
        `INSERT INTO deals (id, title, company, value, stage, pipeline_id, owner, tenant_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, '{}', $7, $8)
         RETURNING id, title, company, value, stage, pipeline_id AS "pipelineId", created_at AS "createdAt"`,
        [id, title, company, parseInt(value || 0, 10), targetStage, targetPipeline, req.tenantId, new Date().toISOString().split('T')[0]]
      );
      const savedDeal = result.rows[0];
      const eventPayload = { title, value: savedDeal.value, stage: savedDeal.stage };
      runWorkflows({ tenantId: req.tenantId, eventType: 'deal.created', entityType: 'deal', entityId: savedDeal.id, payload: eventPayload })
        .catch((err) => console.error('runWorkflows (api/v1 deal.created) error:', err.message));
      dispatchWebhooks({ tenantId: req.tenantId, eventType: 'deal.created', entityType: 'deal', entityId: savedDeal.id, payload: eventPayload })
        .catch((err) => console.error('dispatchWebhooks (api/v1 deal.created) error:', err.message));
      res.status(201).json(savedDeal);
    } catch (err) {
      console.error('API v1 POST /deals error:', err.message);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ── Generic event ingestion — lets an external automation tool fire a RelateFlows event by name
  // (e.g. "payment.received" style custom events aren't in VALID_TRIGGER_TYPES yet, so for now this only
  // accepts the same event vocabulary the internal app emits) without needing a dedicated endpoint. ──
  router.post('/events', requireScope('events:write'), async (req, res) => {
    try {
      const { eventType, entityType, entityId, payload } = req.body || {};
      if (!eventType || !VALID_TRIGGER_TYPES.includes(eventType)) {
        return res.status(400).json({ error: `eventType must be one of: ${VALID_TRIGGER_TYPES.join(', ')}` });
      }
      runWorkflows({ tenantId: req.tenantId, eventType, entityType: entityType || '', entityId: entityId || '', payload: payload || {} })
        .catch((err) => console.error('runWorkflows (api/v1 event) error:', err.message));
      dispatchWebhooks({ tenantId: req.tenantId, eventType, entityType: entityType || '', entityId: entityId || '', payload: payload || {} })
        .catch((err) => console.error('dispatchWebhooks (api/v1 event) error:', err.message));
      res.status(202).json({ message: 'Event accepted', eventType });
    } catch (err) {
      console.error('API v1 POST /events error:', err.message);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}

export { hashKey };
