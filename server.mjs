#!/usr/bin/env node
// GSD Dashboard ACMI Proxy Server
// Translates MCP-style {tool, params} calls to Upstash Redis REST API

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 4999;
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  console.error('ERROR: Source ~/clawd/.env first — need UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// ─── Upstash REST helper ──────────────────────────────────────────
async function redis(...cmd) {
  const res = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cmd),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

// ─── Tool dispatcher ──────────────────────────────────────────────
async function handleTool(tool, params) {
  switch (tool) {
    // ── Entity listing ──────────────────────────────────────────
    case 'list': {
      const ns = params.namespace;
      if (ns === 'agent') return await redis('SMEMBERS', 'acmi:agent:list');
      if (ns === 'thread') return await redis('SMEMBERS', 'acmi:thread:list');
      if (ns === 'work')   return await redis('SMEMBERS', 'acmi:work:list');
      if (ns === 'task')   return await redis('SMEMBERS', 'acmi:task:list');
      if (ns === 'note')   return await redis('SMEMBERS', 'acmi:note:list');
      if (ns === 'event')  return await redis('SMEMBERS', 'acmi:event:list');
      if (ns === 'doc')    return await redis('SMEMBERS', 'acmi:doc:list');
      return [];
    }

    // ── Entity get (profile + signals + timeline) ───────────────
    case 'get': {
      const { namespace: ns2, id } = params;
      const prefix = `acmi:${ns2}:${id}`;
      let profile = {}, signals = {}, timeline = [];

      try { profile = await redis('HGETALL', `${prefix}:profile`); } catch {}
      try { signals = await redis('HGETALL', `${prefix}:signals`); } catch {}
      try { const raw = await redis('ZREVRANGE', `${prefix}:timeline`, 0, 9);
        timeline = raw.map(e => { try { return JSON.parse(e); } catch { return { summary: e }; } }); } catch {}

      // HGETALL returns flat array [k1,v1,k2,v2,...]
      const obj = a => { const o = {}; for (let i = 0; i < a.length; i += 2) o[a[i]] = a[i+1]; return o; };
      const p = obj(profile);
      const s = obj(signals);
      // Try to parse JSON string values
      for (const k in p) { try { p[k] = JSON.parse(p[k]); } catch {} }
      for (const k in s) { try { s[k] = JSON.parse(s[k]); } catch {} }

      return { profile: p, signals: s, timeline };
    }

    // ── Multi-stream merge ──────────────────────────────────────
    case 'cat': {
      const keys = params.keys || [];
      const since = params.since || '24h';
      const limit = params.limit || 50;
      const msAgo = since.endsWith('h') ? parseInt(since) * 3600000
        : since.endsWith('d') ? parseInt(since) * 86400000
        : since.endsWith('m') ? parseInt(since) * 60000
        : 86400000;
      const minTs = Date.now() - msAgo;

      const all = [];
      for (const key of keys) {
        try {
          const raw = await redis('ZREVRANGEBYSCORE', key, '+inf', minTs, 'LIMIT', 0, limit);
          for (const e of raw) {
            try {
              const ev = JSON.parse(e);
              ev._sourceKey = key;
              all.push(ev);
            } catch {}
          }
        } catch {}
      }
      all.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      return all.slice(0, limit);
    }

    // ── Profile write ───────────────────────────────────────────
    case 'profile': {
      const { namespace: ns3, id: id3, data } = params;
      const prefix = `acmi:${ns3}:${id3}`;
      const flat = [];
      for (const [k, v] of Object.entries(data || {}))
        flat.push(k, typeof v === 'string' ? v : JSON.stringify(v));
      if (flat.length) await redis('HMSET', `${prefix}:profile`, ...flat);
      // Ensure entity appears in namespace list
      await redis('SADD', `acmi:${ns3}:list`, id3);
      return { ok: true };
    }

    // ── Signal write ────────────────────────────────────────────
    case 'signal': {
      const { namespace: ns4, id: id4, data: data4 } = params;
      const flat2 = [];
      for (const [k, v] of Object.entries(data4 || {}))
        flat2.push(k, typeof v === 'string' ? v : JSON.stringify(v));
      if (flat2.length) await redis('HMSET', `acmi:${ns4}:${id4}:signals`, ...flat2);
      return { ok: true };
    }

    // ── Event append ────────────────────────────────────────────
    case 'event': {
      const { namespace: ns5, id: id5, source, summary, kind, correlationId } = params;
      const ts = Date.now();
      const event = JSON.stringify({ ts, source, kind, correlationId, summary });
      await redis('ZADD', `acmi:${ns5}:${id5}:timeline`, ts, event);
      return { ok: true, ts };
    }

    // ── Delete ──────────────────────────────────────────────────
    case 'delete': {
      // Handled by the daemon's ACMI delete tool — pass through for now
      return { ok: false, error: 'delete not supported via proxy' };
    }

    // ── Work item operations ────────────────────────────────────
    case 'workList': {
      const ids = await redis('SMEMBERS', 'acmi:work:list');
      return ids || [];
    }

    case 'workGet': {
      const wid = params.id;
      const prefix2 = `acmi:work:${wid}`;
      let profile2 = {}, signals2 = {}, timeline2 = [];
      try {
        const raw = await redis('HGETALL', `${prefix2}:profile`);
        for (let i = 0; i < raw.length; i += 2) {
          profile2[raw[i]] = raw[i+1];
          try { profile2[raw[i]] = JSON.parse(profile2[raw[i]]); } catch {}
        }
      } catch {}
      try {
        const raw2 = await redis('HGETALL', `${prefix2}:signals`);
        for (let i = 0; i < raw2.length; i += 2) {
          signals2[raw2[i]] = raw2[i+1];
          try { signals2[raw2[i]] = JSON.parse(signals2[raw2[i]]); } catch {}
        }
      } catch {}
      try {
        const raw3 = await redis('ZREVRANGE', `${prefix2}:timeline`, 0, 9);
        timeline2 = raw3.map(e => { try { return JSON.parse(e); } catch { return { summary: e }; } });
      } catch {}
      return { profile: profile2, signals: signals2, timeline: timeline2 };
    }

    case 'workCreate': {
      const { id: wid2, profile: data6 } = params;
      const flat3 = [];
      for (const [k, v] of Object.entries(data6 || {}))
        flat3.push(k, typeof v === 'string' ? v : JSON.stringify(v));
      if (flat3.length) await redis('HMSET', `acmi:work:${wid2}:profile`, ...flat3);
      await redis('SADD', 'acmi:work:list', wid2);
      return { ok: true };
    }

    case 'workSignal': {
      const { id: wid3, data: data7 } = params;
      const flat4 = [];
      for (const [k, v] of Object.entries(data7 || {}))
        flat4.push(k, typeof v === 'string' ? v : JSON.stringify(v));
      if (flat4.length) await redis('HMSET', `acmi:work:${wid3}:signals`, ...flat4);
      return { ok: true };
    }

    case 'workEvent': {
      const { id: wid4, source: src, summary: sum, kind: knd, correlationId: cid } = params;
      const ts2 = Date.now();
      const ev2 = JSON.stringify({ ts: ts2, source: src, kind: knd, correlationId: cid, summary: sum });
      await redis('ZADD', `acmi:work:${wid4}:timeline`, ts2, ev2);
      return { ok: true, ts: ts2 };
    }

    // ── Bootstrap ───────────────────────────────────────────────
    case 'bootstrap': {
      const aid = params.agentId;
      try {
        const ctx = await handleTool('get', { namespace: 'agent', id: aid });
        let rollup = {};
        try {
          const r = await redis('HGETALL', `acmi:agent:${aid}:rollup:latest`);
          for (let i = 0; i < r.length; i += 2) { rollup[r[i]] = r[i+1]; try { rollup[r[i]] = JSON.parse(rollup[r[i]]); } catch {} }
        } catch {}
        const all = [];
        try {
          const ids = await redis('SMEMBERS', 'acmi:agent:list');
          for (const a of ids || []) {
            try { all.push({ id: a, data: await handleTool('get', { namespace: 'agent', id: a }) }); } catch {}
          }
        } catch {}
        return { profile: ctx.profile, signals: ctx.signals, timeline: ctx.timeline, rollup, agents: all };
      } catch (e) {
        return { profile: {}, signals: {}, timeline: [], rollup: {}, agents: [], error: e.message };
      }
    }

    // ── Dashboard bootstrap (aggregate) ─────────────────────────
    case 'dashboardBootstrap': {
      const agentIds = await handleTool('list', { namespace: 'agent' }) || [];
      const workIds = await handleTool('workList', {}) || [];
      let config = {};
      try { config = await handleTool('get', { namespace: 'config', id: 'dashboard' }); } catch {}

      const agents = [];
      for (const id of agentIds.slice(0, 60)) {
        try { agents.push(await handleTool('get', { namespace: 'agent', id })); } catch {}
      }
      const workItems = [];
      for (const id of workIds.slice(0, 200)) {
        try { workItems.push(await handleTool('workGet', { id })); } catch {}
      }
      let timeline = [];
      try {
        timeline = await handleTool('cat', { keys: ['acmi:thread:agent-coordination:timeline'], since: '24h', limit: 50 });
      } catch {}

      return { agents, workItems, config, timeline, events: [], docs: [], notes: [], tasks: [] };
    }

    default:
      return { error: `Unknown tool: ${tool}` };
  }
}

// ─── HTTP Server ──────────────────────────────────────────────────
const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ACMI proxy endpoint
  if (req.url === '/acmi-proxy' && req.method === 'POST') {
    let body = [];
    req.on('data', c => body.push(c));
    req.on('end', async () => {
      try {
        const { tool, params } = JSON.parse(Buffer.concat(body).toString());
        const result = await handleTool(tool, params || {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', acmi: 'connected' }));
    return;
  }

  // Static files
  let filePath = join(__dirname, req.url === '/' ? 'gsd-dashboard.html' : req.url);
  if (!existsSync(filePath)) filePath = join(__dirname, 'gsd-dashboard.html');
  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n  🚗 GSD Dashboard — http://127.0.0.1:${PORT}`);
  console.log(`  📡 ACMI proxy    — http://127.0.0.1:${PORT}/acmi-proxy`);
  console.log(`  🟢 Health check  — http://127.0.0.1:${PORT}/health\n`);
});
