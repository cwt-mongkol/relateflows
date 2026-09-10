// Lead Scoring Rule Engine — tenant-configurable point rules that fire on the same lead-related events
// as the workflow automation engine (backend/automation.js), incrementing leads.lead_score.
//
// Classification thresholds (HOT/WARM/COLD) are computed from lead_score on read, not stored — this
// mirrors the existing automation conditions that already compare a raw `leadScore` payload field.
import pool from './db.js';
import { evaluateConditions } from './conditions.js';

export function classifyScore(score) {
  const s = Number(score) || 0;
  if (s >= 70) return 'hot';
  if (s >= 40) return 'warm';
  return 'cold';
}

// Called fire-and-forget alongside runWorkflows() at the lead-related event hook sites in app.js.
// Never throws into the caller — a broken scoring rule must never break the request that triggered it.
export async function applyLeadScoring({ tenantId, eventType, entityType, entityId, payload }) {
  if (entityType !== 'lead' || !tenantId || !eventType || !entityId) return;
  try {
    const rulesRes = await pool.query(
      `SELECT points, conditions FROM lead_scoring_rules WHERE tenant_id = $1 AND event_type = $2 AND status = 'active'`,
      [tenantId, eventType]
    );
    if (rulesRes.rows.length === 0) return;

    let delta = 0;
    for (const rule of rulesRes.rows) {
      const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
      if (!evaluateConditions(payload || {}, conditions)) continue;
      delta += Number(rule.points) || 0;
    }
    if (delta === 0) return;

    await pool.query(
      'UPDATE leads SET lead_score = GREATEST(0, lead_score + $1), updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
      [delta, entityId, tenantId]
    );
  } catch (err) {
    console.error('applyLeadScoring error:', err.message);
  }
}
