import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { AsyncLocalStorage } from 'node:async_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const acmiContext = new AsyncLocalStorage();

// Ensure process.env is populated
const PORT = process.env.PORT || 3000;

// Dynamic import helpers to maintain zero boot crash
let db = null;
let isPostgres = false;
let WebSocketServer = null;

// Initialize standard packages or fail gracefully with clean warning
try {
  const wsModule = await import('ws');
  WebSocketServer = wsModule.WebSocketServer || wsModule.default?.WebSocketServer;
} catch (e) {
  console.warn('[WS] WebSocket server module "ws" not found. Live triggers disabled.');
}

// Database Connection String
const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.PG_URL;

if (dbUrl) {
  try {
    const pgModule = await import('pg');
    const { Pool } = pgModule.default || pgModule;
    db = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });
    // Ping to verify
    await db.query('SELECT NOW()');
    isPostgres = true;
    console.log('[DB] Connected to Supabase Postgres!');
  } catch (err) {
    console.warn('[DB] Postgres connection failed. Falling back to SQLite:', err.message);
    db = null;
  }
}

if (!db) {
  try {
    const Database = (await import('better-sqlite3')).default;
    db = new Database('dashboard_state.sqlite');
    console.log('[DB] Connected to local SQLite database (dashboard_state.sqlite)');
  } catch (err) {
    console.error('[DB] Critical database error: SQLite fallback failed!', err.message);
  }
}

// DB Execution Helpers
async function dbQuery(sql, params = []) {
  if (!db) return [];
  if (isPostgres) {
    const res = await db.query(sql, params);
    return res.rows;
  } else {
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
    const stmt = db.prepare(sql);
    if (isSelect) {
      return stmt.all(...params);
    } else {
      const res = stmt.run(...params);
      return res;
    }
  }
}

async function dbQueryRow(sql, params = []) {
  const rows = await dbQuery(sql, params);
  return rows[0] || null;
}

// Initialize Tables on startup
async function initDb() {
  console.log('[DB] Running schema migrations...');
  if (isPostgres) {
    // Supabase Schema
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS rbac_roles (
          role_name VARCHAR(50) PRIMARY KEY,
          permissions TEXT[] NOT NULL
      );
    `);

    await dbQuery(`
      INSERT INTO rbac_roles (role_name, permissions) VALUES
      ('admin', '{"read", "write", "approve", "settings"}'),
      ('agent:read-write', '{"read", "write"}'),
      ('agent:read-only', '{"read"}')
      ON CONFLICT (role_name) DO NOTHING;
    `);

    await dbQuery(`
      CREATE TABLE IF NOT EXISTS tenants (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          redis_url VARCHAR(255) NULL,
          redis_token VARCHAR(255) NULL,
          stripe_subscription_id VARCHAR(100) NULL,
          whop_user_id VARCHAR(100) NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
          created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await dbQuery(`
      INSERT INTO tenants (id, name, redis_url, redis_token, status)
      VALUES (
          'default_tenant', 
          'Default Team Space', 
          'https://loved-platypus-102968.upstash.io', 
          'gQAAAAAAAZI4AAIgcDJhNDFlNmUwMjQ5ZWI0ZDNmYWUzNDU2NDc4ZWUxMmQwOA', 
          'active'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await dbQuery(`
      CREATE TABLE IF NOT EXISTS users_agents (
          id VARCHAR(100) PRIMARY KEY,
          type VARCHAR(20) NOT NULL CHECK (type IN ('human', 'agent')),
          role VARCHAR(50) NOT NULL REFERENCES rbac_roles(role_name),
          token VARCHAR(255) NOT NULL UNIQUE,
          tenant_id VARCHAR(100) REFERENCES tenants(id) DEFAULT 'default_tenant',
          created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    try {
      await dbQuery(`ALTER TABLE users_agents ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) REFERENCES tenants(id) DEFAULT 'default_tenant'`);
    } catch (e) {
      // Ignore if already exists
    }

    await dbQuery(`
      INSERT INTO users_agents (id, type, role, token, tenant_id) VALUES
      ('michaelshaw', 'human', 'admin', 'sk-gsd-mikey-admin-9982', 'default_tenant'),
      ('bentley', 'agent', 'agent:read-write', 'sk-gsd-agent-bentley-8812', 'default_tenant'),
      ('claude-engineer', 'agent', 'agent:read-write', 'sk-gsd-agent-claude-2294', 'default_tenant')
      ON CONFLICT (id) DO NOTHING;
    `);

    await dbQuery(`
      CREATE TABLE IF NOT EXISTS pending_approvals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          requesting_agent VARCHAR(100) REFERENCES users_agents(id),
          action_type VARCHAR(50) NOT NULL,
          payload JSONB NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          created_at TIMESTAMP DEFAULT NOW(),
          reviewed_by VARCHAR(100) NULL,
          reviewed_at TIMESTAMP NULL
      );
    `);

    await dbQuery(`
      CREATE TABLE IF NOT EXISTS ui_state (
          id VARCHAR(100) PRIMARY KEY DEFAULT 'dashboard_default',
          density VARCHAR(20) NOT NULL DEFAULT 'comfortable' CHECK (density IN ('comfortable', 'compact')),
          active_theme VARCHAR(50) NOT NULL DEFAULT 'light',
          layout_widgets JSONB NOT NULL DEFAULT '{"command": true, "todo": true, "notes": true, "projects": true, "calendar": true, "docs": true, "agents": true, "settings": true}',
          updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await dbQuery(`
      INSERT INTO ui_state (id, density, active_theme) 
      VALUES ('dashboard_default', 'comfortable', 'light')
      ON CONFLICT (id) DO NOTHING;
    `);
  } else {
    // SQLite Schema Fallback
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS rbac_roles (
          role_name TEXT PRIMARY KEY,
          permissions TEXT NOT NULL
      );
    `);

    await dbQuery(`
      INSERT OR IGNORE INTO rbac_roles (role_name, permissions) VALUES
      ('admin', '["read", "write", "approve", "settings"]'),
      ('agent:read-write', '["read", "write"]'),
      ('agent:read-only', '["read"]')
      ;
    `);

    await dbQuery(`
      CREATE TABLE IF NOT EXISTS tenants (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          redis_url TEXT,
          redis_token TEXT,
          stripe_subscription_id TEXT,
          whop_user_id TEXT,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbQuery(`
      INSERT OR IGNORE INTO tenants (id, name, redis_url, redis_token, status)
      VALUES (
          'default_tenant', 
          'Default Team Space', 
          'https://loved-platypus-102968.upstash.io', 
          'gQAAAAAAAZI4AAIgcDJhNDFlNmUwMjQ5ZWI0ZDNmYWUzNDU2NDc4ZWUxMmQwOA', 
          'active'
      );
    `);

    await dbQuery(`
      CREATE TABLE IF NOT EXISTS users_agents (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL CHECK (type IN ('human', 'agent')),
          role TEXT NOT NULL REFERENCES rbac_roles(role_name),
          token TEXT NOT NULL UNIQUE,
          tenant_id TEXT REFERENCES tenants(id) DEFAULT 'default_tenant',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      await dbQuery(`ALTER TABLE users_agents ADD COLUMN tenant_id TEXT DEFAULT 'default_tenant' REFERENCES tenants(id)`);
    } catch (e) {
      // Ignore if already exists
    }

    await dbQuery(`
      INSERT OR IGNORE INTO users_agents (id, type, role, token, tenant_id) VALUES
      ('michaelshaw', 'human', 'admin', 'sk-gsd-mikey-admin-9982', 'default_tenant'),
      ('bentley', 'agent', 'agent:read-write', 'sk-gsd-agent-bentley-8812', 'default_tenant'),
      ('claude-engineer', 'agent', 'agent:read-write', 'sk-gsd-agent-claude-2294', 'default_tenant')
      ;
    `);

    await dbQuery(`
      CREATE TABLE IF NOT EXISTS pending_approvals (
          id TEXT PRIMARY KEY,
          requesting_agent TEXT REFERENCES users_agents(id),
          action_type TEXT NOT NULL,
          payload TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          created_at INTEGER NOT NULL,
          reviewed_by TEXT,
          reviewed_at INTEGER
      );
    `);

    await dbQuery(`
      CREATE TABLE IF NOT EXISTS ui_state (
          id TEXT PRIMARY KEY DEFAULT 'dashboard_default',
          density TEXT NOT NULL DEFAULT 'comfortable' CHECK (density IN ('comfortable', 'compact')),
          active_theme TEXT NOT NULL DEFAULT 'light',
          layout_widgets TEXT NOT NULL DEFAULT '{"command": true, "todo": true, "notes": true, "projects": true, "calendar": true, "docs": true, "agents": true, "settings": true}',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbQuery(`
      INSERT OR IGNORE INTO ui_state (id, density, active_theme) 
      VALUES ('dashboard_default', 'comfortable', 'light')
      ;
    `);
  }
  console.log('[DB] Database tables initialized successfully.');
}

// ─── Upstash Redis KV Proxy Driver ──────────────────────────────────────────
async function upstashCmd(cmdArray, overrideUrl = null, overrideToken = null) {
  const ctx = acmiContext.getStore() || {};
  const url = overrideUrl || ctx.customUrl || process.env.UPSTASH_REDIS_REST_URL || 'https://loved-platypus-102968.upstash.io';
  const token = overrideToken || ctx.customToken || process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAZI4AAIgcDJhNDFlNmUwMjQ5ZWI0ZDNmYWUzNDU2NDc4ZWUxMmQwOA';
  
  const res = await fetch(`${url.replace(/\/$/, '')}/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cmdArray.map(String))
  });
  
  if (!res.ok) {
    throw new Error(`Upstash Redis error: ${res.status} ${await res.text()}`);
  }
  
  const data = await res.json();
  if (data.error) {
    throw new Error(`Upstash Redis command error: ${data.error}`);
  }
  
  return data.result;
}

// ─── Upstash Redis KV Pipeline Proxy Driver ─────────────────────────────────
async function upstashPipeline(commands, overrideUrl = null, overrideToken = null) {
  if (!commands || commands.length === 0) return [];
  const ctx = acmiContext.getStore() || {};
  const url = overrideUrl || ctx.customUrl || process.env.UPSTASH_REDIS_REST_URL || 'https://loved-platypus-102968.upstash.io';
  const token = overrideToken || ctx.customToken || process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAZI4AAIgcDJhNDFlNmUwMjQ5ZWI0ZDNmYWUzNDU2NDc4ZWUxMmQwOA';
  
  const res = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commands.map(cmd => cmd.map(String)))
  });
  
  if (!res.ok) {
    throw new Error(`Upstash Redis pipeline error: ${res.status} ${await res.text()}`);
  }
  
  const results = await res.json();
  return results.map(item => {
    if (item.error) {
      throw new Error(`Upstash Redis pipeline command error: ${item.error}`);
    }
    return item.result;
  });
}

// ─── Gemini text-embedding-004 Embedding Driver ──────────────────────────────────
async function triggerEmbeddingIndexing(namespace, id, title, content) {
  // Execute asynchronously
  setImmediate(async () => {
    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        console.warn('[Embedding] Warning: GEMINI_API_KEY is not defined. Embedding is bypassed.');
        return;
      }

      console.log(`[Embedding] Requesting Gemini embedding for ${namespace}:${id} ("${title}")`);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: {
            parts: [{ text: `Title: ${title}\nContent: ${content}` }]
          }
        })
      });

      if (!response.ok) {
        console.error('[Embedding] Gemini API returned error:', response.status, await response.text());
        return;
      }

      const data = await response.json();
      const vector = data.embedding?.values;
      if (!vector || !Array.isArray(vector)) {
        console.error('[Embedding] Gemini API returned invalid embedding shape:', data);
        return;
      }

      // Index to Upstash Vector
      const vectorUrl = process.env.UPSTASH_VECTOR_REST_URL;
      const vectorToken = process.env.UPSTASH_VECTOR_REST_TOKEN;
      if (!vectorUrl || !vectorToken) {
        console.warn('[Embedding] Warning: Upstash Vector credentials are not set. Embedding indexing is bypassed.');
        return;
      }

      console.log(`[Embedding] Uploading vector (${vector.length} dimensions) to Upstash Vector index`);
      const vectorRes = await fetch(`${vectorUrl.replace(/\/$/, '')}/upsert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vectorToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: `${namespace}:${id}`,
          vector: vector,
          metadata: {
            namespace,
            id,
            title,
            text: content
          }
        })
      });

      if (!vectorRes.ok) {
        console.error('[Embedding] Upstash Vector indexing failed:', vectorRes.status, await vectorRes.text());
        return;
      }

      console.log(`[Embedding] Successfully indexed vector for ${namespace}:${id}`);
    } catch (err) {
      console.error('[Embedding] Background embedding indexing failed:', err.message);
    }
  });
}

// ─── HTTP Utilities ──────────────────────────────────────────────────────────
async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

// MIME Types Map
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Connected Clients tracking
const activeClients = new Set();
function broadcast(message) {
  const payload = JSON.stringify(message);
  activeClients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      try { client.send(payload); } catch (e) { /* ignore */ }
    }
  });
}

// ─── Primary HTTP Router ────────────────────────────────────────────────────
const appHandler = async (req, res) => {
  // Support relaxed CORS for complete compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  try {
    // 1. RBAC Authentication middleware
    let currentUser = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const sql = isPostgres 
        ? `SELECT ua.*, r.permissions, t.redis_url, t.redis_token, t.status AS tenant_status
           FROM users_agents ua 
           JOIN rbac_roles r ON ua.role = r.role_name 
           LEFT JOIN tenants t ON ua.tenant_id = t.id
           WHERE ua.token = $1`
        : `SELECT ua.*, r.permissions, t.redis_url, t.redis_token, t.status AS tenant_status
           FROM users_agents ua 
           JOIN rbac_roles r ON ua.role = r.role_name 
           LEFT JOIN tenants t ON ua.tenant_id = t.id
           WHERE ua.token = ?`;
      const row = await dbQueryRow(sql, [token]);
      if (row) {
        let perms = row.permissions;
        if (typeof perms === 'string') {
          try { perms = JSON.parse(perms); } catch (e) { perms = perms.split(','); }
        }
        currentUser = {
          id: row.id,
          type: row.type,
          role: row.role,
          tenantId: row.tenant_id || 'default_tenant',
          tenantStatus: row.tenant_status || 'active',
          permissions: perms,
          redisUrl: row.redis_url || null,
          redisToken: row.redis_token || null
        };
      }
    }

    // Standard WRITE operations classification
    const writeTools = [
      'acmi_profile', 'acmi_signal', 'acmi_event', 'acmi_delete',
      'acmi_spawn', 'acmi_rollup_set', 'acmi_work_create',
      'acmi_work_event', 'acmi_work_signal'
    ];

    // 2. Routing Logic

    // --- GET /api/ui-state ---
    if (pathname === '/api/ui-state' && req.method === 'GET') {
      const row = await dbQueryRow("SELECT * FROM ui_state WHERE id = 'dashboard_default'");
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (row) {
        let widgets = row.layout_widgets;
        if (typeof widgets === 'string') {
          try { widgets = JSON.parse(widgets); } catch (e) {}
        }
        res.end(JSON.stringify({
          id: row.id,
          density: row.density,
          active_theme: row.active_theme,
          layout_widgets: widgets
        }));
      } else {
        res.end(JSON.stringify({ density: 'comfortable', active_theme: 'light' }));
      }
      return;
    }

    // --- POST /api/ui-state ---
    else if (pathname === '/api/ui-state' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const density = body.density || 'comfortable';
      const active_theme = body.active_theme || 'light';
      const widgets = JSON.stringify(body.layout_widgets || {
        command: true, todo: true, notes: true, projects: true,
        calendar: true, docs: true, agents: true, settings: true
      });

      if (isPostgres) {
        await dbQuery(`
          INSERT INTO ui_state (id, density, active_theme, layout_widgets, updated_at)
          VALUES ('dashboard_default', $1, $2, $3, NOW())
          ON CONFLICT (id) DO UPDATE SET
            density = EXCLUDED.density,
            active_theme = EXCLUDED.active_theme,
            layout_widgets = EXCLUDED.layout_widgets,
            updated_at = NOW()
        `, [density, active_theme, widgets]);
      } else {
        await dbQuery(`
          INSERT OR REPLACE INTO ui_state (id, density, active_theme, layout_widgets, updated_at)
          VALUES ('dashboard_default', ?, ?, ?, CURRENT_TIMESTAMP)
        `, [density, active_theme, widgets]);
      }

      broadcast({ type: 'ui-state-change', density, active_theme });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // --- GET /api/approvals ---
    else if (pathname === '/api/approvals' && req.method === 'GET') {
      const rows = await dbQuery('SELECT * FROM pending_approvals ORDER BY created_at DESC');
      const normalizedRows = rows.map(r => {
        let payload = r.payload;
        if (typeof payload === 'string') {
          try { payload = JSON.parse(payload); } catch (e) {}
        }
        return {
          id: r.id,
          requesting_agent: r.requesting_agent,
          action_type: r.action_type,
          payload,
          status: r.status,
          created_at: r.created_at,
          reviewed_by: r.reviewed_by,
          reviewed_at: r.reviewed_at
        };
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(normalizedRows));
      return;
    }

    // --- POST /api/approvals/resolve ---
    else if (pathname === '/api/approvals/resolve' && req.method === 'POST') {
      // Must be authorized human admin
      if (!currentUser || !currentUser.permissions.includes('approve')) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Permission denied. Only human admins can resolve approvals.' }));
        return;
      }

      const body = await parseJsonBody(req);
      const approvalId = body.id;
      const status = body.status; // 'approved' or 'rejected'

      if (!['approved', 'rejected'].includes(status)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid approval resolution status' }));
        return;
      }

      const approval = await dbQueryRow('SELECT * FROM pending_approvals WHERE id = ?', [approvalId]);
      if (!approval) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Approval record not found' }));
        return;
      }

      if (approval.status !== 'pending') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Approval request is already resolved' }));
        return;
      }

      let executed = false;
      let executionError = null;

      let customUrl = currentUser?.redisUrl || null;
      let customToken = currentUser?.redisToken || null;
      let isFallback = false;

      if (status === 'approved') {
        try {
          let payload = approval.payload;
          if (typeof payload === 'string') {
            payload = JSON.parse(payload);
          }
          
          if (customUrl && customToken) {
            try {
              await upstashCmd(['PING'], customUrl, customToken);
            } catch (pingErr) {
              console.warn('[Tenant Fallback] Ping failed during HITL approval resolution. Falling back to default Redis.', pingErr.message);
              customUrl = null;
              customToken = null;
              isFallback = true;
            }
          }

          // Re-execute enqueued payload directly on Upstash Redis!
          await acmiContext.run({ customUrl, customToken }, () => 
            executeAcmiTool(payload.tool, payload.params)
          );
          executed = true;
        } catch (err) {
          executionError = err.message;
        }
      }

      // Update approval record status
      if (isPostgres) {
        await dbQuery(
          `UPDATE pending_approvals 
           SET status = $1, reviewed_by = $2, reviewed_at = NOW() 
           WHERE id = $3`,
          [status, currentUser.id, approvalId]
        );
      } else {
        await dbQuery(
          `UPDATE pending_approvals 
           SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [status, currentUser.id, approvalId]
        );
      }

      broadcast({ type: 'approval-resolved', id: approvalId, status, executed, error: executionError });
      
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'X-Tenant-Fallback': isFallback ? 'true' : 'false'
      });
      res.end(JSON.stringify({ success: true, status, executed, error: executionError }));
      return;
    }

    // --- POST /api/acmi ---
    else if ((pathname === '/api/acmi' || pathname === '/acmi-proxy') && req.method === 'POST') {
      const payload = await parseJsonBody(req);
      let tool = payload.tool;
      if (typeof tool === 'string') {
        tool = tool.startsWith('acmi_') ? tool : 'acmi_' + tool;
      }
      const params = payload.params || {};

      let customUrl = currentUser?.redisUrl || null;
      let customToken = currentUser?.redisToken || null;
      let isFallback = false;

      if (customUrl && customToken) {
        try {
          await upstashCmd(['PING'], customUrl, customToken);
        } catch (pingErr) {
          console.warn(`[Tenant Fallback] Ping to custom Redis for ${currentUser.id} failed. falling back to shared default.`, pingErr.message);
          customUrl = null;
          customToken = null;
          isFallback = true;
        }
      }

      // 1. Enforce strict write policy, relaxed read policy
      const isWrite = writeTools.includes(tool);
      if (isWrite) {
        if (!currentUser) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Authorization Token is required for write operations.' }));
          return;
        }
        if (!currentUser.permissions.includes('write')) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Write permissions are required for this action.' }));
          return;
        }

        // 2. Intercept agent-initiated sensitive writes into human-in-the-loop pending_approvals queue
        const isAgent = currentUser.type === 'agent';
        const isSensitiveWrite = ['note', 'doc', 'config'].includes(params.namespace) || tool === 'acmi_delete';
        
        if (isAgent && isSensitiveWrite) {
          const approvalId = crypto.randomUUID();
          if (isPostgres) {
            await dbQuery(`
              INSERT INTO pending_approvals (id, requesting_agent, action_type, payload, status, created_at)
              VALUES ($1, $2, $3, $4, 'pending', NOW())
            `, [approvalId, currentUser.id, `${tool}:${params.namespace || ''}`, JSON.stringify(payload)]);
          } else {
            await dbQuery(`
              INSERT INTO pending_approvals (id, requesting_agent, action_type, payload, status, created_at)
              VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
            `, [approvalId, currentUser.id, `${tool}:${params.namespace || ''}`, JSON.stringify(payload)]);
          }

          console.log(`[HITL] Intercepted write action from agent ${currentUser.id}. Approval enqueued: ${approvalId}`);
          broadcast({ type: 'approval-requested', id: approvalId, agentId: currentUser.id, action: tool });

          res.writeHead(202, { 
            'Content-Type': 'application/json',
            'X-Tenant-Fallback': isFallback ? 'true' : 'false'
          });
          res.end(JSON.stringify({
            status: "pending_approval",
            approvalId,
            message: "Action queued for human approval"
          }));
          return;
        }
      }

      // Execute live tool action directly on Upstash Redis within tenant context
      const result = await acmiContext.run({ customUrl, customToken }, () => 
        executeAcmiTool(tool, params)
      );
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'X-Tenant-Fallback': isFallback ? 'true' : 'false'
      });
      res.end(JSON.stringify(result));
      return;
    }

    // --- Serve GSD Dashboard & Visual Screener Pages ---
    else {
      let filePath = path.join(__dirname, pathname === '/' ? 'gsd-dashboard.html' : pathname);
      
      // Enforce strict path awareness
      if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Access Denied');
        return;
      }

      try {
        const stats = await fs.promises.stat(filePath);
        if (stats.isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const content = await fs.promises.readFile(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('File Not Found');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Server File Error');
        }
      }
    }
  } catch (err) {
    console.error('[HTTP ERROR]', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
};

// ─── Live ACMI Tool Router ──────────────────────────────────────────────────
async function executeAcmiTool(tool, params) {
  let normalizedTool = tool;
  if (typeof tool === 'string') {
    normalizedTool = tool.startsWith('acmi_') ? tool : 'acmi_' + tool;
  }
  switch (normalizedTool) {
    case 'acmi_list': {
      const keys = await upstashCmd(['KEYS', `acmi:${params.namespace}:*:profile`]);
      return (keys || []).map(k => {
        const prefix = `acmi:${params.namespace}:`;
        return k.slice(prefix.length, k.length - ':profile'.length);
      });
    }

    case 'acmi_get': {
      const entityId = `${params.namespace}:${params.id}`;
      const profileRaw = await upstashCmd(['GET', `acmi:${entityId}:profile`]);
      const signalsRaw = await upstashCmd(['GET', `acmi:${entityId}:signals`]);
      const timelineRaw = await upstashCmd(['ZREVRANGE', `acmi:${entityId}:timeline`, '0', '9']);
      
      const profile = profileRaw ? JSON.parse(profileRaw) : null;
      const signals = signalsRaw ? JSON.parse(signalsRaw) : null;
      const timeline = (timelineRaw || []).map(t => JSON.parse(t)).reverse();
      
      return { id: params.id, profile, signals, timeline };
    }

    case 'acmi_profile': {
      const entityId = `${params.namespace}:${params.id}`;
      const rawProfile = params.profile !== undefined ? params.profile : params.data;
      const profileStr = typeof rawProfile === 'string' ? rawProfile : JSON.stringify(rawProfile || {});
      await upstashCmd(['SET', `acmi:${entityId}:profile`, profileStr]);
      
      // Asynchronously trigger embedding indexing for notes and documents
      if (['note', 'doc'].includes(params.namespace)) {
        try {
          const profile = JSON.parse(profileStr);
          const title = profile.title || params.id;
          const content = profile.content || '';
          if (content) {
            triggerEmbeddingIndexing(params.namespace, params.id, title, content);
          }
        } catch (e) { /* ignore JSON parse error */ }
      }

      broadcast({ type: 'acmi-change', namespace: params.namespace, id: params.id, action: 'profile' });
      return { success: true };
    }

    case 'acmi_signal': {
      const entityId = `${params.namespace}:${params.id}`;
      const rawSignals = params.signals !== undefined ? params.signals : params.data;
      const signalsStr = typeof rawSignals === 'string' ? rawSignals : JSON.stringify(rawSignals || {});
      const newSignals = JSON.parse(signalsStr);
      
      const existingRaw = await upstashCmd(['GET', `acmi:${entityId}:signals`]);
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      
      const merged = { ...existing, ...newSignals };
      await upstashCmd(['SET', `acmi:${entityId}:signals`, JSON.stringify(merged)]);
      
      broadcast({ type: 'acmi-change', namespace: params.namespace, id: params.id, action: 'signal' });
      return { success: true };
    }

    case 'acmi_event': {
      const entityId = `${params.namespace}:${params.id}`;
      const ts = Date.now();
      const event = {
        ts,
        source: params.source,
        summary: params.summary,
        kind: params.kind || 'coord-note',
        correlationId: params.correlationId || `evt-${ts}`,
        speaker_type: params.speaker_type || (params.source.startsWith('agent:') ? 'agent' : 'human')
      };
      
      await upstashCmd(['ZADD', `acmi:${entityId}:timeline`, ts, JSON.stringify(event)]);
      broadcast({ type: 'acmi-change', namespace: params.namespace, id: params.id, action: 'event' });
      return { success: true };
    }

    case 'acmi_cat': {
      const keys = params.keys || [];
      const limit = params.limit || 50;
      const since = params.since || 'all';
      
      let sinceMs = 0;
      if (since !== 'all') {
        const unit = since.slice(-1);
        const val = parseInt(since.slice(0, -1), 10);
        if (!isNaN(val)) {
          if (unit === 'm') sinceMs = Date.now() - val * 60 * 1000;
          else if (unit === 'h') sinceMs = Date.now() - val * 60 * 60 * 1000;
          else if (unit === 'd') sinceMs = Date.now() - val * 24 * 60 * 60 * 1000;
        }
      }

      const allEvents = [];
      
      // Pipeline KEYS searches
      const keysCommands = [];
      const nonPatternKeys = [];
      keys.forEach(key => {
        if (key.includes('*')) {
          let pat = key.startsWith('acmi:') ? key : `acmi:${key}`;
          if (!pat.endsWith(':timeline')) pat = `${pat}:timeline`;
          keysCommands.push(['KEYS', pat]);
        } else {
          let fk = key.startsWith('acmi:') ? key : `acmi:${key}`;
          if (!fk.endsWith(':timeline')) fk = `${fk}:timeline`;
          nonPatternKeys.push(fk);
        }
      });

      const keysResults = keysCommands.length > 0 ? await upstashPipeline(keysCommands).catch(() => []) : [];
      const expandedKeys = new Set(nonPatternKeys);
      keysResults.forEach(matched => {
        if (Array.isArray(matched)) {
          // Sane limit of 30 keys per wildcard namespace pattern
          const capped = matched.slice(0, 30);
          capped.forEach(k => expandedKeys.add(k));
        }
      });

      // Pipeline ZRANGEBYSCORE calls
      const rangeCommands = [];
      const min = sinceMs > 0 ? String(sinceMs) : '-inf';
      // Sane limit of 50 total keys scanned in single query
      const expandedKeysArray = Array.from(expandedKeys).slice(0, 50);
      expandedKeysArray.forEach(k => {
        rangeCommands.push(['ZRANGEBYSCORE', k, min, '+inf']);
      });

      const rangeResults = rangeCommands.length > 0 ? await upstashPipeline(rangeCommands).catch(() => []) : [];
      rangeResults.forEach(raw => {
        if (Array.isArray(raw)) {
          raw.forEach(r => {
            try { allEvents.push(JSON.parse(r)); } catch (e) {}
          });
        }
      });

      allEvents.sort((a, b) => a.ts - b.ts);
      return allEvents.slice(-limit);
    }

    case 'acmi_delete': {
      const key = params.key;
      const confirm = params.confirm === true;
      const keysToDelete = key.startsWith('acmi:') ? [key] : [
        `acmi:${key}:profile`, `acmi:${key}:signals`, `acmi:${key}:timeline`
      ];

      if (!confirm) {
        return { dry_run: true, keys: keysToDelete };
      }

      for (const k of keysToDelete) {
        await upstashCmd(['DEL', k]);
      }
      broadcast({ type: 'acmi-change', action: 'delete', keys: keysToDelete });
      return { deleted: true, keys: keysToDelete };
    }

    case 'acmi_dashboard_bootstrap': {
      const maxAgents = params.maxAgents || 20;
      const maxWork = params.maxWork || 20;
      const timelineSince = params.timelineSince || '7d';

      // 1. List all entity types and config in parallel using pipeline
      const p1Commands = [
        ['KEYS', 'acmi:agent:*:profile'],
        ['KEYS', 'acmi:work:*:profile'],
        ['GET', 'acmi:config:dashboard:profile'],
        ['GET', 'acmi:config:dashboard:signals'],
        ['KEYS', 'acmi:task:*:profile'],
        ['KEYS', 'acmi:note:*:profile'],
        ['KEYS', 'acmi:event:*:profile'],
        ['KEYS', 'acmi:doc:*:profile']
      ];

      const p1Results = await upstashPipeline(p1Commands).catch(err => {
        console.error('[Bootstrap] Pipeline 1 failed:', err);
        return Array(8).fill([]);
      });

      // Helper to extract IDs from KEYS response
      const extractIds = (keys, namespace) => {
        const prefix = `acmi:${namespace}:`;
        return (keys || []).map(k => k.slice(prefix.length, k.length - ':profile'.length));
      };

      const agentIds = extractIds(p1Results[0], 'agent');
      const workIds = extractIds(p1Results[1], 'work');
      const configProfileRaw = p1Results[2];
      const configSignalsRaw = p1Results[3];
      const taskIds = extractIds(p1Results[4], 'task');
      const noteIds = extractIds(p1Results[5], 'note');
      const eventIds = extractIds(p1Results[6], 'event');
      const docIds = extractIds(p1Results[7], 'doc');

      const configData = {
        profile: configProfileRaw ? JSON.parse(configProfileRaw) : {},
        signals: configSignalsRaw ? JSON.parse(configSignalsRaw) : {}
      };

      // 2. Batch-fetch top N agents, work items, tasks, notes, events, docs profiles/signals
      const agentSlice = (agentIds || []).slice(0, maxAgents);
      const workSlice = (workIds || []).slice(0, maxWork);
      const taskSlice = (taskIds || []).slice(0, 20);
      const noteSlice = (noteIds || []).slice(0, 20);
      const eventSlice = (eventIds || []).slice(0, 50);
      const docSlice = (docIds || []).slice(0, 20);

      const p2Commands = [];

      const addSliceGets = (namespace, slice) => {
        slice.forEach(id => {
          p2Commands.push(['GET', `acmi:${namespace}:${id}:profile`]);
          p2Commands.push(['GET', `acmi:${namespace}:${id}:signals`]);
        });
      };

      addSliceGets('agent', agentSlice);
      addSliceGets('work', workSlice);
      addSliceGets('task', taskSlice);
      addSliceGets('note', noteSlice);
      addSliceGets('event', eventSlice);
      addSliceGets('doc', docSlice);

      const p2Results = p2Commands.length > 0 ? await upstashPipeline(p2Commands).catch(err => {
        console.error('[Bootstrap] Pipeline 2 failed:', err);
        return [];
      }) : [];

      let resIdx = 0;
      const parseSliceResults = (namespace, slice) => {
        return slice.map(id => {
          const profileRaw = p2Results[resIdx++];
          const signalsRaw = p2Results[resIdx++];
          try {
            return {
              id,
              profile: profileRaw ? JSON.parse(profileRaw) : null,
              signals: signalsRaw ? JSON.parse(signalsRaw) : null
            };
          } catch (e) {
            return { id, profile: null, signals: null };
          }
        });
      };

      const agents = parseSliceResults('agent', agentSlice);
      const workItems = parseSliceResults('work', workSlice);
      const tasks = parseSliceResults('task', taskSlice);
      const notes = parseSliceResults('note', noteSlice);
      const events = parseSliceResults('event', eventSlice);
      const docs = parseSliceResults('doc', docSlice);

      // 3. Fetch merged timeline (already optimized inside acmi_cat)
      const timeline = await executeAcmiTool('acmi_cat', {
        keys: ['agent:*', 'thread:*', 'work:*'],
        since: timelineSince,
        limit: params.timelineLimit || 100
      }).catch(() => []);

      return {
        agents,
        workItems,
        config: configData.profile || configData || {},
        tasks,
        notes,
        events,
        docs,
        timeline,
        summary: {
          totalAgents: (agentIds || []).length,
          totalWork: (workIds || []).length,
          totalTasks: (taskIds || []).length,
          totalNotes: (noteIds || []).length,
          totalEvents: (eventIds || []).length,
          totalDocs: (docIds || []).length,
          timelineEvents: timeline.length
        }
      };
    }

    case 'acmi_bootstrap': {
      const agentId = params.agentId;
      const entityId = `agent:${agentId}`;
      const profileRaw = await upstashCmd(['GET', `acmi:${entityId}:profile`]);
      const signalsRaw = await upstashCmd(['GET', `acmi:${entityId}:signals`]);
      const rollupRaw = await upstashCmd(['GET', `acmi:${entityId}:rollup:latest`]);
      const timelineRaw = await upstashCmd(['ZREVRANGE', `acmi:${entityId}:timeline`, '0', '9']);

      const profile = profileRaw ? JSON.parse(profileRaw) : null;
      const signals = signalsRaw ? JSON.parse(signalsRaw) : null;
      const rollup = rollupRaw ? JSON.parse(rollupRaw) : null;
      const timeline = (timelineRaw || []).map(t => JSON.parse(t)).reverse();

      return {
        agentId,
        profile,
        signals,
        activeThreads: [],
        rollup,
        recentTimeline: timeline,
        spawns: []
      };
    }

    case 'acmi_spawn': {
      const agentId = params.agentId;
      const sessionId = params.sessionId || `session-${crypto.randomBytes(4).toString('hex')}`;
      const modelId = params.modelId || 'text-embedding-004';
      const ts = Date.now();
      const event = {
        ts,
        source: `agent:${agentId}`,
        kind: 'spawn',
        correlationId: `spawn-${agentId}-${ts}`,
        summary: `[spawn] Agent spawned. Session ${sessionId} (${modelId})`,
        speaker_type: 'agent'
      };
      await upstashCmd(['ZADD', `acmi:agent:${agentId}:timeline`, ts, JSON.stringify(event)]);
      broadcast({ type: 'acmi-change', namespace: 'agent', id: agentId, action: 'spawn' });
      return { sessionId };
    }

    case 'acmi_active':
      return [];

    case 'acmi_rollup_set': {
      const agentId = params.agentId;
      const rollupStr = typeof params.rollup === 'string' ? params.rollup : JSON.stringify(params.rollup);
      await upstashCmd(['SET', `acmi:agent:${agentId}:rollup:latest`, rollupStr]);
      broadcast({ type: 'acmi-change', namespace: 'agent', id: agentId, action: 'rollup' });
      return { success: true };
    }

    // Work items wrappers
    case 'acmi_work_create':
      return executeAcmiTool('acmi_profile', { namespace: 'work', id: params.id, profile: params.profile });

    case 'acmi_work_event':
      return executeAcmiTool('acmi_event', { namespace: 'work', id: params.id, source: params.source, summary: params.summary, kind: 'work-update', sessionId: params.sessionId });

    case 'acmi_work_signal':
      return executeAcmiTool('acmi_signal', { namespace: 'work', id: params.id, signals: params.signals });

    case 'acmi_work_get':
      return executeAcmiTool('acmi_get', { namespace: 'work', id: params.id });

    case 'acmi_work_list':
      return executeAcmiTool('acmi_list', { namespace: 'work' });

    default:
      throw new Error(`ACMI Tool handler not implemented for tool: ${tool}`);
  }
}

// Start HTTP + WebSocket Server
const server = http.createServer(appHandler);

// Initialize DB and serve
await initDb();

if (WebSocketServer) {
  const wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    activeClients.add(ws);
    ws.on('close', () => {
      activeClients.delete(ws);
    });
  });
  console.log('[WS] Live broadcast bridge initialized alongside HTTP server');
}

server.listen(PORT, () => {
  console.log(`[HTTP] Server is active at http://localhost:${PORT}`);
});

// ─── Server-side ACMI Background Poller ──────────────────────────────────────
let lastPollTs = Date.now();
const POLL_INTERVAL = 5000; // 5 seconds

async function startBackgroundPoller() {
  console.log('[ACMI Poller] Server background worker active (5s interval)');
  setInterval(async () => {
    try {
      // 1. Fetch all active tenants
      const allTenants = await dbQuery("SELECT * FROM tenants WHERE status = 'active'");
      
      // Always include a default null tenant if not explicitly in DB
      const tenantsToPoll = [...allTenants];
      if (!tenantsToPoll.some(t => t.id === 'default_tenant')) {
        tenantsToPoll.unshift({
          id: 'default_tenant',
          redis_url: process.env.UPSTASH_REDIS_REST_URL,
          redis_token: process.env.UPSTASH_REDIS_REST_TOKEN
        });
      }

      for (const tenant of tenantsToPoll) {
        let customUrl = tenant.redis_url || null;
        let customToken = tenant.redis_token || null;
        
        // Try connecting. If it fails, fall back to default
        if (customUrl && customToken) {
          try {
            await upstashCmd(['PING'], customUrl, customToken);
          } catch (e) {
            console.warn(`[ACMI Poller] Tenant ${tenant.id} Redis failed, falling back to default:`, e.message);
            customUrl = null;
            customToken = null;
          }
        }

        await acmiContext.run({ customUrl, customToken }, async () => {
          // Find all timeline keys in this tenant's workspace
          const keys = await upstashCmd(['KEYS', 'acmi:*:*:timeline']);
          if (!keys || keys.length === 0) return;

          let hasNewEvents = false;
          let maxEventTs = lastPollTs;

          for (const key of keys) {
            const parts = key.split(':');
            if (parts.length < 4) continue;
            const namespace = parts[1];
            const id = parts[2];

            const newEventsRaw = await upstashCmd(['ZRANGEBYSCORE', key, `(${lastPollTs}`, '+inf']);
            
            if (newEventsRaw && newEventsRaw.length > 0) {
              console.log(`[ACMI Poller - Tenant ${tenant.id}] Detected ${newEventsRaw.length} new event(s) in ${key}`);
              hasNewEvents = true;
              
              for (const evStr of newEventsRaw) {
                try {
                  const ev = JSON.parse(evStr);
                  if (ev.ts && ev.ts > maxEventTs) {
                    maxEventTs = ev.ts;
                  }
                  // Broadcast detailed events
                  broadcast({
                    type: 'acmi-event',
                    tenantId: tenant.id,
                    namespace,
                    id,
                    event: ev
                  });
                } catch (e) {}
              }

              // Broadcast general change to trigger client reload
              broadcast({
                type: 'acmi-change',
                tenantId: tenant.id,
                namespace,
                id,
                action: 'event'
              });
            }
          }

          if (hasNewEvents) {
            lastPollTs = maxEventTs;
          }
        });
      }
    } catch (err) {
      // Gracefully log poll error to avoid server crash
      console.warn('[ACMI Poller] Poll error (retrying):', err.message);
    }
  }, POLL_INTERVAL);
}

// Start poller asynchronously
startBackgroundPoller();

