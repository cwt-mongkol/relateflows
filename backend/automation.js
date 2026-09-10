// Automation Engine v1 — structured trigger/condition/action execution + a scheduled-check runner.
//
// Design boundary: actions write directly to their target tables and never re-emit events back into
// runWorkflows(). This keeps execution single-pass and avoids cascading/looping automations (e.g. a
// "move deal stage" action would otherwise be able to re-trigger a "deal.stage_changed" workflow).
import pool from './db.js';
import { evaluateConditions } from './conditions.js';

const VALID_TRIGGER_TYPES = [
  'lead.created',
  'lead.message_received',
  'lead.allocated',
  'deal.created',
  'deal.stage_changed',
  'deal.won',
  'task.completed',
  'schedule.lead_no_reply',
];

const VALID_ACTION_TYPES = ['create_task', 'send_notification', 'assign_lead', 'add_tag', 'move_deal_stage'];

async function getUserBrief(userId) {
  if (!userId) return { name: 'Unassigned', avatar: '' };
  try {
    const res = await pool.query('SELECT name, avatar FROM users WHERE id = $1', [userId]);
    if (res.rows.length === 0) return { name: 'Unassigned', avatar: '' };
    return { name: res.rows[0].name, avatar: res.rows[0].avatar || '' };
  } catch {
    return { name: 'Unassigned', avatar: '' };
  }
}

async function actionCreateTask(tenantId, entityType, entityId, payload, params) {
  const { title, dueInDays, priority, assigneeUserId } = params || {};
  const dueDate = new Date(Date.now() + (Number(dueInDays) || 1) * 86400000).toISOString().split('T')[0];
  const id = `TSK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const assignee = await getUserBrief(assigneeUserId);
  const relatedTo = entityType === 'deal' || entityType === 'lead'
    ? { type: entityType === 'deal' ? 'deal' : 'contact', id: entityId, label: payload.title || payload.name || entityId }
    : null;
  await pool.query(
    `INSERT INTO tasks (id, title, description, priority, status, due_date, assignee, related_to, tenant_id)
     VALUES ($1, $2, '', $3, 'todo', $4, $5, $6, $7)`,
    [id, title || 'Follow up', priority || 'medium', dueDate, JSON.stringify(assignee), JSON.stringify(relatedTo), tenantId]
  );
  return { type: 'create_task', status: 'done', detail: { taskId: id } };
}

async function actionSendNotification(tenantId, entityType, entityId, payload, params) {
  const { message, userId } = params || {};
  const targetUserId = userId || payload.assignedTo || null;
  if (!targetUserId) return { type: 'send_notification', status: 'skipped', detail: 'No target user (set userId, or the entity has no assignee)' };
  const id = `NTF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await pool.query(
    `INSERT INTO notifications (id, tenant_id, user_id, type, title, body, entity_type, entity_id)
     VALUES ($1, $2, $3, 'automation', $4, $5, $6, $7)`,
    [id, tenantId, targetUserId, 'Automation triggered', message || 'A workflow was triggered', entityType || '', entityId || '']
  );
  return { type: 'send_notification', status: 'done', detail: { notificationId: id, userId: targetUserId } };
}

async function actionAssignLead(tenantId, entityType, entityId, _payload, params) {
  if (entityType !== 'lead') return { type: 'assign_lead', status: 'skipped', detail: 'Not a lead event' };
  const { userId } = params || {};
  if (!userId) return { type: 'assign_lead', status: 'skipped', detail: 'No userId configured' };
  await pool.query('UPDATE leads SET assigned_to = $1, is_allocated = true, updated_at = NOW() WHERE id = $2 AND tenant_id = $3', [userId, entityId, tenantId]);
  return { type: 'assign_lead', status: 'done', detail: { userId } };
}

async function actionAddTag(tenantId, entityType, entityId, _payload, params) {
  if (entityType !== 'lead') return { type: 'add_tag', status: 'skipped', detail: 'Not a lead event' };
  const { tagId } = params || {};
  if (!tagId) return { type: 'add_tag', status: 'skipped', detail: 'No tagId configured' };
  await pool.query('INSERT INTO lead_tags (lead_id, tag_id, tenant_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [entityId, tagId, tenantId]);
  return { type: 'add_tag', status: 'done', detail: { tagId } };
}

async function actionMoveDealStage(tenantId, entityType, entityId, _payload, params) {
  if (entityType !== 'deal') return { type: 'move_deal_stage', status: 'skipped', detail: 'Not a deal event' };
  const { stageId } = params || {};
  if (!stageId) return { type: 'move_deal_stage', status: 'skipped', detail: 'No stageId configured' };
  // The target stage must belong to the deal's own pipeline — stage ids are only unique per
  // (tenant, pipeline) since multiple pipelines shipped, so a saved workflow pointing at a stage from a
  // different pipeline must no-op instead of silently moving the deal into an unrelated pipeline's column.
  const dealRes = await pool.query('SELECT pipeline_id AS "pipelineId" FROM deals WHERE id = $1 AND tenant_id = $2', [entityId, tenantId]);
  const pipelineId = dealRes.rows[0]?.pipelineId;
  if (!pipelineId) return { type: 'move_deal_stage', status: 'skipped', detail: 'Deal not found' };
  const stageRes = await pool.query(
    'SELECT 1 FROM pipeline_stages WHERE tenant_id = $1 AND pipeline_id = $2 AND id = $3',
    [tenantId, pipelineId, stageId]
  );
  if (stageRes.rows.length === 0) {
    return { type: 'move_deal_stage', status: 'skipped', detail: `Stage "${stageId}" is not in this deal's pipeline` };
  }
  await pool.query('UPDATE deals SET stage = $1 WHERE id = $2 AND tenant_id = $3', [stageId, entityId, tenantId]);
  return { type: 'move_deal_stage', status: 'done', detail: { stageId } };
}

const ACTION_EXECUTORS = {
  create_task: actionCreateTask,
  send_notification: actionSendNotification,
  assign_lead: actionAssignLead,
  add_tag: actionAddTag,
  move_deal_stage: actionMoveDealStage,
};

async function executeAndLog(wf, tenantId, eventType, entityType, entityId, payload) {
  try {
    const actions = Array.isArray(wf.actions) ? wf.actions : [];
    const actionsTaken = [];
    for (const action of actions) {
      const executor = ACTION_EXECUTORS[action?.type];
      if (!executor) {
        actionsTaken.push({ type: action?.type || 'unknown', status: 'skipped', detail: 'Unknown action type' });
        continue;
      }
      actionsTaken.push(await executor(tenantId, entityType, entityId, payload, action.params || {}));
    }
    const execId = `WFX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await pool.query(
      `INSERT INTO workflow_executions (id, tenant_id, workflow_id, event_type, status, actions_taken, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, 'success', $5, $6, $7)`,
      [execId, tenantId, wf.id, eventType, JSON.stringify(actionsTaken), entityType || '', entityId || '']
    );
    await pool.query(
      'UPDATE workflows SET executions_count = executions_count + 1, last_executed = $1 WHERE id = $2',
      [new Date().toISOString(), wf.id]
    );
  } catch (err) {
    console.error(`Workflow ${wf.id} execution error:`, err.message);
    try {
      const execId = `WFX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await pool.query(
        `INSERT INTO workflow_executions (id, tenant_id, workflow_id, event_type, status, error_message, entity_type, entity_id)
         VALUES ($1, $2, $3, $4, 'error', $5, $6, $7)`,
        [execId, tenantId, wf.id, eventType, err.message, entityType || '', entityId || '']
      );
    } catch { /* logging the failure failed too — nothing more we can do */ }
  }
}

// Called synchronously from mutating routes (webhook, deal/task/lead routes) right after their own
// work succeeds. Always wrapped in try/catch internally — a broken workflow must never break the
// request that triggered it.
export async function runWorkflows({ tenantId, eventType, entityType, entityId, payload }) {
  if (!tenantId || !eventType) return;
  try {
    const wfRes = await pool.query(
      `SELECT id, actions, conditions FROM workflows WHERE tenant_id = $1 AND trigger_type = $2 AND status = 'active'`,
      [tenantId, eventType]
    );
    for (const wf of wfRes.rows) {
      const conditions = Array.isArray(wf.conditions) ? wf.conditions : [];
      if (!evaluateConditions(payload || {}, conditions)) continue;
      await executeAndLog(wf, tenantId, eventType, entityType, entityId, payload || {});
    }
  } catch (err) {
    console.error('runWorkflows error:', err.message);
  }
}

// Called periodically by a cron job (see server.js). Only handles the one built-in time-based trigger,
// "lead hasn't been replied to" — the condition's "hoursSinceLastMessage" threshold is configured as an
// ordinary condition row (e.g. { field: 'hoursSinceLastMessage', operator: 'gte', value: 24 }), reusing
// the same evaluator as event-driven triggers instead of a bespoke schedule-config column.
export async function runScheduledChecks() {
  try {
    const wfRes = await pool.query(
      `SELECT id, tenant_id, actions, conditions FROM workflows WHERE trigger_type = 'schedule.lead_no_reply' AND status = 'active'`
    );
    if (wfRes.rows.length === 0) return;

    const leadsRes = await pool.query(
      `SELECT id, tenant_id, name, channel, status, lead_score, assigned_to, last_message_time
       FROM leads WHERE last_message_time IS NOT NULL AND status NOT IN ('contacted', 'closed')`
    );

    const now = Date.now();
    for (const wf of wfRes.rows) {
      const conditions = Array.isArray(wf.conditions) ? wf.conditions : [];
      const tenantLeads = leadsRes.rows.filter((l) => l.tenant_id === wf.tenant_id);
      for (const lead of tenantLeads) {
        const hoursSinceLastMessage = (now - new Date(lead.last_message_time).getTime()) / 3600000;
        const payload = {
          leadScore: lead.lead_score,
          channel: lead.channel,
          status: lead.status,
          assignedTo: lead.assigned_to,
          hoursSinceLastMessage,
        };
        if (!evaluateConditions(payload, conditions)) continue;

        // Dedup: don't re-fire for the same lead within a 20-hour cooldown
        const recent = await pool.query(
          `SELECT 1 FROM workflow_executions WHERE workflow_id = $1 AND entity_id = $2 AND created_at > NOW() - INTERVAL '20 hours' LIMIT 1`,
          [wf.id, lead.id]
        );
        if (recent.rows.length > 0) continue;

        await executeAndLog(wf, wf.tenant_id, 'schedule.lead_no_reply', 'lead', lead.id, payload);
      }
    }
  } catch (err) {
    console.error('runScheduledChecks error:', err.message);
  }
}

// Builds the human-readable "trigger"/"action" summary strings the existing WorkflowsView cards render,
// generated from the structured fields so the UI stays truthful without needing a rewrite.
const TRIGGER_LABELS = {
  'lead.created': 'New lead received',
  'lead.message_received': 'Lead sends a message',
  'lead.allocated': 'Lead is allocated to a sales rep',
  'deal.created': 'New deal created',
  'deal.stage_changed': 'Deal moves to a stage',
  'deal.won': 'Deal is marked Closed Won',
  'task.completed': 'Task is completed',
  'schedule.lead_no_reply': 'Lead has not replied for N hours',
};

const OPERATOR_LABELS = { eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤', contains: 'contains' };

export function summarizeTrigger(triggerType, conditions) {
  const base = TRIGGER_LABELS[triggerType] || triggerType || 'Unknown trigger';
  if (!Array.isArray(conditions) || conditions.length === 0) return base;
  const condText = conditions.map((c) => `${c.field} ${OPERATOR_LABELS[c.operator] || c.operator} ${c.value}`).join(' AND ');
  return `${base}, if ${condText}`;
}

const ACTION_LABELS = {
  create_task: (p) => `Create task "${p.title || 'Follow up'}"`,
  send_notification: (p) => `Notify${p.userId ? ' user' : ' owner'}: "${p.message || 'Workflow triggered'}"`,
  assign_lead: (p) => `Assign lead to ${p.userId || '(unset)'}`,
  add_tag: (p) => `Tag lead #${p.tagId || '(unset)'}`,
  move_deal_stage: (p) => `Move deal to stage "${p.stageId || '(unset)'}"`,
};

export function summarizeActions(actions) {
  if (!Array.isArray(actions) || actions.length === 0) return 'No actions configured';
  return actions.map((a) => (ACTION_LABELS[a.type] ? ACTION_LABELS[a.type](a.params || {}) : a.type)).join(' + ');
}

export { VALID_TRIGGER_TYPES, VALID_ACTION_TYPES };
