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
  [/^POST \/api\/deals$/, {
    name: { required: true, type: 'string', maxLength: 200 },
    value: { type: 'number', min: 0 },
    contactId: { type: 'string' },
  }],

  // ── Contacts ──
  [/^POST \/api\/contacts$/, {
    name: { required: true, type: 'string', maxLength: 200 },
    email: { type: 'email' },
    phone: { type: 'string', maxLength: 30 },
  }],

  // ── Activities ──
  [/^POST \/api\/activities$/, {
    type: { required: true, type: 'string', maxLength: 50 },
    subject: { required: true, type: 'string', maxLength: 200 },
  }],

  // ── Workflows ──
  [/^POST \/api\/workflows$/, {
    name: { required: true, type: 'string', maxLength: 200 },
  }],
  [/^PATCH \/api\/workflows\/[^/]+\/toggle$/, {
    active: { type: 'boolean' },
  }],

  // ── Tasks ──
  [/^POST \/api\/tasks$/, {
    title: { required: true, type: 'string', maxLength: 200 },
    description: { type: 'string', maxLength: 2000 },
  }],
  [/^PATCH \/api\/tasks\/\d+$/, {
    title: { type: 'string', maxLength: 200 },
    description: { type: 'string', maxLength: 2000 },
    status: { type: 'string', oneOf: ['pending', 'in_progress', 'completed'] },
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
  [/^POST \/api\/channels$/, {
    name: { required: true, type: 'string', maxLength: 100 },
    type: { required: true, type: 'string', maxLength: 50 },
  }],
  [/^PATCH \/api\/channels\/\d+$/, {
    name: { type: 'string', maxLength: 100 },
  }],

  // ── Channel Access ──
  [/^POST \/api\/channel-access$/, {
    userId: { required: true, type: 'string' },
    channelId: { required: true, type: 'number' },
  }],

  // ── Lead allocation ──
  [/^POST \/api\/leads\/[^/]+\/allocate$/, {
    userId: { required: true, type: 'string' },
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
