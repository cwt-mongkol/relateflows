import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool, { initDb } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. Deals
app.get('/api/deals', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, company, value, stage, probability, owner, 
             lead_source AS "leadSource", priority, contact_name AS "contactName", 
             contact_email AS "contactEmail", created_at AS "createdAt", 
             expected_close_date AS "expectedCloseDate", notes, tags 
      FROM deals 
      ORDER BY created_at DESC, id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching deals:', err);
    res.status(500).json({ error: 'Server error fetching deals' });
  }
});

app.post('/api/deals', async (req, res) => {
  try {
    const { 
      title, company, value, stage, probability, owner, 
      leadSource, priority, contactName, contactEmail, notes, tags, expectedCloseDate 
    } = req.body;
    
    const id = `DEAL-${Math.floor(100 + Math.random() * 900)}`;
    const createdAt = new Date().toISOString().split('T')[0];
    
    const query = `
      INSERT INTO deals (id, title, company, value, stage, probability, owner, lead_source, priority, contact_name, contact_email, created_at, expected_close_date, notes, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, title, company, value, stage, probability, owner, lead_source AS "leadSource", priority, contact_name AS "contactName", contact_email AS "contactEmail", created_at AS "createdAt", expected_close_date AS "expectedCloseDate", notes, tags
    `;
    
    const result = await pool.query(query, [
      id, title, company, parseInt(value || 0), stage, parseInt(probability || 0), 
      JSON.stringify(owner || {}), leadSource, priority, contactName, contactEmail, 
      createdAt, expectedCloseDate || '', notes, JSON.stringify(tags || [])
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating deal:', err);
    res.status(500).json({ error: 'Server error creating deal' });
  }
});

app.patch('/api/deals/:id/stage', async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, probability } = req.body;
    
    const query = `
      UPDATE deals 
      SET stage = $1, probability = $2
      WHERE id = $3
      RETURNING id, title, company, value, stage, probability, owner, lead_source AS "leadSource", priority, contact_name AS "contactName", contact_email AS "contactEmail", created_at AS "createdAt", expected_close_date AS "expectedCloseDate", notes, tags
    `;
    
    const result = await pool.query(query, [stage, parseInt(probability), id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating deal stage:', err);
    res.status(500).json({ error: 'Server error updating deal stage' });
  }
});

app.delete('/api/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM deals WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    res.json({ message: 'Deal deleted successfully', id });
  } catch (err) {
    console.error('Error deleting deal:', err);
    res.status(500).json({ error: 'Server error deleting deal' });
  }
});

// 2. Contacts
app.get('/api/contacts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, email, phone, company, role, 
             lifecycle_stage AS "lifecycleStage", lead_score AS "leadScore", 
             status, avatar, last_contacted AS "lastContacted", 
             total_deals_value AS "totalDealsValue", tags, notes 
      FROM contacts 
      ORDER BY id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ error: 'Server error fetching contacts' });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    const { name, email, phone, company, role, lifecycleStage, leadScore, status, avatar, tags, notes } = req.body;
    const id = `CNT-${Math.floor(100 + Math.random() * 900)}`;
    const lastContacted = 'Just now';
    const totalDealsValue = 0;
    
    const query = `
      INSERT INTO contacts (id, name, email, phone, company, role, lifecycle_stage, lead_score, status, avatar, last_contacted, total_deals_value, tags, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, name, email, phone, company, role, lifecycle_stage AS "lifecycleStage", lead_score AS "leadScore", status, avatar, last_contacted AS "lastContacted", total_deals_value AS "totalDealsValue", tags, notes
    `;
    
    const result = await pool.query(query, [
      id, name, email, phone, company, role, lifecycleStage, parseInt(leadScore || 0), 
      status || 'active', avatar, lastContacted, totalDealsValue, JSON.stringify(tags || []), notes
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating contact:', err);
    res.status(500).json({ error: 'Server error creating contact' });
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM contacts WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ message: 'Contact deleted successfully', id });
  } catch (err) {
    console.error('Error deleting contact:', err);
    res.status(500).json({ error: 'Server error deleting contact' });
  }
});

// 3. Companies
app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, domain, industry, size, 
             annual_revenue AS "annualRevenue", location, 
             contacts_count AS "contactsCount", total_deals_value AS "totalDealsValue", logo 
      FROM companies 
      ORDER BY id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ error: 'Server error fetching companies' });
  }
});

// 4. Activities
app.get('/api/activities', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, type, title, description, timestamp, "user", target_name AS "targetName" 
      FROM activities 
      ORDER BY id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ error: 'Server error fetching activities' });
  }
});

app.post('/api/activities', async (req, res) => {
  try {
    const { type, title, description, user, targetName } = req.body;
    const id = `ACT-${Date.now()}`;
    const timestamp = 'Just now';
    
    const query = `
      INSERT INTO activities (id, type, title, description, timestamp, "user", target_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, type, title, description, timestamp, "user", target_name AS "targetName"
    `;
    
    const result = await pool.query(query, [
      id, type, title, description, timestamp, JSON.stringify(user || {}), targetName || ''
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating activity:', err);
    res.status(500).json({ error: 'Server error creating activity' });
  }
});

// 5. Workflows
app.get('/api/workflows', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, description, trigger_cond AS "trigger", action, status, 
             executions_count AS "executionsCount", last_executed AS "lastExecuted", 
             category, accent_color AS "accentColor" 
      FROM workflows 
      ORDER BY id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching workflows:', err);
    res.status(500).json({ error: 'Server error fetching workflows' });
  }
});

app.post('/api/workflows', async (req, res) => {
  try {
    const { title, description, trigger, action, status, category, accentColor } = req.body;
    const id = `WF-${Math.floor(100 + Math.random() * 900)}`;
    
    const query = `
      INSERT INTO workflows (id, title, description, trigger_cond, action, status, executions_count, last_executed, category, accent_color)
      VALUES ($1, $2, $3, $4, $5, $6, 0, 'Never', $7, $8)
      RETURNING id, title, description, trigger_cond AS "trigger", action, status, executions_count AS "executionsCount", last_executed AS "lastExecuted", category, accent_color AS "accentColor"
    `;
    
    const result = await pool.query(query, [
      id, title, description, trigger, action, status || 'active', category, accentColor || '#2563EB'
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating workflow:', err);
    res.status(500).json({ error: 'Server error creating workflow' });
  }
});

app.patch('/api/workflows/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    const checkWf = await pool.query('SELECT status FROM workflows WHERE id = $1', [id]);
    if (checkWf.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const currentStatus = checkWf.rows[0].status;
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    
    const query = `
      UPDATE workflows 
      SET status = $1
      WHERE id = $2
      RETURNING id, title, description, trigger_cond AS "trigger", action, status, executions_count AS "executionsCount", last_executed AS "lastExecuted", category, accent_color AS "accentColor"
    `;
    
    const result = await pool.query(query, [newStatus, id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error toggling workflow:', err);
    res.status(500).json({ error: 'Server error toggling workflow' });
  }
});

// 6. Metrics
app.get('/api/metrics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, value, subtext, change, is_positive AS "isPositive", icon_name AS "iconName" 
      FROM metrics 
      ORDER BY id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching metrics:', err);
    res.status(500).json({ error: 'Server error fetching metrics' });
  }
});

// Initialize database and start Express server
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
