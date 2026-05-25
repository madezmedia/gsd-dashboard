#!/usr/bin/env node
// GSD Dashboard — ACMI Namespace Seed Script
// Run once to populate empty namespaces with initial data.
// Usage: node seed.mjs

const PROXY = process.env.PROXY_URL || 'http://127.0.0.1:4999/acmi-proxy';

async function call(tool, params) {
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, params }),
  });
  return res.json();
}

async function profile(ns, id, data) {
  const r = await call('profile', { namespace: ns, id, data });
  console.log(`  📝 ${ns}:${id} — ${r.ok ? 'OK' : 'FAIL'}`);
}

async function signal(ns, id, data) {
  const r = await call('signal', { namespace: ns, id, data });
  if (!r.ok) console.log(`  ⚠️  signal ${ns}:${id} — ${JSON.stringify(r)}`);
}

async function event(ns, id, source, kind, summary, correlationId) {
  await call('event', { namespace: ns, id, source, kind, summary, correlationId });
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  GSD Dashboard — Namespace Seed');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ─── 1. TASKS (12) ─────────────────────────────────────────────
console.log('📋 Seeding tasks...');
const tasks = [
  { id: 'task-deploy-ownerscout', title: 'Deploy OwnerScout MVP', priority: 'P0', status: 'today', owner: '@claude-engineer', due: '2026-05-28', tags: ['ownerscout', 'deploy'] },
  { id: 'task-whop-launch', title: 'Whop ACMI Starter Kit Launch', priority: 'P0', status: 'today', owner: '@antigravity', due: '2026-05-27', tags: ['whop', 'launch'] },
  { id: 'task-avery-phone', title: 'Assign Phone Number to Avery VAPI', priority: 'P1', status: 'week', owner: '@bentley', due: '2026-05-29', tags: ['avery', 'vapi'] },
  { id: 'task-gsd-docs', title: 'Write GSD Dashboard Documentation', priority: 'P1', status: 'week', owner: '@opencode', due: '2026-05-30', tags: ['docs', 'gsd'] },
  { id: 'task-grok-content', title: 'Grok Content Calendar for Folana', priority: 'P1', status: 'week', owner: '@grok', due: '2026-05-30', tags: ['grok', 'folana'] },
  { id: 'task-acmi-template', title: 'ACMI Built-in MCP Template Docs', priority: 'P2', status: 'month', owner: '@gemini-cli', due: '2026-06-02', tags: ['acmi', 'mcp'] },
  { id: 'task-design-review', title: 'GSD Dashboard Design Review', priority: 'P2', status: 'month', owner: '@design-brand-guardian', due: '2026-06-01', tags: ['design', 'review'] },
  { id: 'task-trinity-analysis', title: 'Review Trinity Competitive Analysis', priority: 'P2', status: 'month', owner: '@mikey', due: '2026-06-05', tags: ['trinity', 'competitive'] },
  { id: 'task-calendar-widget', title: 'Wire Calendar Event Creation', priority: 'P2', status: 'backlog', owner: '@opencode', due: '2026-06-07', tags: ['calendar', 'ui'] },
  { id: 'task-notes-search', title: 'Add Full-Text Search to Notes', priority: 'P3', status: 'backlog', owner: '@design-ui-designer', due: '2026-06-10', tags: ['notes', 'search'] },
  { id: 'task-dark-mode', title: 'Dark Mode Polish Pass', priority: 'P3', status: 'backlog', owner: '@design-whimsy-injector', due: '2026-06-12', tags: ['ui', 'theme'] },
  { id: 'task-export-csv', title: 'Export Dashboard Data as CSV', priority: 'P3', status: 'backlog', owner: '@opencode', due: '2026-06-15', tags: ['export', 'data'] },
];

for (const t of tasks) {
  await profile('task', t.id, {
    title: t.title, priority: t.priority, status: t.status,
    owner: t.owner, dueDate: t.due, tags: t.tags,
  });
  await signal('task', t.id, { completed: false, blocked: false });
}
console.log(`  ✅ ${tasks.length} tasks seeded\n`);

// ─── 2. NOTES (5) ──────────────────────────────────────────────
console.log('📓 Seeding notes...');
const notes = [
  { id: 'note-acmi-arch', title: 'ACMI Fleet Architecture', content: '# ACMI Fleet Architecture\n\n## Overview\nACMI gives every agent three things:\n- **Profile** — who they are\n- **Signals** — what they\'re doing now\n- **Timeline** — what they\'ve done\n\n## Key Patterns\n- `correlationId`: descriptiveCamelCase-msEpoch\n- Namespaces: agent, work, thread, task, note, event, doc, config\n- Bootstrap before acting', tags: ['architecture', 'acmi'], pinned: true },
  { id: 'note-gsd-devlog', title: 'GSD Dashboard Dev Log', content: '# GSD Dashboard Development Log\n\n## May 24 — Full ACMI Wiring Complete\n- Command Center: live KPI from agents + work items\n- Agent Console: live agent grid + bootstrap detail\n- Project Tracker: live pipeline from work items\n- Proxy server: all 17 ACMI tools proxied to Upstash\n\n## Next\n- Seed task/note/event/doc namespaces\n- Create initialization script for new users', tags: ['devlog', 'gsd'], pinned: false },
  { id: 'note-whop-strategy', title: 'Whop Launch Strategy', content: '# Whop Launch Strategy\n\n## Products\n1. **ACMI Starter Kit** — $47 one-time (43 files, 170KB)\n2. **ACMI Lab** — $39/mo (Discord role-gate, weekly cadence)\n\n## Status\n- Landing page: LIVE at acmi-product.vercel.app\n- ZIP: v1.1 at /Users/michaelshaw/clawd/projects/acmi-starter-kit/\n- Whop products: created, need image assignment + checkout wiring\n\n## Blockers\n- None — all keys available in ~/clawd/.env', tags: ['whop', 'strategy', 'revenue'], pinned: false },
  { id: 'note-avery-spec', title: 'Avery VAPI — Real Estate Voice Agent', content: '# Avery — Real Estate Acquisition Voice Agent\n\n## VAPI Config\n- Assistant ID: 5633f53a-03d5-4c8c-b2dd-5ffb1f3f5986\n- Voice: Clara\n- Model: gpt-4o-mini (0.4 temp)\n- Transcriber: Deepgram Nova-3\n\n## 8 Functions\n1. lookupProperty — address → property facts\n2. estimateARV — after-repair value range\n3. analyzeComps — comparable sales\n4. scoreOpportunity — 0-100 deal score\n5. logAcquisitionLead — persist + ACMI event\n6. queueFollowUp — human-reviewed follow-up\n7. escalateHotDeal — urgent notification\n8. optOutDoNotCall — compliance suppression\n\n## Dashboard\nDeployed: https://7af345b8-7d79-40bb-ab79-ba79bcbcfc4.vercel.app', tags: ['avery', 'vapi', 'real-estate'], pinned: true },
  { id: 'note-grok-onboarding', title: 'Grok Fleet Onboarding Notes', content: '# Grok — Influencer Fleet Orchestrator\n\n## Onboarded: May 24\n- Profile: agent:grok, 🌌 #1DA1F2\n- Role: Influencer Fleet Orchestrator\n- Capabilities: xAI Imagine (image gen), xAI Video, vision analysis\n\n## Manages\n- folana — AI influencer, content creation\n- folana-journal — journal app, brain ingest\n- artist-factory-agent — creative production\n- fanvue_orchestrator — fanvue pipeline', tags: ['grok', 'onboarding', 'influencer'], pinned: false },
];

for (const n of notes) {
  const ts = new Date().toISOString();
  await profile('note', n.id, {
    title: n.title, content: n.content,
    preview: n.content.substring(0, 120).replace(/\n/g, ' '),
    tags: n.tags, modified: ts,
  });
  await signal('note', n.id, { pinned: n.pinned, wordCount: n.content.length, version: 1 });
}
console.log(`  ✅ ${notes.length} notes seeded\n`);

// ─── 3. EVENTS (6) ─────────────────────────────────────────────
console.log('📅 Seeding events...');
const events = [
  { id: 'event-design-review', title: 'GSD Dashboard Design Review', type: 'milestone', start: '2026-05-26T10:00:00Z', end: '2026-05-26T11:30:00Z' },
  { id: 'event-whop-launch', title: 'Whop Product Launch Window', type: 'deadline', start: '2026-05-27T09:00:00Z', end: '2026-05-27T17:00:00Z' },
  { id: 'event-ownerscout-deploy', title: 'OwnerScout MVP Deploy', type: 'deadline', start: '2026-05-28T00:00:00Z', end: '2026-05-28T23:59:00Z', allDay: true },
  { id: 'event-sprint-review', title: 'Sprint Review — May Wk4', type: 'milestone', start: '2026-05-29T14:00:00Z', end: '2026-05-29T15:00:00Z' },
  { id: 'event-folana-content', title: 'Folana Content Drop', type: 'task', start: '2026-05-30T12:00:00Z', end: '2026-05-30T14:00:00Z' },
  { id: 'event-q2-planning', title: 'Q2 Planning Session', type: 'milestone', start: '2026-06-02T09:00:00Z', end: '2026-06-02T12:00:00Z' },
];

for (const e of events) {
  await profile('event', e.id, {
    title: e.title, type: e.type, start: e.start, end: e.end, allDay: e.allDay || false,
  });
  await signal('event', e.id, { reminderSent: false, acknowledged: false });
}
console.log(`  ✅ ${events.length} events seeded\n`);

// ─── 4. DOCS (4) ──────────────────────────────────────────────
console.log('📄 Seeding docs...');
const docs = [
  { id: 'doc-acmi-arch', title: 'ACMI Fleet Architecture v1.3', type: 'Spec', content: '# ACMI Fleet Architecture v1.3\n\n## Protocol\nThree-pillar state: Profile (who), Signals (now), Timeline (then).\n\n## Namespaces\n- agent, work, thread, task, note, event, doc, config\n- Each entity has :profile, :signals, :timeline\n\n## Correlation\n- Format: camelCaseDescriptive-msEpoch\n- parentCorrelationId for chain tracking\n\n## Fleet\n- 55+ agents\n- 200+ work items\n- 3 orchestrators: Bentley (lead), Grok (influencer), OpenCode (dev+design)' },
  { id: 'doc-ownerscout-brief', title: 'OwnerScout Product Brief', type: 'Brief', content: '# OwnerScout — Restaurant Lead Generation\n\n## Value Proposition\n$8,752/mo pipeline connecting independent restaurants with Owner.com\n\n## Target\nIndependent restaurants with delivery focus\n\n## Commission\n$1,000 per Owner.com signup\n\n## Status\nVAPI integration complete. Webhook setup in progress. Blocked on nothing — all keys available.' },
  { id: 'doc-gsd-spec', title: 'GSD Dashboard Technical Spec', type: 'Spec', content: '# GSD Dashboard — Technical Specification\n\n## Stack\n- Single HTML file (SPA)\n- CSS custom properties (warm paper + forest green)\n- Vanilla JS (no framework)\n- ACMI proxy server (Node.js)\n\n## 8 Pages\n1. Command Center — KPI strip, agent cards, timeline\n2. Todo List — Kanban + Gantt\n3. Notes — editor with auto-save\n4. Project Tracker — pipeline funnel\n5. Calendar — month grid\n6. Docs — tree + viewer\n7. Agent Console — fleet grid\n8. Settings — config, export\n\n## Data Flow\nBrowser → POST /acmi-proxy → server.mjs → Upstash Redis REST API' },
  { id: 'doc-secret-manager', title: 'Secret Management Guide', type: 'Guide', content: '# Secret Management\n\n## Where secrets live\n- ~/clawd/.env — all API keys\n- ~/.hermes/.env — Hermes-specific keys\n- AES-256 encrypted local vault\n\n## Keys available\nWHOP, VAPI, ANTHROPIC, OPENAI, DEEPSEEK, FAL, ELEVENLABS, GEMINI, XAI, RUNPOD, POSTIZ, GROQ, HUGGINGFACE\n\n## Best practices\n- Never commit .env files\n- Use `source ~/clawd/.env` before running services\n- Rotate tokens quarterly' },
];

for (const d of docs) {
  await profile('doc', d.id, {
    title: d.title, type: d.type, content: d.content,
    updated: new Date().toISOString(),
  });
  await signal('doc', d.id, { isTemplate: false, read: false });
}
console.log(`  ✅ ${docs.length} docs seeded\n`);

// ─── 5. CONFIG ────────────────────────────────────────────────
console.log('⚙️  Seeding config...');
await profile('config', 'dashboard', {
  apiKeys: {
    whop: { status: 'connected', label: 'Whop API' },
    vapi: { status: 'connected', label: 'VAPI.ai' },
    anthropic: { status: 'connected', label: 'Anthropic' },
    openai: { status: 'connected', label: 'OpenAI' },
    deepseek: { status: 'connected', label: 'DeepSeek' },
    fal: { status: 'connected', label: 'FAL.ai' },
    elevenlabs: { status: 'connected', label: 'ElevenLabs' },
    gemini: { status: 'connected', label: 'Google Gemini' },
    xai: { status: 'connected', label: 'xAI' },
    upstash: { status: 'connected', label: 'Upstash Redis' },
  },
  version: '1.0.0',
  lastSync: new Date().toISOString(),
});
await signal('config', 'dashboard', {
  widgets: { command: true, todo: true, notes: true, projects: true, calendar: true, docs: true, agents: true, settings: true },
  darkMode: false,
  compactMode: false,
});
console.log(`  ✅ config:dashboard seeded\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  ✅ Seed complete — ${tasks.length + notes.length + events.length + docs.length} records + config`);
console.log('  📊 Refresh http://127.0.0.1:4999/ to see live data');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
