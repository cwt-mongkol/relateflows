import pool from './db.js';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const DEFAULT_CHATBOT_CONFIG = {
  enabled: false,
  autoRespond: false,
  timezone: 'Asia/Bangkok',
  botName: 'AI Assistant',
  personality: 'friendly',
  responseStyle: 'balanced',
  language: 'auto',
  customInstructions: '',
  greetingMessage: 'สวัสดีครับ 👋 ยินดีต้อนรับ! มีอะไรให้ฉันช่วยไหมคะ/ครับ?\nHello! Welcome! How can I help you today?',
  fallbackMessage: 'ขออภัย ฉันไม่สามารถตอบคำถามนี้ได้ในขณะนี้ เดี๋ยวจะมีทีมงานมาตอบกลับนะคะ/ครับ 🙏\nI could not answer this question. A human agent will get back to you shortly.',
  schedule: {
    monday:    [{ start: '09:00', end: '18:00' }],
    tuesday:   [{ start: '09:00', end: '18:00' }],
    wednesday: [{ start: '09:00', end: '18:00' }],
    thursday:  [{ start: '09:00', end: '18:00' }],
    friday:    [{ start: '09:00', end: '18:00' }],
    saturday:  [],
    sunday:    [],
  },
};

const GREETINGS = [
  /^(hello|hi|hey|สวัสดี|หวัดดี|halo|hola)(\s|$)/i,
  /^(good\s+morning|good\s+afternoon|good\s+evening)/i,
];

const FAREWELLS = [
  /^(bye|goodbye|ลาก่อน|บ๊ายบาย|see\s+ya|thanks?\s*(bye)?)$/i,
];

const INTENT_PATTERNS = [
  {
    intent: 'deal_summary',
    patterns: [
      /(how many|count|number of|all|list|show|ดู|แสดง|รายการ).*(deal|deals|pipeline|opportunit|ข้อเสนอ|ดีล)/i,
      /(deal|deals|pipeline).*(overview|summary|status|count|list|show|all)/i,
      /pipeline\s*(value|total|worth)/i,
      /มูลค่า(รวม|pipeline|ดีล)/i,
    ],
  },
  {
    intent: 'deal_by_stage',
    patterns: [
      /(deal|deals|ดีล).*(stage|ขั้นตอน|ใน)\s+\w+/i,
      /(stage|ขั้นตอน)\s+\w+.*(deal|deals|ดีล)/i,
      /deals\s+(in|at|for)\s+\w+/i,
      /what.*(stage|step).*(deal|ดีล)/i,
    ],
  },
  {
    intent: 'product_list',
    patterns: [
      /(product|products|สินค้า|service|services|บริการ).*(list|all|show|ดู|รายการ|what)/i,
      /(list|show|รายการ|all|ทั้งหมด).*(product|สินค้า|service|บริการ)/i,
      /what.*(product|สินค้า|service|บริการ).*(have|available|มี)/i,
    ],
  },
  {
    intent: 'contact_lookup',
    patterns: [
      /(contact|contacts|ติดต่อ|คน|person|ผู้ติดต่อ).*(list|all|show|ดู|รายการ|who|find)/i,
      /(who|find|search|หา|ดู).*(contact|คน|ติดต่อ|contact)/i,
      /show me (all |the )?contacts/i,
    ],
  },
  {
    intent: 'high_priority',
    patterns: [
      /(high|urgent|สำคัญ|เร่งด่วน|top).*(priority|deal|pipeline|ดีล)/i,
      /(priority|สำคัญ).*(high|urgent|สูง)/i,
      /most\s*(important|urgent|valuable).*(deal|pipeline)/i,
      /deals?\s*(with|that\s+are)\s*(high|urgent)/i,
    ],
  },
  {
    intent: 'pipeline_value',
    patterns: [
      /(total|all|รวม|sum|มูลค่ารวม).*(pipeline|deal|value|มูลค่า|ดีล)/i,
      /(pipeline|deal|ดีล).*(value|มูลค่า|total|รวม)/i,
      /how much.*(pipeline|deal)/i,
      /มูลค่า.*(pipeline|ทั้งหมด)/i,
    ],
  },
  {
    intent: 'workflow_status',
    patterns: [
      /(workflow|automation|automate|workflows).*(status|active|running|all|list|show)/i,
      /(how many|count).*(workflow|automation)/i,
      /what workflows/i,
      /active workflows/i,
    ],
  },
  {
    intent: 'recent_activity',
    patterns: [
      /(recent|latest|เมื่อกี้|ล่าสุด|new).*(activity|activities|action|update)/i,
      /what.*(happen|change|update|เกิดขึ้น).*(recent|lately|เมื่อ)?/i,
      /(activity|activities).*(last|recent|today|yesterday)/i,
    ],
  },
  {
    intent: 'analytics_summary',
    patterns: [
      /(analytics|dashboard|summary|ภาพรวม|report|รายงาน).*(overview|show|all|วันนี้|เดือนนี้)/i,
      /how is (the )?(business|company|performance|ผลงาน)/i,
      /summary of (the )?(business|company)/i,
    ],
  },
  {
    intent: 'help',
    patterns: [
      /^(help|ช่วย|what can you do|what do you do|command|capabilities)/i,
      /what (are |is )?(your|the) (commands|features|capabilities)/i,
    ],
  },
  {
    intent: 'expected_close',
    patterns: [
      /(expected|预计|预计|預計|target|cílové|expected_close_date).*(close|date|due|ปิด)/i,
      /(close|closing|ปิด|due).*(date|when|expected|預計|คาดว่า)/i,
      /when.*(close|ปิด|due|will|expected)/i,
      /(deal|deals).*(due|closing\s+soon|this\s+(week|month))/i,
    ],
  },
  {
    intent: 'super_admin',
    patterns: [
      /(all companies|all tenants|ทั้งระบบ|ทุกบริษัท|cross.?tenant|overall|ภาพรวมระบบ)/i,
      /(compare|เปรียบเทียบ).*(company|tenant|บริษัท)/i,
      /which (company|tenant).*(best|most|ดีที่สุด|highest)/i,
    ],
  },
  {
    intent: 'talk_to_sales',
    patterns: [
      /(talk|speak|contact).*(sales|agent|person|human|คน|พนักงาน)/i,
      /(want|need|ขอ|ต้องการ).*(sales|agent|human|person|พนักงานขาย|คุย)/i,
      /(connect|allocate|assign|assign|ส่งต่อ).*(sales|ฝ่ายขาย|พนักงานขาย)/i,
      /(sales|ฝ่ายขาย).*(help|assist|contact|ช่วย|ติดต่อ)/i,
      /i want to buy|สนใจซื้อ|interested in/i,
      /(consult|ปรึกษา|สอบถาม).*(เพิ่มเติม|sales|purchase|ซื้อ)/i,
      /can you (connect|transfer|forward).*(sales|agent|team)/i,
    ],
  },
];

const RESPONSE_TEMPLATES = {
  greeting: (name) => `สวัสดีครับ${name ? ' ' + name : ''}! 👋 I'm your RelateFlows AI assistant. I can help you with your sales pipeline, products, contacts, and more. What would you like to know?`,

  farewell: 'Thanks for chatting! Feel free to come back anytime you need help. 😊',

  help: `Here's what I can help you with:

📊 **Pipeline & Deals** — "Show all deals", "What's in the pipeline?", "High priority deals"
📦 **Products** — "List all products", "What products do we have?"
👥 **Contacts** — "Show contacts", "Who are our contacts?"
⚡ **Workflows** — "What workflows are active?", "Show workflows"
📈 **Analytics** — "Give me a summary", "How's the business doing?"
🔍 **Search** — "Find deals closing this month"

Try asking me anything about your data!`,

  no_results: (topic) => `I couldn't find any ${topic} for your company right now.`,

  error: 'I encountered an error while processing your request. Please try again later.',
};

function detectIntent(message) {
  const trimmed = message.trim();

  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) return intent;
    }
  }

  if (GREETINGS.some(p => p.test(trimmed))) return 'greeting';
  if (FAREWELLS.some(p => p.test(trimmed))) return 'farewell';

  return 'general';
}

function extractEntities(message) {
  const entities = {};

  const stageMatch = message.match(/(\w+)\s*(stage|step|ขั้นตอน)/i);
  if (stageMatch) entities.stage = stageMatch[1].toLowerCase();

  const priorityMatch = message.match(/(high|medium|low|urgent|สำคัญ|เร่งด่วน)/i);
  if (priorityMatch) entities.priority = priorityMatch[1].toLowerCase();

  const limitMatch = message.match(/(\d+)\s*(last|recent|lately|ล่าสุด)/i);
  if (limitMatch) entities.limit = parseInt(limitMatch[1]);

  return entities;
}

function formatCurrency(val) {
  if (val === null || val === undefined) return '$0';
  return '$' + Number(val).toLocaleString('en-US');
}

function formatDealLine(d) {
  return `• **${d.title}** — ${formatCurrency(d.value)} (${d.stage}, ${d.probability}%)`;
}

async function queryDeals(tenantId, isSuperAdmin, entities) {
  const params = [];
  let where = [];
  if (tenantId && !isSuperAdmin) {
    where.push('tenant_id = $' + (params.length + 1));
    params.push(tenantId);
  }

  const stage = entities?.stage;
  const priority = entities?.priority;

  if (stage) {
    where.push('LOWER(stage) = $' + (params.length + 1));
    params.push(stage);
  }
  if (priority) {
    where.push('LOWER(priority) = $' + (params.length + 1));
    params.push(priority);
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT id, title, company, value, stage, probability, priority, contact_name, created_at, expected_close_date
     FROM deals ${whereClause} ORDER BY created_at DESC NULLS LAST LIMIT 20`,
    params
  );
  return rows;
}

async function queryPipelineValue(tenantId, isSuperAdmin) {
  const params = [];
  let where = '';
  if (tenantId && !isSuperAdmin) {
    where = 'WHERE tenant_id = $1';
    params.push(tenantId);
  }
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(value), 0) AS total_value,
            COALESCE(AVG(value), 0) AS avg_value,
            COUNT(*) FILTER (WHERE stage = 'closed_won') AS won,
            COUNT(*) FILTER (WHERE stage = 'closed_lost') AS lost
     FROM deals ${where}`,
    params
  );
  return rows[0];
}

async function queryDealsByStage(tenantId, isSuperAdmin) {
  const params = [];
  let where = '';
  if (tenantId && !isSuperAdmin) {
    where = 'WHERE tenant_id = $1';
    params.push(tenantId);
  }
  const { rows } = await pool.query(
    `SELECT stage, COUNT(*)::int AS count, COALESCE(SUM(value), 0) AS total_value
     FROM deals ${where} GROUP BY stage ORDER BY count DESC`,
    params
  );
  return rows;
}

async function queryProducts(tenantId, isSuperAdmin) {
  const params = [];
  let where = '';
  if (tenantId && !isSuperAdmin) {
    where = 'WHERE p.tenant_id = $1';
    params.push(tenantId);
  }
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.quantity, p.price, p.status, p.description,
            COALESCE(c.name, 'Uncategorized') AS category
     FROM tb_products p LEFT JOIN tb_categories c ON p.category_id = c.id ${where}
     ORDER BY p.created_at DESC LIMIT 20`,
    params
  );
  return rows;
}

async function queryContacts(tenantId, isSuperAdmin) {
  const params = [];
  let where = '';
  if (tenantId && !isSuperAdmin) {
    where = 'WHERE tenant_id = $1';
    params.push(tenantId);
  }
  const { rows } = await pool.query(
    `SELECT id, name, email, company, role, lifecycle_stage, lead_score, status, last_contacted
     FROM contacts ${where} ORDER BY lead_score DESC NULLS LAST LIMIT 20`,
    params
  );
  return rows;
}

async function queryWorkflows(tenantId, isSuperAdmin) {
  const params = [];
  let where = '';
  if (tenantId && !isSuperAdmin) {
    where = 'WHERE tenant_id = $1';
    params.push(tenantId);
  }
  const { rows } = await pool.query(
    `SELECT id, title, description, status, executions_count, last_executed, category
     FROM workflows ${where} ORDER BY executions_count DESC LIMIT 20`,
    params
  );
  return rows;
}

async function queryRecentActivities(tenantId, isSuperAdmin, limit = 10) {
  const params = [limit];
  let where = '';
  if (tenantId && !isSuperAdmin) {
    where = 'WHERE tenant_id = $' + (params.length + 1);
    params.push(tenantId);
  }
  const { rows } = await pool.query(
    `SELECT id, type, title, description, timestamp, target_name
     FROM activities ${where} ORDER BY created_at DESC NULLS LAST LIMIT $1`,
    params
  );
  return rows;
}

async function queryCrossTenantSummary() {
  const { rows } = await pool.query(`
    SELECT tc.name AS company_name, tc.slug,
      (SELECT COUNT(*) FROM deals d WHERE d.tenant_id = tc.id) AS deal_count,
      (SELECT COALESCE(SUM(value), 0) FROM deals d WHERE d.tenant_id = tc.id) AS pipeline_value,
      (SELECT COUNT(*) FROM contacts c WHERE c.tenant_id = tc.id) AS contact_count,
      (SELECT COUNT(*) FROM tb_products p WHERE p.tenant_id = tc.id) AS product_count,
      (SELECT COUNT(*) FROM workflows w WHERE w.tenant_id = tc.id AND w.status = 'active') AS active_workflows
    FROM tenant_companies tc
    WHERE tc.status = 'active'
    ORDER BY pipeline_value DESC
  `);
  return rows;
}

async function queryKnowledgeChunks(tenantId, isSuperAdmin, query) {
  const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (keywords.length === 0) return [];

  const params = [];
  let where = '';
  if (tenantId && !isSuperAdmin) {
    where = 'AND tenant_id = $' + (params.length + 1);
    params.push(tenantId);
  }

  const conditions = keywords.map((_, i) => {
    const idx = params.length + 1;
    params.push(`%${keywords[i]}%`);
    return `(title ILIKE $${idx} OR content ILIKE $${idx})`;
  });

  const { rows } = await pool.query(
    `SELECT source_type, source_id, title, content FROM knowledge_chunks
     WHERE (${conditions.join(' OR ')}) ${where} ORDER BY created_at DESC LIMIT 5`,
    params
  );
  return rows;
}

async function trainKnowledge(tenantId) {
  const sourceTables = [
    {
      type: 'deal',
      query: `SELECT id, title, company, value, stage, probability, priority,
                     contact_name, contact_email, notes, tags
              FROM deals WHERE tenant_id = $1`,
      generate: (r) => ({
        title: `Deal: ${r.title}`,
        content: `Deal "${r.title}" for company ${r.company}, value ${formatCurrency(r.value)}, ` +
                 `stage: ${r.stage}, probability: ${r.probability}%, priority: ${r.priority || 'not set'}. ` +
                 `Contact: ${r.contact_name || 'N/A'} (${r.contact_email || 'N/A'}). ` +
                 (r.notes ? `Notes: ${r.notes}. ` : '') +
                 (r.tags?.length ? `Tags: ${r.tags.join(', ')}.` : ''),
        keywords: [r.title, r.company, r.stage, r.priority, r.contact_name].filter(Boolean),
      }),
    },
    {
      type: 'product',
      query: `SELECT p.id, p.name, p.quantity, p.price, p.status, p.description,
                     COALESCE(c.name, 'Uncategorized') AS category
              FROM tb_products p LEFT JOIN tb_categories c ON p.category_id = c.id
              WHERE p.tenant_id = $1`,
      generate: (r) => ({
        title: `Product: ${r.name}`,
        content: `Product "${r.name}", category: ${r.category}, price: ${formatCurrency(r.price)}, ` +
                 `quantity: ${r.quantity || 0}, status: ${r.status || 'N/A'}. ` +
                 (r.description ? `Description: ${r.description}.` : ''),
        keywords: [r.name, r.category, r.status].filter(Boolean),
      }),
    },
    {
      type: 'workflow',
      query: `SELECT id, title, description, status, category FROM workflows WHERE tenant_id = $1`,
      generate: (r) => ({
        title: `Workflow: ${r.title}`,
        content: `Workflow "${r.title}" (${r.status}), category: ${r.category || 'N/A'}. ` +
                 (r.description ? `Description: ${r.description}.` : ''),
        keywords: [r.title, r.category, r.status].filter(Boolean),
      }),
    },
    {
      type: 'contact',
      query: `SELECT id, name, email, company, role, lifecycle_stage, lead_score, status
              FROM contacts WHERE tenant_id = $1`,
      generate: (r) => ({
        title: `Contact: ${r.name}`,
        content: `Contact "${r.name}", email: ${r.email}, company: ${r.company || 'N/A'}, ` +
                 `role: ${r.role || 'N/A'}, lifecycle stage: ${r.lifecycle_stage || 'N/A'}, ` +
                 `lead score: ${r.lead_score || 0}, status: ${r.status || 'N/A'}.`,
        keywords: [r.name, r.email, r.company, r.role].filter(Boolean),
      }),
    },
  ];

  await pool.query('DELETE FROM knowledge_chunks WHERE tenant_id = $1', [tenantId]);

  for (const source of sourceTables) {
    const { rows } = await pool.query(source.query, [tenantId]);
    for (const row of rows) {
      const { title, content, keywords } = source.generate(row);
      await pool.query(
        `INSERT INTO knowledge_chunks (tenant_id, source_type, source_id, title, content, keywords)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tenantId, source.type, row.id, title, content, keywords]
      );
    }
  }

  return { trained: true, chunks: await pool.query('SELECT COUNT(*)::int AS count FROM knowledge_chunks WHERE tenant_id = $1', [tenantId]).then(r => r.rows[0].count) };
}

async function getSuggestedQuestions(tenantId, isSuperAdmin) {
  const pipeline = await queryPipelineValue(tenantId, isSuperAdmin);
  const dealCount = parseInt(pipeline.count) || 0;
  const totalValue = parseFloat(pipeline.total_value) || 0;

  const suggestions = [
    'Show all deals',
    'What is the pipeline value?',
    'List my products',
    'Show active workflows',
  ];

  if (dealCount > 0) {
    suggestions.push(`Show deals in ${Math.random() > 0.5 ? 'proposal stage' : 'negotiation stage'}`);
    suggestions.push('High priority deals');
    suggestions.push('Deals closing soon');
  }
  if (totalValue > 100000) {
    suggestions.push('Give me a business summary');
  }

  if (isSuperAdmin) {
    suggestions.push('Compare all companies');
    suggestions.push('Show overall system summary');
  }

  return [...new Set(suggestions)].slice(0, 8);
}

function isSuperAdminRequest(req) {
  return req.user?.role_id === 1 && req.body?.mode === 'global';
}

async function handleGeneralQuery(message, tenantId, isSuperAdmin, intent) {
  const knowledge = await queryKnowledgeChunks(tenantId, isSuperAdmin, message);
  if (knowledge.length > 0) {
    const sorted = knowledge.sort((a, b) => {
      const aScore = (a.title.toLowerCase().includes(message.toLowerCase()) ? 2 : 0) +
                     (a.content.toLowerCase().includes(message.toLowerCase()) ? 1 : 0);
      const bScore = (b.title.toLowerCase().includes(message.toLowerCase()) ? 2 : 0) +
                     (b.content.toLowerCase().includes(message.toLowerCase()) ? 1 : 0);
      return bScore - aScore;
    });
    const top = sorted.slice(0, 3);
    let response = `Based on what I know about your data:\n\n`;
    for (const t of top) {
      response += `**${t.title}**\n${t.content}\n\n`;
    }
    response += `_Tip: Try asking more specifically about deals, products, contacts, or workflows._`;
    return response;
  }

  return `I'm not sure about that. Here are some things you can ask me:\n\n` +
         `• "Show all deals"\n• "What's the pipeline value?"\n• "List products"\n` +
         `• "Show contacts"\n• "Active workflows"\n• "Business summary"`;
}

async function processMessage(message, req) {
  const tenantId = isSuperAdminRequest(req) ? null : (req.tenantId || req.user?.tenant_id);
  const isSuperAdmin = req.user?.role_id === 1 && req.body?.mode === 'global';
  const intent = detectIntent(message);
  const entities = extractEntities(message);

  try {
    switch (intent) {
      case 'greeting': {
        return RESPONSE_TEMPLATES.greeting(req.user?.name);
      }

      case 'farewell': {
        return RESPONSE_TEMPLATES.farewell;
      }

      case 'help': {
        return RESPONSE_TEMPLATES.help;
      }

      case 'deal_summary': {
        const deals = await queryDeals(tenantId, isSuperAdmin, entities);
        if (deals.length === 0) return RESPONSE_TEMPLATES.no_results('deals');
        let response = `Here are the deals I found:\n\n`;
        for (const d of deals.slice(0, 15)) {
          response += formatDealLine(d) + '\n';
        }
        if (deals.length > 15) response += `\n...and ${deals.length - 15} more.`;
        return response;
      }

      case 'deal_by_stage': {
        const stageDeals = await queryDeals(tenantId, isSuperAdmin, entities);
        const stageName = entities.stage || 'all';
        if (stageDeals.length === 0) return `No deals found for stage "${stageName}".`;
        let response = `Deals in **${stageName}** stage:\n\n`;
        for (const d of stageDeals.slice(0, 15)) {
          response += formatDealLine(d) + '\n';
        }
        return response;
      }

      case 'high_priority': {
        const highDeals = await queryDeals(tenantId, isSuperAdmin, { ...entities, priority: 'high' });
        if (highDeals.length === 0) return 'No high priority deals right now. Great focus! 🎯';
        let response = `**High Priority Deals** 🔥\n\n`;
        for (const d of highDeals) {
          response += formatDealLine(d) + '\n';
        }
        return response;
      }

      case 'pipeline_value': {
        const pv = await queryPipelineValue(tenantId, isSuperAdmin);
        const stages = await queryDealsByStage(tenantId, isSuperAdmin);
        let response = `**Pipeline Overview** 📊\n\n`;
        response += `• **Total Deals:** ${pv.count}\n`;
        response += `• **Total Pipeline Value:** ${formatCurrency(pv.total_value)}\n`;
        response += `• **Average Deal Size:** ${formatCurrency(Math.round(pv.avg_value))}\n`;
        response += `• **Closed Won:** ${pv.won}\n`;
        response += `• **Closed Lost:** ${pv.lost}\n\n`;
        if (stages.length > 0) {
          response += `**By Stage:**\n`;
          for (const s of stages) {
            response += `• ${s.stage}: ${s.count} deals (${formatCurrency(s.total_value)})\n`;
          }
        }
        return response;
      }

      case 'product_list': {
        const products = await queryProducts(tenantId, isSuperAdmin);
        if (products.length === 0) return RESPONSE_TEMPLATES.no_results('products');
        let response = `**Products** 📦\n\n`;
        for (const p of products.slice(0, 15)) {
          response += `• **${p.name}** — ${formatCurrency(p.price)} (Qty: ${p.quantity || 0}, Status: ${p.status || 'N/A'})\n`;
          if (p.description) response += `  _${p.description}_\n`;
        }
        return response;
      }

      case 'contact_lookup': {
        const contacts = await queryContacts(tenantId, isSuperAdmin);
        if (contacts.length === 0) return RESPONSE_TEMPLATES.no_results('contacts');
        let response = `**Contacts** 👥\n\n`;
        for (const c of contacts.slice(0, 15)) {
          response += `• **${c.name}** — ${c.email} (${c.company || 'N/A'}, Score: ${c.lead_score || 0})\n`;
        }
        return response;
      }

      case 'workflow_status': {
        const wfs = await queryWorkflows(tenantId, isSuperAdmin);
        if (wfs.length === 0) return RESPONSE_TEMPLATES.no_results('workflows');
        let response = `**Workflows** ⚡\n\n`;
        for (const w of wfs.slice(0, 15)) {
          const statusIcon = w.status === 'active' ? '✅' : w.status === 'paused' ? '⏸️' : '❌';
          response += `${statusIcon} **${w.title}** — ${w.status} (${w.executions_count || 0} executions)\n`;
          if (w.category) response += `  _Category: ${w.category}_\n`;
        }
        return response;
      }

      case 'recent_activity': {
        const activities = await queryRecentActivities(tenantId, isSuperAdmin, 10);
        if (activities.length === 0) return 'No recent activities found.';
        let response = `**Recent Activities** 🔄\n\n`;
        for (const a of activities) {
          response += `• **${a.title}** (${a.type})\n  ${a.description || ''}\n  _${a.timestamp || ''}_\n`;
        }
        return response;
      }

      case 'analytics_summary': {
        const pv = await queryPipelineValue(tenantId, isSuperAdmin);
        const dealCount = parseInt(pv.count) || 0;
        const totalValue = parseFloat(pv.total_value) || 0;

        let response = `**Business Summary** 📈\n\n`;

        if (isSuperAdmin) {
          const cross = await queryCrossTenantSummary();
          response += `**All Companies Overview:**\n\n`;
          for (const c of cross) {
            response += `🏢 **${c.company_name}** — ${c.deal_count} deals, ${formatCurrency(c.pipeline_value)} pipeline, ` +
                       `${c.contact_count} contacts, ${c.product_count} products, ${c.active_workflows} active workflows\n`;
          }
          response += `\n_Ask me "Compare all companies" for more detail._\n`;
        } else {
          response += `**Your Company Overview:**\n\n`;
          response += `• **Deals:** ${dealCount}\n`;
          response += `• **Pipeline Value:** ${formatCurrency(totalValue)}\n`;
          response += `• **Closed Won:** ${pv.won} | **Lost:** ${pv.lost}\n`;

          const stages = await queryDealsByStage(tenantId, isSuperAdmin);
          if (stages.length > 0) {
            response += `\n**Pipeline Breakdown:**\n`;
            for (const s of stages) {
              response += `• ${s.stage}: ${s.count} deals worth ${formatCurrency(s.total_value)}\n`;
            }
          }
        }

        return response;
      }

      case 'super_admin': {
        if (!isSuperAdmin) {
          return `I see you're asking about cross-company data. To use this feature, please switch to **Global mode** using the toggle at the top of the chat panel.`;
        }
        const cross = await queryCrossTenantSummary();
        if (cross.length === 0) return 'No active companies found in the system.';
        let response = `**All Companies — System Overview** 🌐\n\n`;
        let totalDeals = 0, totalValue = 0;
        for (const c of cross) {
          response += `🏢 **${c.company_name}** (${c.slug})\n`;
          response += `  └ Deals: ${c.deal_count} | Pipeline: ${formatCurrency(c.pipeline_value)} | ` +
                     `Contacts: ${c.contact_count} | Products: ${c.product_count} | Active WFs: ${c.active_workflows}\n`;
          totalDeals += parseInt(c.deal_count) || 0;
          totalValue += parseFloat(c.pipeline_value) || 0;
        }
        response += `\n**Totals:** ${totalDeals} deals, ${formatCurrency(totalValue)} pipeline value across ${cross.length} companies.\n\n`;
        response += `_Tip: Ask about a specific company or "which company has the most deals"_`;
        return response;
      }

      case 'expected_close': {
        const deals = await queryDeals(tenantId, isSuperAdmin, entities);
        const closeSoon = deals.filter(d => d.expected_close_date && d.stage !== 'closed_won' && d.stage !== 'closed_lost');
        if (closeSoon.length === 0) return 'No deals with upcoming close dates found.';
        const sorted = closeSoon.sort((a, b) => new Date(a.expected_close_date) - new Date(b.expected_close_date));
        let response = `**Deals Closing Soon** 📅\n\n`;
        for (const d of sorted.slice(0, 10)) {
          response += `• **${d.title}** — ${formatCurrency(d.value)} — Due: ${d.expected_close_date} (${d.stage}, ${d.probability}%)\n`;
        }
        return response;
      }

      default: {
        return await handleGeneralQuery(message, tenantId, isSuperAdmin, intent);
      }
    }
  } catch (err) {
    console.error('Chatbot agent error:', err);
    return RESPONSE_TEMPLATES.error;
  }
}

// Direct auto-allocation without HTTP call
async function performAutoAllocation(tenantId, { contactName, contactPhone, contactEmail, notes }) {
  const reps = await pool.query(
    `SELECT u.id, u.name, u.avatar
     FROM users u
     LEFT JOIN sales_rep_allocation_status sras ON sras.user_id = u.id AND sras.tenant_id = $1
     WHERE u.tenant_id = $1 AND u.role_id = 5 AND u.status = 'active'
       AND COALESCE(sras.is_accepting, true) = true
     ORDER BY u.name`,
    [tenantId]
  );

  if (reps.rows.length === 0) {
    return { ok: false, error: 'No available sales reps' };
  }

  // Atomic round-robin via transaction + SELECT FOR UPDATE
  const client = await pool.connect();
  let rep, idx;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT allocation_round_robin_idx FROM tenant_companies WHERE id = $1 FOR UPDATE',
      [tenantId]
    );
    idx = rows.length > 0 ? (rows[0].allocation_round_robin_idx || 0) : 0;
    rep = reps.rows[idx % reps.rows.length];
    const nextIdx = (idx + 1) % reps.rows.length;
    await client.query(
      'UPDATE tenant_companies SET allocation_round_robin_idx = $1 WHERE id = $2',
      [nextIdx, tenantId]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  const contactId = `CNT-ALLOC-${Date.now()}`;
  await pool.query(
    `INSERT INTO contacts (id, name, email, phone, notes, tenant_id, lifecycle_stage, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'lead', NOW())
     ON CONFLICT (id) DO NOTHING`,
    [contactId, contactName || 'Unknown', contactEmail || '', contactPhone || '', notes || '', tenantId]
  );

  const allocResult = await pool.query(
    `INSERT INTO allocation_history (lead_id, sales_person_id, sales_person_name, sales_person_avatar, project_name, notes, status, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
     RETURNING id, lead_id AS "leadId", sales_person_id AS "salesPersonId",
       sales_person_name AS "salesPersonName", sales_person_avatar AS "salesPersonAvatar",
       status, created_at AS "createdAt"`,
    [contactId, rep.id, rep.name, rep.avatar || '', contactName || 'Lead', notes || '', tenantId]
  );

  return {
    ok: true,
    allocation: allocResult.rows[0],
    rep: { id: rep.id, name: rep.name },
    contactId,
  };
}

// Lead qualification conversation flow
const QUALIFICATION_STEPS = {
  INIT: 'init',
  COLLECTING: 'collecting',
  CONFIRM: 'confirm',
  COMPLETE: 'complete',
};

async function getAllocationConfig(tenantId) {
  try {
    const { rows } = await pool.query(
      `SELECT value_encrypted FROM tenant_settings WHERE tenant_id = $1 AND key = 'lead_allocation_config'`,
      [tenantId]
    );
    if (rows.length > 0) {
      return JSON.parse(rows[0].value_encrypted);
    }
  } catch (e) {
    console.warn('Failed to load allocation config:', e.message);
  }
  return {
    requiredFields: [
      { key: 'name', label: 'What is your name?', type: 'text', order: 1 },
      { key: 'phone', label: 'What is your phone number?', type: 'text', order: 2 },
      { key: 'email', label: 'What is your email?', type: 'text', order: 3 },
      { key: 'budget', label: 'What is your budget range? (e.g. <10k, 10k-50k, 50k-100k, 100k+)', type: 'text', order: 4 },
    ],
    enabled: true,
  };
}

async function handleQualificationStep(message, metadata, tenantId) {
  const state = metadata?.qualification || { step: QUALIFICATION_STEPS.INIT, responses: {}, currentFieldIdx: 0 };
  const config = await getAllocationConfig(tenantId);

  if (!config.enabled) {
    return {
      response: 'Lead allocation is currently disabled. Please contact an administrator.',
      metadata,
    };
  }

  const fields = config.requiredFields || [];

  if (state.step === QUALIFICATION_STEPS.INIT) {
    // Start qualification — ask first question
    if (fields.length === 0) {
      return {
        response: 'No fields configured for lead allocation. An admin needs to set up the allocation form first.',
        metadata,
      };
    }
    const firstField = fields[0];
    return {
      response: `I'd be happy to connect you with our sales team! First, I need some information.\n\n**${firstField.label}**`,
      metadata: {
        ...metadata,
        qualification: {
          step: QUALIFICATION_STEPS.COLLECTING,
          responses: {},
          currentFieldIdx: 0,
        },
      },
    };
  }

  if (state.step === QUALIFICATION_STEPS.COLLECTING) {
    const idx = state.currentFieldIdx;
    const currentField = fields[idx];

    if (!currentField) {
      // All fields answered — go to confirm
      return {
        response: `Thank you! Here's a summary of your information:\n\n${Object.entries(state.responses).map(([k, v]) => `• **${k}**: ${v}`).join('\n')}\n\nShall I submit this to our sales team? (Reply "yes" or "confirm" to proceed)`,
        metadata: {
          ...metadata,
          qualification: {
            ...state,
            step: QUALIFICATION_STEPS.CONFIRM,
          },
        },
      };
    }

    // Save this answer
    const responses = { ...state.responses, [currentField.key]: message.trim() };
    const nextIdx = idx + 1;

    if (nextIdx >= fields.length) {
      // All answered, go to confirm
      return {
        response: `Thank you! Here's a summary of your information:\n\n${Object.entries(responses).map(([k, v]) => `• **${k}**: ${v}`).join('\n')}\n\nShall I submit this to our sales team? (Reply "yes" or "confirm" to proceed)`,
        metadata: {
          ...metadata,
          qualification: {
            step: QUALIFICATION_STEPS.CONFIRM,
            responses,
            currentFieldIdx: nextIdx,
          },
        },
      };
    }

    const nextField = fields[nextIdx];
    return {
      response: `Got it! Next question:\n\n**${nextField.label}**`,
      metadata: {
        ...metadata,
        qualification: {
          step: QUALIFICATION_STEPS.COLLECTING,
          responses,
          currentFieldIdx: nextIdx,
        },
      },
    };
  }

  if (state.step === QUALIFICATION_STEPS.CONFIRM) {
    const confirmMsg = message.trim().toLowerCase();
    if (/^(yes|yeah|yep|confirm|submit|send|proceed|y|ใช่|ตกลง|ยืนยัน|ส่ง)/i.test(confirmMsg)) {
      // Auto-allocate directly via database
      try {
        const allocResult = await performAutoAllocation(tenantId, {
          contactName: state.responses.name || 'Unknown',
          contactPhone: state.responses.phone || '',
          contactEmail: state.responses.email || '',
          notes: `Auto-allocated via chatbot. Info: ${JSON.stringify(state.responses)}`,
        });
        if (allocResult.ok) {
          return {
            response: `✅ Excellent! I've submitted your information and a sales representative will contact you shortly.\n\nYour assigned representative: **${allocResult.rep.name}**\nReference ID: ${allocResult.contactId}\n\nThank you for your interest! 🙏`,
            metadata: {
              ...metadata,
              qualification: { step: QUALIFICATION_STEPS.COMPLETE, responses: state.responses, completedAt: new Date().toISOString() },
            },
          };
        }
        return {
          response: `Thank you! Your information has been recorded, but we couldn't find an available sales representative right now. A team member will follow up with you as soon as possible. 🙏`,
          metadata: {
            ...metadata,
            qualification: { step: QUALIFICATION_STEPS.COMPLETE, responses: state.responses, completedAt: new Date().toISOString() },
          },
        };
      } catch (e) {
        console.error('Auto-allocate failed:', e.message);
        return {
          response: `Thank you! Your information has been received. A sales representative will contact you soon. 🙏`,
          metadata: {
            ...metadata,
            qualification: { step: QUALIFICATION_STEPS.COMPLETE, responses: state.responses, completedAt: new Date().toISOString() },
          },
        };
      }
    } else {
      // Cancel
      return {
        response: 'No problem! If you change your mind, just let me know. Is there anything else I can help you with? 😊',
        metadata: {
          ...metadata,
          qualification: { step: QUALIFICATION_STEPS.COMPLETE, responses: {}, cancelledAt: new Date().toISOString() },
        },
      };
    }
  }

  // Qualification already completed
  return {
    response: 'Your information has already been submitted. A sales representative will contact you shortly! Is there anything else I can help you with?',
    metadata,
  };
}

async function getChatbotConfig(tenantId) {
  try {
    const { rows } = await pool.query(
      `SELECT value_encrypted FROM tenant_settings WHERE tenant_id = $1 AND key = 'chatbot_config'`,
      [tenantId]
    );
    if (rows.length > 0) {
      return { ...DEFAULT_CHATBOT_CONFIG, ...JSON.parse(rows[0].value_encrypted) };
    }
  } catch (e) {
    console.warn('Failed to load chatbot config:', e.message);
  }
  return { ...DEFAULT_CHATBOT_CONFIG };
}

function isWithinSchedule(config) {
  if (!config.enabled) return false;

  const now = new Date();
  const dayName = DAY_NAMES[now.getDay()];
  const daySlots = config.schedule?.[dayName];
  if (!daySlots || daySlots.length === 0) return false;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const slot of daySlots) {
    const [startH, startM] = (slot.start || '00:00').split(':').map(Number);
    const [endH, endM] = (slot.end || '23:59').split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    if (nowMinutes >= startMinutes && nowMinutes < endMinutes) {
      return true;
    }
  }
  return false;
}

async function checkAutoReplyAvailable(tenantId) {
  const config = await getChatbotConfig(tenantId);
  return {
    enabled: config.enabled,
    withinSchedule: isWithinSchedule(config),
    canAutoReply: config.enabled && config.autoRespond && isWithinSchedule(config),
    config: {
      greetingMessage: config.greetingMessage,
      fallbackMessage: config.fallbackMessage,
      timezone: config.timezone,
    },
  };
}

export {
  processMessage,
  trainKnowledge,
  getSuggestedQuestions,
  detectIntent,
  getChatbotConfig,
  isWithinSchedule,
  checkAutoReplyAvailable,
  DEFAULT_CHATBOT_CONFIG,
  handleQualificationStep,
};