// Outbound Webhook System — pushes RelateFlows events to external URLs (n8n, ERP, etc.) with HMAC
// signing, delivery logging, and retry-with-backoff, called fire-and-forget at the same event hook sites
// as runWorkflows() (backend/automation.js) and applyLeadScoring() (backend/leadScoring.js).
import crypto from 'crypto';
import pool from './db.js';
import { decrypt } from './crypto.js';

const DELIVERY_TIMEOUT_MS = 10000;
const MAX_ATTEMPTS = 5;
// Backoff after attempt N (1-indexed): 1m, 5m, 30m, 2h, 6h
const RETRY_BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3600_000, 6 * 3600_000];

function sign(secret, body) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function deliver(sub, deliveryId, payload) {
  const body = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json',
    'X-RelateFlows-Event': sub.event_type,
    'X-RelateFlows-Delivery': deliveryId,
  };
  if (sub.secret_encrypted) {
    try {
      headers['X-RelateFlows-Signature'] = sign(decrypt(sub.secret_encrypted), body);
    } catch (err) {
      console.error('Webhook secret decrypt error:', err.message);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
  try {
    const res = await fetch(sub.target_url, { method: 'POST', headers, body, signal: controller.signal });
    return { ok: res.ok, statusCode: res.status, error: res.ok ? null : `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, statusCode: null, error: err.name === 'AbortError' ? 'Timed out' : err.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function recordAttempt(tenantId, deliveryId, attemptCount, result) {
  const isFinalFailure = !result.ok && attemptCount >= MAX_ATTEMPTS;
  const status = result.ok ? 'success' : (isFinalFailure ? 'failed' : 'retrying');
  const nextRetryAt = !result.ok && !isFinalFailure
    ? new Date(Date.now() + (RETRY_BACKOFF_MS[attemptCount - 1] || RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]))
    : null;
  await pool.query(
    `UPDATE webhook_deliveries
     SET status = $1, attempt_count = $2, last_status_code = $3, last_error = $4, next_retry_at = $5
     WHERE id = $6 AND tenant_id = $7`,
    [status, attemptCount, result.statusCode, result.error || '', nextRetryAt, deliveryId, tenantId]
  );
}

// Called fire-and-forget right after runWorkflows() at every event hook site — same payload shape.
export async function dispatchWebhooks({ tenantId, eventType, entityType, entityId, payload }) {
  if (!tenantId || !eventType) return;
  try {
    const subsRes = await pool.query(
      `SELECT id, event_type, target_url, secret_encrypted FROM webhook_subscriptions
       WHERE tenant_id = $1 AND event_type = $2 AND status = 'active'`,
      [tenantId, eventType]
    );
    for (const sub of subsRes.rows) {
      const deliveryId = `WHD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const fullPayload = { event: eventType, entityType: entityType || '', entityId: entityId || '', data: payload || {}, timestamp: new Date().toISOString() };
      await pool.query(
        `INSERT INTO webhook_deliveries (id, tenant_id, subscription_id, event_type, payload, status, attempt_count)
         VALUES ($1, $2, $3, $4, $5, 'pending', 0)`,
        [deliveryId, tenantId, sub.id, eventType, JSON.stringify(fullPayload)]
      );
      const result = await deliver(sub, deliveryId, fullPayload);
      await recordAttempt(tenantId, deliveryId, 1, result);
    }
  } catch (err) {
    console.error('dispatchWebhooks error:', err.message);
  }
}

// Retries a single delivery on demand (manual "Retry" button) regardless of next_retry_at/attempt_count.
export async function retryDelivery(tenantId, deliveryId) {
  const delRes = await pool.query(
    `SELECT d.id, d.tenant_id, d.payload, d.attempt_count, s.id AS sub_id, s.event_type, s.target_url, s.secret_encrypted
     FROM webhook_deliveries d JOIN webhook_subscriptions s ON s.id = d.subscription_id AND s.tenant_id = d.tenant_id
     WHERE d.id = $1 AND d.tenant_id = $2`,
    [deliveryId, tenantId]
  );
  if (delRes.rows.length === 0) return null;
  const row = delRes.rows[0];
  const sub = { event_type: row.event_type, target_url: row.target_url, secret_encrypted: row.secret_encrypted };
  const result = await deliver(sub, deliveryId, row.payload);
  const nextAttempt = row.attempt_count + 1;
  await recordAttempt(tenantId, deliveryId, nextAttempt, result);
  return result;
}

// Called periodically (see server.js) alongside automation.js's runScheduledChecks().
export async function processWebhookRetries() {
  try {
    const dueRes = await pool.query(
      `SELECT d.id, d.tenant_id, d.payload, d.attempt_count, s.id AS sub_id, s.event_type, s.target_url, s.secret_encrypted
       FROM webhook_deliveries d JOIN webhook_subscriptions s ON s.id = d.subscription_id AND s.tenant_id = d.tenant_id
       WHERE d.status = 'retrying' AND d.next_retry_at <= NOW() AND d.attempt_count < $1
       LIMIT 200`,
      [MAX_ATTEMPTS]
    );
    for (const row of dueRes.rows) {
      const sub = { event_type: row.event_type, target_url: row.target_url, secret_encrypted: row.secret_encrypted };
      const result = await deliver(sub, row.id, row.payload);
      await recordAttempt(row.tenant_id, row.id, row.attempt_count + 1, result);
    }
  } catch (err) {
    console.error('processWebhookRetries error:', err.message);
  }
}
