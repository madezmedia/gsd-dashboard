# GSD Dashboard — Backend Wiring Guide

## For the Dev Team: Wire Real ACMI Data Into the UI

**File root:** `/Users/michaelshaw/Projects/open-design/.od/projects/b0867076-555a-4da3-a39f-a10c81d44368/`
**Base URL (Vercel):** `https://gsd-dashboard.vercel.app`
**GitHub:** `https://github.com/madezmedia/gsd-dashboard`
**ACMI Client:** `acmi-client.js` (781 lines, 17 MCP wrappers)
**Full Plan:** `ACMI-INTEGRATION-PLAN.md` (607 lines, 6 phases)

---

## Quick Start — How ACMI Data Flows

```
Dashboard HTML  →  acmi-client.js  →  /api/acmi  →  Upstash Redis (ACMI keys)
                         ↓
                   TTL Cache (15s default)
                         ↓
                   Polling (per-page interval)
```

**`acmi-client.js` exposes `window.acmi`** — a global with 17 methods.
Just include `<script src="acmi-client.js"></script>` before the app script.

---

## File Map — What Each File Does

| File | Path | Purpose |
|---|---|---|
| **Main App** | `gsd-dashboard.html` | 8-page SPA — all pages, all interactions |
| **Launcher** | `index.html` | Portal linking to all screens |
| **Screens** | `screens/task-detail.html` | Full task with subtasks, comments, history |
| | `screens/note-detail.html` | Rich editor with toolbar, tags, auto-save |
| | `screens/project-detail.html` | Deep-dive with milestones, budget, agents |
| | `screens/event-detail.html` | Day view with hourly slots, event panel |
| | `screens/doc-viewer.html` | Doc reader with ToC, search, rendered content |
| | `screens/agent-detail.html` | Agent shell with KPIs, KV table, timeline, comm |
| **Client** | `acmi-client.js` | ACMI MCP wrapper — use this to fetch/write data |
| **Fleet Ops** | `fleet-ops.html` | Fleet operator dashboard — 57 agents, health signals, stalled items, archival queue |
| | `agent.html` | Standalone agent detail view |
| | `timeline.html` | Standalone ACMI timeline stream |
| | `acmi-fleet-command.html` | Earlier fleet command prototype |
| | `marketing.html` | Product marketing landing page |
| **Design Reports** | `design-fidelity-audit.md` | Bentley's 82/100 fidelity audit |
| | `ux-implementation-audit.md` | UX architect's 43/100 accessibility audit |
| | `brand-consistency-audit.md` | Brand guardian's 72/100 brand audit |
| | `visual-narrative-audit.md` | Visual storyteller's 4.5/10 narrative score |
| | `design-review-consolidated.md` | Design agency 73/100 consolidated findings |
| | `usability-heuristic-evaluation.md` | UX researcher's heuristics |
| | `code-review-fixes.md` | OpenCode's security pass + XSS fix |
| | `gsd-dashboard-design-review.md` | 4-agent review panel summary |

---

## ACMI Namespaces & Key Map

### Existing Namespaces (already in use by the fleet)

| Namespace | Example Key | What It Stores |
|---|---|---|
| `acmi:agent:<id>:profile` | `acmi:agent:claude-engineer:profile` | Agent identity, role, persona |
| `acmi:agent:<id>:signals` | `acmi:agent:gemini-cli:signals` | Agent status, current_focus, heartbeat |
| `acmi:agent:<id>:timeline` | `acmi:agent:bentley:timeline` | Agent event history |
| `acmi:thread:<name>:profile` | `acmi:thread:agent-coordination:profile` | Thread topic, owner, participants |
| `acmi:thread:<name>:signals` | `acmi:thread:design-review-gsd-dashboard:signals` | Thread phase, status |
| `acmi:thread:<name>:timeline` | — | Thread event log |
| `acmi:work:<id>:profile` | `acmi:work:gsd-dashboard-acmi-integration:profile` | Work item title, owner, phase |
| `acmi:work:<id>:signals` | — | Work status, blockers, assigned_to |
| `acmi:work:<id>:timeline` | — | Work event history |

### New Namespaces Needed for Dashboard

| Namespace | Purpose | When | Data Shape |
|---|---|---|---|
| `acmi:task:<uuid>:profile` | Todo list items | Phase 3 | `{title, priority, status, assignee, due_date, tags, created_at, updated_at}` |
| `acmi:task:<uuid>:signals` | Task state | Phase 3 | `{status: 'today'/'week'/'month'/'backlog'/'done'}` |
| `acmi:note:<uuid>:profile` | Notes content | Phase 3 | `{title, content, preview, tags: [], modified_at, created_at}` |
| `acmi:event:<uuid>:profile` | Calendar events | Phase 4 | `{title, start, end, type: 'deadline'/'milestone'/'task', description}` |
| `acmi:doc:<name>:profile` | Documentation | Phase 5 | `{title, content, type: 'doc'/'template', tags: [], updated_at}` |
| `acmi:config:gsd-dashboard:profile` | Dashboard settings | Phase 5 | `{dark_mode, widgets: {kpi, timeline, agent_grid, ...}, api_keys}` |

---

## Data Wire-Up: Page by Page

### Page 1 — Command Center (`[data-page="0"]`)

**What to replace (mock → live):**

```
→ KPI strip (6 numbers): acmi_list + acmi_cat aggregations
→ Urgent action items: acmi_work_list filtered by priority=P0|P1
→ Active agents grid: acmi_list('agent') → acmi_get each agent
→ Timeline feed: acmi_cat(keys=[all agents], since='24h')
```

**Integration hooks already in the HTML:**

```javascript
// Line 2876+: ACMI integration block
// Line 2916: updateACMIStatus() — checks acmi connection
// Line 2950+: _loadAgentData() — fetches and renders agent grid
// Line 3000+: _loadTimeline() — fetches timeline events

// Example — fetch agents live:
const agentIds = await window.acmi.list('agent');
const agents = await Promise.all(
  agentIds.map(id => window.acmi.get('agent', id))
);
// Then render into .agent-grid
```

---

### Page 2 — Todo List (`[data-page="1"]`)

**What to replace:**

```
→ Progress strip: count tasks by status (today/week/month)
→ Kanban columns: acmi_list('task') → filter by signals.status
→ Gantt bars: tasks with start/end dates rendered as positioned bars
→ Add task: acmi_work_create or acmi_profile('task', uuid, {title, priority, ...})
```

**Integration points:**

```javascript
// addTask() at line 2810 — currently creates DOM element only
// Replace with:
async function addTask(title, priority, column) {
  const uuid = crypto.randomUUID();
  await window.acmi.profile('task', uuid, { title, priority, status: column });
  // Re-render kanban column
}
```

---

### Page 3 — Notes (`[data-page="2"]`)

**What to replace:**

```
→ Notes list: acmi_list('note') → acmi_get each
→ Note editor load/save: acmi_profile('note', id, {content, title, tags, ...})
→ Auto-save: debounced acmi_profile call
```

---

### Page 4 — Project Tracker (`[data-page="3"]`)

**What to replace:**

```
→ Pipeline funnel: acmi_work_list → aggregate by profile.stage
→ Project cards: acmi_work_get per active project
→ Health dashboard: derived from signals + timeline recency
```

---

### Page 5 — Calendar (`[data-page="4"]`)

**What to replace:**

```
→ Month grid events: acmi_list('event') → acmi_get each, filter by month
→ ACMI timeline integration: acmi_cat since=30d
```

---

### Page 6 — Docs (`[data-page="5"]`)

**What to replace:**

```
→ Doc tree: acmi_list('doc')
→ Doc viewer: acmi_get('doc', name)
→ Search: client-side filter on title/content
```

---

### Page 7 — Agent Console (`[data-page="6"]`)

**What to replace:**

```
→ Fleet health KPIs: acmi_list('agent') → aggregate signals
→ Agent grid: acmi_list('agent') → acmi_get
→ Detail panel (already partially wired at line 2950+): 
  - KV state from acmi_get
  - Event history from acmi_get (timeline)
  - Comm channel: acmi_event to thread
```

**This is the highest-priority page for live ACMI data.** The agent grid, detail panel, and comm channel map 1:1 to ACMI primitives.

---

### Page 8 — Settings (`[data-page="7"]`)

**What to replace:**

```
→ API keys: localStorage for now, acmi:config:gsd-dashboard:signals for fleet
→ Theme toggle: acmi_signal('config', 'gsd-dashboard', {dark_mode: bool})
→ Widget manager: acmi_signal per widget enabled/disabled
```

---

## Detail Screen Wire-Ups

### `screens/agent-detail.html`

**Already ACMI-primed.** All data slots are labelled:
- Agent profile (name, role, model, status) → `acmi:agent:<id>:profile`
- KV state table → `acmi:agent:<id>:signals`
- Timeline events → `acmi:agent:<id>:timeline`
- Active threads → `acmi_active(agentId, 'list')`
- Comm channel → `acmi_event('thread', 'design-review-gsd-dashboard', ...)`

**URL pattern:** `screens/agent-detail.html?id=<agentId>`
**Bootstrap:** `window.acmi.bootstrap(agentId)` — returns profile + signals + timeline + rollup in one call.

### `screens/task-detail.html`

URL param: `?id=<taskId>`
Data: `acmi_work_get(taskId)` or `acmi_get('task', taskId)`

### `screens/note-detail.html`

URL param: `?id=<noteId>`
Data: `acmi_get('note', noteId)`
Write: `acmi_profile('note', noteId, {title, content, tags})`

### `screens/project-detail.html`

URL param: `?id=<projectId>`
Data: `acmi_work_get(projectId)`

### `screens/event-detail.html`

URL param: `?date=<YYYY-MM-DD>`
Data: `acmi_list('event')` → filter by date

### `screens/doc-viewer.html`

URL param: `?id=<docId>`
Data: `acmi_get('doc', docId)`

---

## acmi-client.js Quick Reference

```javascript
window.acmi = new ACMIClient({
  endpoint: '/api/acmi',   // Point at your MCP-over-HTTP proxy
  cacheTTL: 15000,          // 15s cache
  timeout: 10000,
  retries: 2
});

// Read
acmi.get(namespace, id)            // → {profile, signals, timeline[10]}
acmi.list(namespace)               // → [id1, id2, ...]
acmi.cat([keys...], since='24h')   // → merged timeline events
acmi.bootstrap(agentId)            // → full agent context
acmi.active(agentId, 'list')       // → active threads

// Write
acmi.profile(namespace, id, data)  // → write profile
acmi.signal(namespace, id, data)   // → merge signals
acmi.event(namespace, id, opts)    // → append timeline event
acmi.workCreate(id, data)          // → create work item
acmi.workEvent(id, opts)           // → log work progress
acmi.workSignal(id, data)          // → update work signals
```

---

## ACMI Thread State

**Thread:** `acmi:thread:design-review-gsd-dashboard`
**Work item:** `gsd-dashboard-acmi-integration`
**Correlation:** `gsdDashboardFullLaunch-2026-05-24`

All 11 agents are registered as participants in the thread. Any agent bootstraps with:
```javascript
const ctx = await window.acmi.bootstrap('gemini-cli');
// ctx.profile, ctx.signals, ctx.timeline, ctx.rollup
```

---

## Implementation Order (6 Phases)

```
Phase 0 🔥 FIX XSS + Ship acmi-client.js   → DONE (acmi-client.js exists, XSS fixed)
Phase 1 🏠 Wire Agent Console (Page 7)      → HIGHEST VISIBILITY, 1:1 ACMI map
Phase 2 📊 Wire Command Center KPIs          → acmi_list + acmi_cat merged
Phase 3 ✅ Wire Todo + Notes CRUD            → acmi:task, acmi:note namespaces
Phase 4 📅 Wire Project Tracker + Calendar   → acmi:work:* + acmi:event
Phase 5 📄 Wire Docs + Settings              → acmi:doc, acmi:config
Phase 6 ⚡ Real-time Pub/Sub                 → Upstash Redis WebSocket
```

---

## Project Detail Workspace — Multi-Step, Multi-Layer, Collaboration

**File:** `screens/project-detail.html` (69KB, full SPA with 8 layers)

### Architecture

The project detail page is an 8-layer workspace accessible from dashboard project cards:

```
gsd-dashboard.html (Project Tracker)
  → Click any project card
  → screens/project-detail.html#project=<id>
    → 8 layer tabs (via hash or click)
```

Each project card in the dashboard links to `screens/project-detail.html#project=<id>`.

### 8 Layers (accessible via keyboard: Ctrl+1 through Ctrl+8)

| # | Layer | Key | What to wire to ACMI |
|---|-------|-----|-----------------------|
| 1 | **Overview** | `#layer-overview` | KPI strip (6 stat cards), milestone progress bar, recent activity feed |
| 2 | **Team** | `#layer-team` | Roster from `acmi:agent:*`, workload bars, availability status |
| 3 | **Tasks** | `#layer-tasks` | `acmi:task:*` filtered by project correlationId, task CRUD, checkboxes |
| 4 | **Timeline** | `#layer-timeline` | `acmi:work:<id>:timeline` as milestone list, filtered Gantt |
| 5 | **Budget & Risks** | `#layer-budget` | Budget spend from work profile, risk register as new `acmi:risk:*` |
| 6 | **Files & Docs** | `#layer-files` | `acmi:doc:*` filtered by project, upload metadata |
| 7 | **Activity** | `#layer-activity` | `acmi_cat([acmi:work:<id>:timeline, acmi:agent:*:timeline], since='7d')` |
| 8 | **Collab** | `#layer-collab` | Threaded comments via `acmi:thread:proj-<id>:timeline`, approval workflow |

### Step Progress (Lifecycle Stepper)

The 6-phase stepper at the top tracks project lifecycle:

```
Concept ✓ → Planning ✓ → Development (current) → Validation → Launch → Retro
```

Wire to `acmi:work:<id>:signals.phase` (0-5 integer). CSS classes:
- `.step.completed` — checked circle with green fill
- `.step.current` — transparent circle with forest border + glow
- `.step` (default) — pending, grey border

JWT rule: phase must be sequential (no skipping). The UI allows clicking a completed step to navigate directly.

### Collaboration System

The Collab layer has three sub-components that need ACMI wiring:

1. **Threaded Discussions** (`.collab-thread`)
   - Each thread is an `acmi:thread:proj-<projectId>-<threadId>`
   - Messages logged via `acmi_event('thread', 'proj-<id>-<threadId>', { source, summary })`
   - Reply count = timeline event count
   - Reactions stored in `acmi:thread:<key>:signals` as `{ likes: { userId: count } }`

2. **Approval Workflow** (`.approval-banner`)
   - State machine: `pending` → `approved` | `rejected`
   - Banner state from `acmi:work:<id>:signals.approvalState`
   - Approve/Reject buttons call `acmi_work_signal(id, { approvalState, approvedBy, approvedAt })`
   - CSS classes: `.approval-banner.pending` (warning bg) / `.approved` (green) / `.rejected` (red)

3. **Comment Composer** (`.composer`)
   - Textarea + formatting toolbar (Bold, Italic, Code, Link, @mention, Emoji)
   - @mentions lookup from `acmi_list('agent')`
   - Send writes to `acmi_event('thread', key, { source: 'dashboard-user', summary: text })`
   - Shift+Enter to send, Enter for newline

### ACMI Data Map for Project Detail

| UI Element | ACMI Source | Wire Pattern |
|---|---|---|
| Step progress (6 phases) | `acmi:work:<id>:signals.phase` | `acmi_work_get(id) → signals.phase` |
| KPI strip (6 cards) | `acmi:work:<id>:profile` + `acmi:work:<id>:signals` | Budget, spent, progress%, team count, milestone stats |
| Team roster | `acmi:agent:*` filtered by `profile.projects[]` | `acmi_list('agent') → filter agent.profile.projects.includes(projectId)` |
| Task list | `acmi:task:*` where `task.signals.projectId === projectId` | `acmi_list('task') → filter` |
| Milestone timeline | `acmi:work:<id>:profile.milestones[]` | `acmi_work_get(id) → profile.milestones` (array of {name, desc, status, date, owner}) |
| Budget breakdown | `acmi:work:<id>:profile.budget` | Profile object with categories, spent, total |
| Risk register | `acmi:work:<id>:profile.risks[]` or new `acmi:risk:*` | Array of {risk, likelihood, impact, level, mitigation, owner} |
| Files & Docs | `acmi:doc:*` filtered by `doc.signals.projectId === projectId` | `acmi_list('doc') → filter` |
| Activity feed | `acmi_cat` across work + agent timelines | `acmi_cat(['acmi:work:<id>:timeline', 'acmi:agent:*:timeline'])` |
| Collab threads | `acmi:thread:proj-<id>-*:timeline` | `acmi_list('thread') → filter by prefix` |
| Approval state | `acmi:work:<id>:signals.approvalState` | `acmi_work_signal(id, { approvalState: 'approved'|'rejected' })` |

### URL Hash Integration

The dashboard links to detail pages via URL hash:
- `screens/project-detail.html#project=acmi-fleet-ops` — identifies project
- `screens/project-detail.html#layer-team` — opens specific layer tab

For Phase 4, add a JS route that reads `#project=<id>` and calls `acmi_work_get(id)` to hydrate the page with real project data. The layer navigation (`#layer-*`) is already fully wired.

**Priority:** Phase 1 first — it has the most visible impact and the tightest ACMI mapping.
