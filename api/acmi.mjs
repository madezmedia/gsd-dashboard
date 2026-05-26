// ═══════════════════════════════════════════════════════════════════════
//  ACMI API — Vercel Serverless Function
//  Proxy: Browser → Upstash Redis via acmi-client.js calls
//  ═══════════════════════════════════════════════════════════════════════

// Upstash Redis credentials (override with Vercel env vars)
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://loved-platypus-102968.upstash.io';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAZI4AAIgcDJhNDFlNmUwMjQ5ZWI0ZDNmYWUzNDU2NDc4ZWUxMmQwOA';

// ─── Redis Command Executor ──────────────────────────────────────────
async function upstashCmd(cmdArray) {
  const res = await fetch(`${UPSTASH_URL.replace(/\/$/, '')}/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cmdArray.map(String))
  });
  if (!res.ok) {
    throw new Error(`Upstash Redis error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(`Upstash Redis command error: ${data.error}`);
  return data.result;
}

// ─── ACMI Tool Router ────────────────────────────────────────────────
async function executeAcmiTool(tool, params) {
  switch (tool) {

    case 'acmi_list': {
      const pattern = `acmi:${params.namespace}:*`;
      const raw = await upstashCmd(['KEYS', pattern]);
      if (!Array.isArray(raw)) return [];
      // Extract IDs from keys: acmi:<ns>:<id>:profile → <id>
      const ids = new Set();
      raw.forEach(k => {
        const parts = k.split(':');
        // keys are like acmi:agent:bentley:profile — ID is parts[2]
        if (parts.length >= 3) ids.add(parts[2]);
      });
      return [...ids];
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
      return { success: true };
    }

    case 'acmi_signal': {
      const entityId = `${params.namespace}:${params.id}`;
      const newSignals = typeof params.signals === 'string' ? JSON.parse(params.signals) : params.signals;
      const existingRaw = await upstashCmd(['GET', `acmi:${entityId}:signals`]);
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      const merged = { ...existing, ...newSignals };
      await upstashCmd(['SET', `acmi:${entityId}:signals`, JSON.stringify(merged)]);
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
        correlationId: params.correlationId || `evt-${ts}`
      };
      await upstashCmd(['ZADD', `acmi:${entityId}:timeline`, ts, JSON.stringify(event)]);
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
          if (Array.isArray(matched)) matched.forEach(k => expandedKeys.add(k));
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
          raw.forEach(r => { try { allEvents.push(JSON.parse(r)); } catch (e) {} });
        }
      }
      allEvents.sort((a, b) => a.ts - b.ts);
      return allEvents.slice(-limit);
    }

    case 'acmi_delete': {
      const key = params.key;
      const confirm = params.confirm === true;
      if (!confirm) return { dry_run: true, keys: [key] };
      await upstashCmd(['DEL', key]);
      return { deleted: true, keys: [key] };
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
      return { agentId, profile, signals, activeThreads: [], rollup, recentTimeline: timeline, spawns: [] };
    }

    case 'acmi_spawn': {
      const agentId = params.agentId;
      const ts = Date.now();
      const event = {
        ts,
        source: `agent:${agentId}`,
        kind: 'spawn',
        correlationId: `spawn-${agentId}-${ts}`,
        summary: `[spawn] Agent spawned.`
      };
      await upstashCmd(['ZADD', `acmi:agent:${agentId}:timeline`, ts, JSON.stringify(event)]);
      return { sessionId: params.sessionId || `session-${ts}` };
    }

    case 'acmi_active':
      return [];

    case 'acmi_rollup_set': {
      const agentId = params.agentId;
      const rollupStr = typeof params.rollup === 'string' ? params.rollup : JSON.stringify(params.rollup);
      await upstashCmd(['SET', `acmi:agent:${agentId}:rollup:latest`, rollupStr]);
      return { success: true };
    }

    // Work items wrappers
    case 'acmi_work_create':
      return executeAcmiTool('acmi_profile', { namespace: 'work', id: params.id, profile: params.profile });

    case 'acmi_work_event':
      return executeAcmiTool('acmi_event', { namespace: 'work', id: params.id, source: params.source, summary: params.summary, kind: 'work-update' });

    case 'acmi_work_signal':
      return executeAcmiTool('acmi_signal', { namespace: 'work', id: params.id, signals: params.signals });

    case 'acmi_work_get':
      return executeAcmiTool('acmi_get', { namespace: 'work', id: params.id });

    case 'acmi_work_list':
      return executeAcmiTool('acmi_list', { namespace: 'work' });

    case 'acmi_dashboard_bootstrap': {
      const maxAgents = params.maxAgents || 20;
      const maxWork = params.maxWork || 20;
      const timelineSince = params.timelineSince || '7d';

      // 1. List all entity types in parallel
      const [agentIds, workIds, configData, taskIds, noteIds, eventIds, docIds] = await Promise.all([
        executeAcmiTool('acmi_list', { namespace: 'agent' }),
        executeAcmiTool('acmi_list', { namespace: 'work' }),
        executeAcmiTool('acmi_get', { namespace: 'config', id: 'dashboard' }).catch(() => null),
        executeAcmiTool('acmi_list', { namespace: 'task' }).catch(() => []),
        executeAcmiTool('acmi_list', { namespace: 'note' }).catch(() => []),
        executeAcmiTool('acmi_list', { namespace: 'event' }).catch(() => []),
        executeAcmiTool('acmi_list', { namespace: 'doc' }).catch(() => [])
      ]);

      // 2. Batch-fetch top N agents (server-side — no HTTP round trips)
      const agentSlice = (agentIds || []).slice(0, maxAgents);
      const agentPromises = agentSlice.map(id =>
        executeAcmiTool('acmi_get', { namespace: 'agent', id }).catch(() => null)
      );
      const agentResults = await Promise.all(agentPromises);
      const agents = agentSlice.map((id, i) => ({
        id,
        profile: agentResults[i]?.profile || null,
        signals: agentResults[i]?.signals || null
      }));

      // 3. Batch-fetch top N work items
      const workSlice = (workIds || []).slice(0, maxWork);
      const workPromises = workSlice.map(id =>
        executeAcmiTool('acmi_get', { namespace: 'work', id }).catch(() => null)
      );
      const workResults = await Promise.all(workPromises);
      const workItems = workSlice.map((id, i) => ({
        id,
        profile: workResults[i]?.profile || null,
        signals: workResults[i]?.signals || null
      }));

      // 4. Batch-fetch tasks, notes, events, and docs
      const tasks = await Promise.all((taskIds || []).slice(0, 20).map(async id => {
        const res = await executeAcmiTool('acmi_get', { namespace: 'task', id }).catch(() => null);
        return res ? { id, profile: res.profile, signals: res.signals } : null;
      })).then(r => r.filter(Boolean));

      const notes = await Promise.all((noteIds || []).slice(0, 20).map(async id => {
        const res = await executeAcmiTool('acmi_get', { namespace: 'note', id }).catch(() => null);
        return res ? { id, profile: res.profile, signals: res.signals } : null;
      })).then(r => r.filter(Boolean));

      const events = await Promise.all((eventIds || []).slice(0, 50).map(async id => {
        const res = await executeAcmiTool('acmi_get', { namespace: 'event', id }).catch(() => null);
        return res ? { id, profile: res.profile, signals: res.signals } : null;
      })).then(r => r.filter(Boolean));

      const docs = await Promise.all((docIds || []).slice(0, 20).map(async id => {
        const res = await executeAcmiTool('acmi_get', { namespace: 'doc', id }).catch(() => null);
        return res ? { id, profile: res.profile, signals: res.signals } : null;
      })).then(r => r.filter(Boolean));

      // 5. Fetch merged timeline
      const timeline = await executeAcmiTool('acmi_cat', {
        keys: ['agent:*', 'thread:*', 'work:*'],
        since: timelineSince,
        limit: params.timelineLimit || 100
      }).catch(() => []);

      return {
        agents,
        workItems,
        config: configData?.profile || configData || {},
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

    default:
      throw new Error(`ACMI Tool not implemented: ${tool}`);
  }
}

// ─── Vercel Serverless Handler ───────────────────────────────────────
export default async function handler(req, res) {
  // CORS headers for browser access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Health check
  if (req.url === '/api/acmi/health' || req.body?.tool === 'health') {
    return res.status(200).json({ status: 'ok', service: 'acmi-proxy', upstream: UPSTASH_URL });
  }

  try {
    const { tool, params } = req.body || {};
    if (!tool) {
      return res.status(400).json({ error: 'Missing "tool" field in request body.' });
    }

    const result = await executeAcmiTool(tool, params || {});
    return res.status(200).json(result);
  } catch (err) {
    console.error('[ACMI-API] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
