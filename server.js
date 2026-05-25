import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      CREATE TABLE IF NOT EXISTS users_agents (
          id VARCHAR(100) PRIMARY KEY,
          type VARCHAR(20) NOT NULL CHECK (type IN ('human', 'agent')),
          role VARCHAR(50) NOT NULL REFERENCES rbac_roles(role_name),
          token VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await dbQuery(`
      INSERT INTO users_agents (id, type, role, token) VALUES
      ('michaelshaw', 'human', 'admin', 'sk-gsd-mikey-admin-9982'),
      ('bentley', 'agent', 'agent:read-write', 'sk-gsd-agent-bentley-8812'),
      ('claude-engineer', 'agent', 'agent:read-write', 'sk-gsd-agent-claude-2294')
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
      CREATE TABLE IF NOT EXISTS users_agents (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL CHECK (type IN ('human', 'agent')),
          role TEXT NOT NULL REFERENCES rbac_roles(role_name),
          token TEXT NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbQuery(`
      INSERT OR IGNORE INTO users_agents (id, type, role, token) VALUES
      ('michaelshaw', 'human', 'admin', 'sk-gsd-mikey-admin-9982'),
      ('bentley', 'agent', 'agent:read-write', 'sk-gsd-agent-bentley-8812'),
      ('claude-engineer', 'agent', 'agent:read-write', 'sk-gsd-agent-claude-2294')
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
async function upstashCmd(cmdArray) {
  const url = process.env.UPSTASH_REDIS_REST_URL || 'https://loved-platypus-102968.upstash.io';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAZI4AAIgcDJhNDFlNmUwMjQ5ZWI0ZDNmYWUzNDU2NDc4ZWUxMmQwOA';
  
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
      const row = await dbQueryRow(
        `SELECT ua.*, r.permissions 
         FROM users_agents ua 
         JOIN rbac_roles r ON ua.role = r.role_name 
         WHERE ua.token = ?`,
        [token]
      );
      if (row) {
        let perms = row.permissions;
        if (typeof perms === 'string') {
          try { perms = JSON.parse(perms); } catch (e) { perms = perms.split(','); }
        }
        currentUser = {
          id: row.id,
          type: row.type,
          role: row.role,
          permissions: perms
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

      if (status === 'approved') {
        try {
          let payload = approval.payload;
          if (typeof payload === 'string') {
            payload = JSON.parse(payload);
          }
          // Re-execute enqueued payload directly on Upstash Redis!
          await executeAcmiTool(payload.tool, payload.params);
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
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, status, executed, error: executionError }));
      return;
    }

    // --- POST /api/acmi ---
    else if (pathname === '/api/acmi' && req.method === 'POST') {
      const payload = await parseJsonBody(req);
      const tool = payload.tool;
      const params = payload.params || {};

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

          res.writeHead(202, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: "pending_approval",
            approvalId,
            message: "Action queued for human approval"
          }));
          return;
        }
      }

      // Execute live tool action directly on Upstash Redis
      const result = await executeAcmiTool(tool, params);
      res.writeHead(200, { 'Content-Type': 'application/json' });
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
  switch (tool) {
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
      const profileStr = typeof params.profile === 'string' ? params.profile : JSON.stringify(params.profile);
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
      const signalsStr = typeof params.signals === 'string' ? params.signals : JSON.stringify(params.signals);
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
      const expandedKeys = new Set();

      for (const key of keys) {
        if (key.includes('*')) {
          let pat = key.startsWith('acmi:') ? key : `acmi:${key}`;
          if (!pat.endsWith(':timeline')) pat = `${pat}:timeline`;
          const matched = await upstashCmd(['KEYS', pat]);
          if (Array.isArray(matched)) {
            matched.forEach(k => expandedKeys.add(k));
          }
        } else {
          let fk = key.startsWith('acmi:') ? key : `acmi:${key}`;
          if (!fk.endsWith(':timeline')) fk = `${fk}:timeline`;
          expandedKeys.add(fk);
        }
      }

      for (const k of expandedKeys) {
        const min = sinceMs > 0 ? String(sinceMs) : '-inf';
        const raw = await upstashCmd(['ZRANGEBYSCORE', k, min, '+inf']);
        if (Array.isArray(raw)) {
          raw.forEach(r => {
            try { allEvents.push(JSON.parse(r)); } catch (e) {}
          });
        }
      }

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
