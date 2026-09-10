// Route validation schemas — applied via validateBody middleware
// Maps method+path pattern → validation schema object

import { validate } from './validation.js';

const SCHEMAS = [
  // ── Categories ──
  [/^POST \/api\/categories$/, {
    name: { required: true, type: 'string', maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
  }],
  [/^PATCH \/api\/categories\/\d+$/, {
    name: { type: 'string', maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
  }],

  // ── Products ──
  [/^POST \/api\/products$/, {
    name: { required: true, type: 'string', maxLength: 200 },
    price: { type: 'number', min: 0 },
    quantity: { type: 'number', min: 0 },
  }],
  [/^PATCH \/api\/products\/\d+$/, {
    name: { type: 'string', maxLength: 200 },
    price: { type: 'number', min: 0 },
    quantity: { type: 'number', min: 0 },
  }],

  // ── Appointments ──
  [/^POST \/api\/appointments$/, {
    title: { required: true, type: 'string', maxLength: 200 },
    startTime: { required: true, type: 'string' },
    endTime: { required: true, type: 'string' },
  }],
  [/^PATCH \/api\/appointments\/\d+$/, {
    title: { type: 'string', maxLength: 200 },
    startTime: { type: 'string' },
    endTime: { type: 'string' },
  }],

  // ── Calendar events ──
  [/^POST \/api\/calendar\/events$/, {
    summary: { required: true, type: 'string', maxLength: 200 },
    startTime: { required: true, type: 'string' },
    endTime: { required: true, type: 'string' },
  }],
  [/^PATCH \/api\/calendar\/events\/[^/]+$/, {
    summary: { type: 'string', maxLength: 200 },
    startTime: { type: 'string' },
    endTime: { type: 'string' },
  }],
  [/^POST \/api\/calendar\/callback$/, {
    code: { required: true, type: 'string' },
  }],

  // ── Deals ──
  // NOTE: matches the real payload shape sent by CRMContext.tsx addDeal (title/company/value/stage/...) —
  // an earlier version of this schema required "name"/"contactId", fields the frontend never sends, which
  // caused every deal created through the UI to 400 and silently fall back to local-only (unpersisted) state.
  [/^POST \/api\/deals$/, {
    title: { required: true, type: 'string', maxLength: 200 },
    company: { required: true, type: 'string', maxLength: 200 },
    value: { type: 'number', min: 0 },
    assignedTo: { type: 'string', maxLength: 50 },
  }],
  [/^PATCH \/api\/deals\/[^/]+\/assign$/, {
    assignedTo: { required: true, type: 'string', maxLength: 50 },
  }],

  // ── Contacts ──
  [/^POST \/api\/contacts$/, {
    name: { required: true, type: 'string', maxLength: 200 },
    email: { type: 'email' },
    phone: { type: 'string', maxLength: 30 },
  }],

  // ── Activities ──
  // NOTE: matches the real payload shape sent by CRMContext.tsx (type/title/description/user/targetName) —
  // an earlier version of this schema required a "subject" field that the frontend never sends, which
  // caused every real activity POST (from addDeal/updateDealStage) to 400.
  [/^POST \/api\/activities$/, {
    type: { required: true, type: 'string', maxLength: 50 },
    title: { required: true, type: 'string', maxLength: 200 },
  }],

  // ── Workflows (Automation Engine) ──
  [/^POST \/api\/workflows$/, {
    title: { required: true, type: 'string', maxLength: 200 },
    triggerType: { required: true, type: 'string', maxLength: 50 },
  }],
  [/^PATCH \/api\/workflows\/[^/]+\/toggle$/, {
    active: { type: 'boolean' },
  }],

  // ── Tasks ──
  [/^POST \/api\/tasks$/, {
    title: { required: true, type: 'string', maxLength: 200 },
    description: { type: 'string', maxLength: 2000 },
    assignedTo: { type: 'string', maxLength: 50 },
  }],
  [/^PATCH \/api\/tasks\/[^/]+$/, {
    title: { type: 'string', maxLength: 200 },
    description: { type: 'string', maxLength: 2000 },
    status: { type: 'string', oneOf: ['todo', 'in_progress', 'done'] },
    assignedTo: { type: 'string', maxLength: 50 },
  }],

  // ── Tags ──
  [/^POST \/api\/tags$/, {
    name: { required: true, type: 'string', maxLength: 100 },
  }],
  [/^PATCH \/api\/tags\/\d+$/, {
    name: { type: 'string', maxLength: 100 },
  }],

  // ── Enterprise Profile ──
  [/^PUT \/api\/enterprise\/profile$/, {
    name: { type: 'string', maxLength: 200 },
    website: { type: 'string', maxLength: 500 },
  }],

  // ── Integrations ──
  [/^PUT \/api\/settings\/integrations$/, {
    provider: { type: 'string', maxLength: 100 },
  }],

  // ── Channel Management ──
  // NOTE: matches the real payload field (displayName, not name) sent by ChannelManagement.tsx.
  [/^POST \/api\/channels$/, {
    displayName: { required: true, type: 'string', maxLength: 100 },
    type: { required: true, type: 'string', maxLength: 50 },
  }],
  [/^PATCH \/api\/channels\/\d+$/, {
    displayName: { type: 'string', maxLength: 100 },
  }],

  // ── Channel Access ──
  // NOTE: matches the real payload (channelIds array, not a single channelId) sent by AccessControl.tsx.
  [/^POST \/api\/channel-access$/, {
    userId: { required: true, type: 'string' },
    channelIds: { required: true, type: 'array' },
  }],

  // ── Lead allocation ──
  // NOTE: matches the real payload field (salesPersonId, not userId) sent by CRMContext.tsx allocateLead.
  [/^POST \/api\/leads\/[^/]+\/allocate$/, {
    salesPersonId: { required: true, type: 'string' },
  }],

  // ── Leads ──
  [/^POST \/api\/leads\/[^/]+\/tags$/, {
    tagId: { required: true, type: 'number' },
  }],
  [/^PATCH \/api\/leads\/[^/]+\/allocation\/[^/]+$/, {
    userId: { type: 'string' },
    status: { type: 'string', oneOf: ['active', 'reassigned'] },
  }],

  // ── Calendar settings ──
  [/^PATCH \/api\/calendar\/calendar$/, {
    calendarId: { required: true, type: 'string', maxLength: 200 },
  }],

  // ── Deal stage update ──
  [/^PATCH \/api\/deals\/[^/]+\/stage$/, {
    stage: { required: true, type: 'string', maxLength: 100 },
  }],

  // ── Pipeline Stages ──
  [/^POST \/api\/stages$/, {
    id: { required: true, type: 'string', maxLength: 50, pattern: /^[a-zA-Z0-9_-]+$/ },
    label: { required: true, type: 'string', maxLength: 100 },
  }],
  [/^PATCH \/api\/stages\/[^/]+$/, {
    label: { type: 'string', maxLength: 100 },
    color: { type: 'string', maxLength: 20 },
  }],

  // ── Pipelines (Multiple Pipelines) ──
  [/^POST \/api\/pipelines$/, {
    id: { required: true, type: 'string', maxLength: 50, pattern: /^[a-zA-Z0-9_-]+$/ },
    name: { required: true, type: 'string', maxLength: 100 },
  }],
  [/^PATCH \/api\/pipelines\/[^/]+$/, {
    name: { type: 'string', maxLength: 100 },
    isDefault: { type: 'boolean' },
  }],

  // ── Lead Scoring Rules ──
  [/^POST \/api\/lead-scoring-rules$/, {
    label: { required: true, type: 'string', maxLength: 150 },
    eventType: { required: true, type: 'string', maxLength: 50 },
    points: { required: true, type: 'number' },
  }],
  [/^PATCH \/api\/lead-scoring-rules\/[^/]+$/, {
    label: { type: 'string', maxLength: 150 },
    points: { type: 'number' },
    status: { type: 'string', oneOf: ['active', 'paused'] },
  }],

  // ── Outbound Webhooks ──
  [/^POST \/api\/webhooks$/, {
    name: { required: true, type: 'string', maxLength: 150 },
    eventType: { required: true, type: 'string', maxLength: 50 },
    targetUrl: { required: true, type: 'string', maxLength: 2000 },
  }],
  [/^PATCH \/api\/webhooks\/[^/]+$/, {
    name: { type: 'string', maxLength: 150 },
    status: { type: 'string', oneOf: ['active', 'paused'] },
  }],

  // ── API Keys ──
  [/^POST \/api\/api-keys$/, {
    name: { required: true, type: 'string', maxLength: 150 },
    scopes: { type: 'array' },
  }],
  [/^PATCH \/api\/api-keys\/[^/]+$/, {
    status: { required: true, type: 'string', oneOf: ['active', 'revoked'] },
  }],

  // ── Leads (Unified Inbox) ──
  [/^PATCH \/api\/leads\/[^/]+$/, {
    assignedTo: { type: 'string', maxLength: 50 },
    status: { type: 'string', maxLength: 30 },
  }],

  // ── Chat Messages ──
  [/^POST \/api\/chat-messages$/, {
    leadId: { required: true, type: 'string', maxLength: 50 },
    content: { required: true, type: 'string', maxLength: 4000 },
  }],

  // ── Super Admin: create tenant ──
  [/^POST \/api\/admin\/tenants$/, {
    name: { required: true, type: 'string', maxLength: 200 },
    slug: { required: true, type: 'string', maxLength: 100, pattern: /^[a-z0-9-]+$/ },
    domain: { type: 'string', maxLength: 500 },
  }],

  // ── Admin: Custom Objects ──
  [/^POST \/api\/admin\/objects$/, {
    name: { required: true, type: 'string', maxLength: 200 },
    tableName: { required: true, type: 'string', maxLength: 100, pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/ },
  }],
  [/^PUT \/api\/admin\/objects\/[^/]+$/, {
    name: { type: 'string', maxLength: 200 },
  }],

  // ── Admin: Custom Fields ──
  [/^POST \/api\/admin\/fields$/, {
    objectId: { required: true, type: 'number' },
    name: { required: true, type: 'string', maxLength: 100 },
    fieldType: { required: true, type: 'string', maxLength: 50 },
  }],
  [/^PUT \/api\/admin\/fields\/[^/]+$/, {
    name: { type: 'string', maxLength: 100 },
  }],

  // ── Admin: Custom Records ──
  [/^POST \/api\/admin\/objects\/[^/]+\/records$/, {
    data: { required: true, type: 'object' },
  }],
  [/^PUT \/api\/admin\/records\/[^/]+$/, {
    data: { required: true, type: 'object' },
  }],
];

export function validateBody(req, res, next) {
  const key = `${req.method} ${req.baseUrl}${req.path}`;
  for (const [pattern, schema] of SCHEMAS) {
    if (pattern.test(key)) {
      return validate(schema)(req, res, next);
    }
  }
  next();
}
