# Backend Architecture & ACMI Integration Plan
## GSD Dashboard → Live ACMI (Upstash Redis) Wiring

**File analyzed:** `gsd-dashboard.html` (117KB, 2839 lines, 8 pages)
**Date:** 2026-05-24
**Author:** Backend Architect

---

## Table of Contents
1. [Current State Assessment](#1-current-state-assessment)
2. [ACMI Data Map (By Page)](#2-acmi-data-map-by-page)
3. [Proposed Key Naming Conventions](#3-proposed-key-naming-conventions)
4. [API Contract Shapes](#4-api-contract-shapes)
5. [Real-Time Sync Strategies](#5-real-time-sync-strategies)
6. [Implementation Order](#6-implementation-order)
7. [Dashboard JS Architecture](#7-dashboard-js-architecture)

---

## 1. Current State Assessment

### What exists
- **Single-file SPA** — all HTML, CSS, and JS in one file.
- **100% mock data** — every card, agent, task, note, calendar event, project, doc, and setting is hardcoded.
- **No data layer** — zero `fetch()`, `XMLHttpRequest`, or WebSocket calls. No AJAX/API layer.
- **Minimal JS** (lines 2582–2837): navigation, clock, simulated refresh animation, todo kanban toggle, note filter, agent detail panel (with hardcoded lookup), drag visuals, auto-save indicator simulation.
- **No state management** — only `localStorage` for persisted page preference (`gsd:currentPage`).

### ACMI awareness already in the DOM
The dashboard already references ACMI concepts in its mock data:
- Header shows `ACMI · Online` status indicator
- Settings page references `Upstash Redis` as primary store
- Docs page contains an ACMI Fleet Architecture document describing `acmi:{namespace}:{id}:{slot}` key patterns
- Agent names (`claude-engineer`, `fleet-orch`, `gemini-cli`, etc.) match existing ACMI agent IDs

### What must be added
- A **data service layer** (ACMI client) that wraps MCP tool calls
- **Live data bindings** replacing every static mock value
- **Write-back** for interactive elements (add task, save note, assign agent)
- **Polling/WebSocket** for real-time updates
- **Authentication/config** for Upstash connection

---

## 2. ACMI Data Map (By Page)

### Page 1: Command Center (Home Dashboard)

| UI Component | ACMI Key | MCP Tool | Notes |
|---|---|---|---|
| KPI: Urgent Actions count | `acmi:work:*:signals` (filter priority=P0/P1) | `acmi_work_list` → `acmi_work_get` | Aggregate across all work items |
| KPI: Active Agents count | `acmi:agent:*:signals` (status=active) | `acmi_list('agent')` → `acmi_get('agent', id)` | Count agents with signals.status = 'active' |
| KPI: Events Today | `acmi:agent:*:timeline` + `acmi:work:*:timeline` | `acmi_cat(keys, since='24h')` | Merged timeline, filtered to today |
| KPI: Pipeline Value | `acmi:work:*:profile` (revenue field) | `acmi_work_list` → `acmi_work_get` | Sum of profile.revenue for active projects |
| KPI: Unread Docs | `acmi:doc:*:signals` (read=false) | `acmi_list('doc')` | Count docs with signals.read = false |
| KPI: Next Calendar | `acmi:event:*:profile` (next upcoming) | `acmi_list('event')` → sort by start | Nearest future event |
| Urgent Actions list | `acmi:work:*:signals` (P0/P1, not complete) | `acmi_work_list` → filter by priority | Show title, priority, tag, time |
| Active Agents cards | `acmi:agent:<id>:profile` + `acmi:agent:<id>:signals` | `acmi_list('agent')` → `acmi_get` for each | Name, role, status, current task, heartbeat |
| Today's Timeline | `acmi:cat` across all agents + threads | `acmi_cat(keys=[...], since='24h')` | Merged timeline events sorted by time |
| Quick Actions | Static navigation — no ACMI needed | — | — |

### Page 2: Todo List (Kanban + Gantt)

| UI Component | ACMI Key | MCP Tool | Notes |
|---|---|---|---|
| Todo progress strip | `acmi:task:*:signals` | `acmi_list('task')` | Counts by status (today/week/month) |
| Add task input | Write: `acmi:task:<id>:profile` | `acmi_work_create(id, profile)` | **Uses work namespace** or new `acmi:task:*` |
| Kanban columns (Today/Week/Month/Backlog) | `acmi:task:*:profile` + `acmi:task:*:signals` | `acmi_list('task')` → filter by status | Priority, assignee, due date |
| Task detail panel | `acmi:task:<id>:profile` | `acmi_work_get(id)` | Full task context |
| Gantt timeline | `acmi:task:*:profile` (start/end dates) | `acmi_list('task')` | Render bars from date fields |

### Page 3: Notes

| UI Component | ACMI Key | MCP Tool | Notes |
|---|---|---|---|
| Notes list (searchable) | `acmi:note:<id>:profile` | `acmi_list('note')` → `acmi_get` | **New namespace** — see §3 |
| Note preview | `acmi:note:<id>:profile` (preview, tags) | `acmi_get('note', id)` | Title, preview snippet, tags, modified |
| Note editor | `acmi:note:<id>:profile` (full content) | `acmi_get('note', id)` for read; `acmi_profile` for write | Markdown content stored in profile.content |
| Auto-save | `acmi:note:<id>:profile` | `acmi_profile('note', id, {...})` | Debounced writes |
| Add new note | `acmi:note:<newId>:profile` | `acmi_profile('note', id, {...})` | Generate UUID client-side |
| @mentions in notes | `acmi:agent:*` lookup | `acmi_list('agent')` | Cross-reference agent IDs |

### Page 4: Project Tracker

| UI Component | ACMI Key | MCP Tool | Notes |
|---|---|---|---|
| Pipeline funnel | `acmi:work:*:profile` (status field) | `acmi_work_list` → categorize by status | Count per funnel stage |
| Project cards | `acmi:work:<id>:profile` + `acmi:work:<id>:signals` | `acmi_work_get(id)` | Name, status, progress %, lead agent, revenue |
| Project health stats | `acmi:work:*:signals` + `acmi:work:*:timeline` | Aggregate across all work items | Stalled count, last activity, idle days, agents assigned |
| Search/filter | `acmi_work_list` | Client-side filter | — |

### Page 5: Calendar

| UI Component | ACMI Key | MCP Tool | Notes |
|---|---|---|---|
| Calendar grid | `acmi:event:*:profile` | `acmi_list('event')` | **New namespace** — see §3 |
| Events on dates | `acmi:event:<id>:profile` (start, end, title, type) | `acmi_get('event', id)` | Render dots/bars on calendar cells |
| ACMI Timeline (this month) | `acmi:cat` merged timeline | `acmi_cat(keys=[...], since='30d')` | Show key events for the month |
| Calendar nav (month/week) | Client-side only | — | View toggle, no ACMI needed |

### Page 6: Docs

| UI Component | ACMI Key | MCP Tool | Notes |
|---|---|---|---|
| Doc tree / sidebar | `acmi:doc:*:profile` | `acmi_list('doc')` | **New namespace** — see §3 |
| Doc viewer | `acmi:doc:<id>:profile` (content, metadata) | `acmi_get('doc', id)` | Title, type, updated date, body |
| Search | `acmi:list('doc')` → client-side filter | — | Filter by title/type |
| Templates folder | `acmi:doc:*:signals` (isTemplate=true) | `acmi_list('doc')` + filter | Separate by signals.isTemplate |

### Page 7: Agent Console

| UI Component | ACMI Key | MCP Tool | Notes |
|---|---|---|---|
| Fleet health KPI strip | `acmi:agent:*:signals` + `acmi:agent:*:rollup:latest` | `acmi_bootstrap(id)` per agent | Response rate, success/fail, tasks done, avg cost |
| Agent status grid | `acmi:agent:<id>:profile` + `acmi:agent:<id>:signals` | `acmi_list('agent')` → `acmi_get` | Name, role, status dot, current task, heartbeat |
| Agent detail panel | `acmi:agent:<id>:profile` + `acmi:agent:<id>:signals` + `acmi:agent:<id>:timeline` | `acmi_get('agent', id)` | Full detail + recent events |
| Comm channel | `acmi:thread:dashboard-<agentId>:timeline` | `acmi_event('thread', 'dashboard-<id>', ...)` | Write messages as timeline events |
| Assign task | `acmi:work:*:profile` + `acmi:agent:<id>:signals` | `acmi_work_create` + `acmi_signal('agent', id, {task: ...})` | Update agent current task |

### Page 8: Settings

| UI Component | ACMI Key | MCP Tool | Notes |
|---|---|---|---|
| API Keys & Integrations | `acmi:config:dashboard:settings` | `acmi_get('config', 'dashboard')` | **New namespace** — see §3 |
| Display preferences | `localStorage` (client-side only) | — | Dark mode, compact mode |
| Widget Manager toggles | `acmi:config:dashboard:signals` | `acmi_signal('config', 'dashboard', {...})` | Per-widget visibility |
| Data Source Health | `acmi:config:dashboard:signals` + `acmi:agent:*:signals` | `acmi_get('config', 'dashboard')` | Connection status per service |
| Export | Client-side JSON generation from live data | — | Snapshot of current ACMI state |

---

## 3. Proposed Key Naming Conventions for New Data Domains

The ACMI system already defines four namespaces: `agent`, `thread`, `work`, and `config`. The dashboard needs **five additional namespaces**:

### `acmi:note:*` — Notes

```
acmi:note:<noteId>:profile    → { id, title, preview, content (markdown), tags[], created, modified, owner }
acmi:note:<noteId>:signals    → { pinned, archived, wordCount, version }
acmi:note:<noteId>:timeline   → edit events, version history
acmi:note:*:profile           → list all notes (acmi_list('note'))
```

### `acmi:task:*` — Todos/Tasks

Distinct from `acmi:work:*` (which is for projects). Tasks are finer-grained.

```
acmi:task:<taskId>:profile    → { id, title, priority, assignee, dueDate, status (today/week/month/backlog), tags[] }
acmi:task:<taskId>:signals    → { completed, blocked, completionPct, timeSpent }
acmi:task:<taskId>:timeline   → status changes, assignment history
```

### `acmi:event:*` — Calendar Events

```
acmi:event:<eventId>:profile  → { id, title, type (milestone/deadline/task), start, end, allDay, relatedEntity (work|task|agent|doc) }
acmi:event:<eventId>:signals  → { reminderSent, acknowledged }
acmi:event:<eventId>:timeline → changes, reminders
```

### `acmi:doc:*` — Documents

```
acmi:doc:<docId>:profile      → { id, title, type (Spec/Brief/Plan/Guide/Report), content (markdown or HTML), wordCount, version }
acmi:doc:<docId>:signals      → { isTemplate, archived, read, tags[] }
acmi:doc:<docId>:timeline     → edit history, version bumps
```

### `acmi:config:dashboard` — Dashboard Configuration

```
acmi:config:dashboard:profile → { apiKeys (encrypted references), integrations: [{name, status, expiry}], dataSourceHealth: [...] }
acmi:config:dashboard:signals → { widgets: {command:true, todo:true, notes:true, projects:true, calendar:true, docs:true, agents:true, settings:true} }
```

### `acmi:agent:<id>:signals` — Extended Signals Schema

The dashboard expects additional fields beyond current ACMI agent signals:

```json
{
  "status": "active|idle|sleep|offline",
  "currentTask": "OwnerScout deploy",
  "heartbeat": "2026-05-24T09:14:00Z",
  "mood": "focused|blocked|waiting",
  "skills": ["full-stack", "deploy", "api"],
  "sessionsToday": 3,
  "tokensUsed": 142580
}
```

These can live in the existing `acmi:agent:<id>:signals` KV — just need schema agreement.

---

## 4. API Contract Shapes

### 4.1 ACMI Client Wrapper (JavaScript)

```typescript
// Single interface for all ACMI operations from the dashboard

interface ACMIClient {
  // Namespace operations
  list(namespace: string): Promise<string[]>;
  get(namespace: string, id: string): Promise<EntityContext>;
  profile(namespace: string, id: string, data: object): Promise<void>;
  signal(namespace: string, id: string, data: object): Promise<void>;
  event(namespace: string, id: string, data: TimelineEvent): Promise<void>;
  delete(key: string): Promise<void>;

  // Multi-stream merge
  cat(keys: string[], opts?: { since?: string; limit?: number }): Promise<TimelineEvent[]>;

  // Agent-specific
  bootstrap(agentId: string): Promise<BootstrapBundle>;
  spawn(agentId: string, sessionId: string, modelId: string): Promise<void>;
  activeThreads(agentId: string): Promise<ActiveThread[]>;
  rollupSet(agentId: string, data: object): Promise<void>;

  // Work-specific
  workList(): Promise<string[]>;
  workGet(id: string): Promise<WorkContext>;
  workCreate(id: string, profile: object): Promise<void>;
  workEvent(id: string, source: string, summary: string, sessionId?: string): Promise<void>;
  workSignal(id: string, data: object): Promise<void>;
}
```

### 4.2 Entity Context Shape (from `acmi_get`)

```typescript
interface EntityContext {
  id: string;
  profile: object;      // Permanent metadata
  signals: object;      // Mutable KV state
  timeline: TimelineEvent[];  // Last 10 events
}
```

### 4.3 Bootstrap Bundle Shape (for Agent Console)

```typescript
interface BootstrapBundle {
  agentId: string;
  profile: AgentProfile;
  signals: AgentSignals;
  activeThreads: ActiveThread[];
  rollup: RollupSnapshot | null;
  recentTimeline: TimelineEvent[];
  spawns: SpawnEvent[];
}
```

### 4.4 Timeline Event Shape

```typescript
interface TimelineEvent {
  ts: string;           // ISO 8601
  source: string;       // Agent name or system
  kind: string;         // 'handoff-complete' | 'step-done' | 'decision' | 'milestone' | 'blocker' | 'spawn' | 'heartbeat'
  summary: string;      // Human-readable
  correlationId?: string;
}
```

### 4.5 Dashboard-Specific Aggregation Endpoints

For efficient loading, the dashboard should have a **single bootstrap endpoint**:

```typescript
// GET /api/dashboard/bootstrap (or via acmi_cat aggregation)
interface DashboardBootstrap {
  agents: EntityContext[];          // All agents (list + get for each)
  workItems: WorkContext[];         // All work items (list + get for each)
  tasks: EntityContext[];           // All tasks
  notes: EntityContext[];           // All notes
  events: EntityContext[];          // All calendar events
  docs: EntityContext[];            // All documents
  config: EntityContext;            // Dashboard config
  timeline: TimelineEvent[];        // Merged timeline (last 24h)
  summary: {                        // Computed KPI values
    urgentCount: number;
    activeAgentCount: number;
    eventsToday: number;
    pipelineValue: number;
    unreadDocs: number;
    nextCalendarEvent: CalendarEvent | null;
  };
}
```

---

## 5. Real-Time Sync Strategies

### 5.1 Recommended: Polling + Optimistic UI (Phase 1)

For a dashboard that doesn't need sub-second updates:

```
┌──────────────┐       ┌───────────────────┐       ┌──────────────┐
│  Dashboard JS │ ──→   │  ACMI Client       │ ──→   │  Upstash     │
│  (Browser)    │ ←──   │  (MCP via server)  │ ←──   │  Redis       │
└──────────────┘       └───────────────────┘       └──────────────┘
     │                                                       │
     │  Poll every 10-30s                                    │
     └─────────────────────────────────────────────────────────┘
```

**Implementation:**
1. On page load: call `dashboardBootstrap()` → hydrate all 8 pages
2. `setInterval(bootstrapRefresh, 15000)` — re-fetch every 15s
3. For urgent items only: poll every 5s (or use heartbeat field)
4. Write operations: optimistic update DOM immediately, then write to ACMI, revert on error

**Polling intervals by page:**
| Page | Poll Interval | Rationale |
|---|---|---|
| Command Center | 10s | Needs freshest KPI/timeline data |
| Todo List | 15s | Moderate freshness needed |
| Notes | 30s | Low frequency changes |
| Project Tracker | 30s | Status changes are infrequent |
| Calendar | 60s | Events change rarely |
| Docs | 60s | Document edits are deliberate |
| Agent Console | 10s | Agent status needs near-real-time |
| Settings | On demand | Only when user interacts |

### 5.2 Future: WebSocket / Redis Pub/Sub (Phase 2)

Upstash Redis supports Pub/Sub patterns. The dashboard could subscribe to:

```
acmi:event:* → broadc‌ast on `acmi:channel:events`
acmi:agent:<id>:signals → broadcast on `acmi:channel:agents`
```

When a write happens from any agent, Upstash publishes a change notification. The dashboard subscribes via WebSocket and updates only the affected components.

**Architecture:**
```
                        ┌─────────────────────┐
                        │   Upstash Redis      │
                        │   Pub/Sub            │
                        └──────┬──────────────┘
                               │
                ┌──────────────┴──────────────┐
                │  MCP Server (Node/Go)       │
                │  - REST API                 │
                │  - WebSocket bridge         │
                │  - ACMI tool routing         │
                └──────┬──────────────┬───────┘
                       │              │
        ┌──────────────┴──┐    ┌──────┴──────────┐
        │  Dashboard JS   │    │  Agent Fleet     │
        │  (Browser, WS)  │    │  (MCP clients)   │
        └─────────────────┘    └─────────────────┘
```

### 5.3 ACMI Status Indicator

The header `ACMI · Online` indicator should reflect the actual connection status:

```javascript
async function checkAcmiStatus() {
  try {
    const agents = await acmi.list('agent');
    // If we can list, we're connected
    setStatus('online');
  } catch {
    setStatus('offline');
  }
}
// Check every 30s (already wired in JS)
```

---

## 6. Implementation Order

### Phase 0: Foundation (Day 1)
**Goal:** Establish data layer without modifying page rendering.

| Step | Task | Files Changed | MCP Tools |
|---|---|---|---|
| 0.1 | Create `acmi-client.js` — wrapper class around all ACMI MCP tools via fetch to MCP server | New file | All tools |
| 0.2 | Add configuration for Upstash Redis endpoint (from Settings page mock) | `acmi-client.js` + settings | `acmi_get('config', 'dashboard')` |
| 0.3 | Implement `dashboardBootstrap()` aggregate endpoint concept | `acmi-client.js` | `acmi_list`, `acmi_get`, `acmi_cat` |
| 0.4 | Wire ACMI status indicator to live ping | `gsd-dashboard.html` JS | `acmi_list('agent')` |

### Phase 1: Agent Console & Command Center (Days 2-3)
**Goal:** Wire the two most visible pages to live data. Highest impact for demo.

| Step | Task | MCP Tools |
|---|---|---|
| 1.1 | Replace `selectAgent()` hardcoded lookup with `acmi_get('agent', id)` | `acmi_bootstrap(id)` |
| 1.2 | Build agent grid from `acmi_list('agent')` → batch `acmi_get` | `acmi_list`, `acmi_get` |
| 1.3 | Replace Command Center KPI strip with computed aggregates | `acmi_list`, `acmi_get`, `acmi_cat` |
| 1.4 | Replace Active Agents cards with live `acmi:agent:<id>:signals` | `acmi_get` |
| 1.5 | Replace Today's Timeline with `acmi_cat(keys, since='24h')` | `acmi_cat` |
| 1.6 | Replace Urgent Actions with filtered work items | `acmi_work_list`, `acmi_work_get` |

### Phase 2: Project Tracker (Days 4-5)
**Goal:** Live project data using `acmi:work:*` which already exists.

| Step | Task | MCP Tools |
|---|---|---|
| 2.1 | Pipeline funnel from `acmi_work_list` → group by profile.status | `acmi_work_list`, `acmi_work_get` |
| 2.2 | Project cards from `acmi_work_get(id)` for each project | `acmi_work_get` |
| 2.3 | Project health widget from aggregate work stats | `acmi_list`, `acmi_get` |
| 2.4 | Write-back for project status updates | `acmi_work_signal`, `acmi_work_event` |

### Phase 3: Todo List & Notes (Days 6-8)
**Goal:** Wire interactive CRUD pages. Requires setting up new namespaces.

| Step | Task | MCP Tools |
|---|---|---|
| 3.1 | Define `acmi:task:*` namespace — create seed tasks from mock data | `acmi_profile('task', ...)` |
| 3.2 | Replace Todo Kanban with `acmi_list('task')` → filter by status | `acmi_list`, `acmi_get` |
| 3.3 | Wire "Add Task" button to `acmi_work_create` (or new task schema) | `acmi_profile('task', ...)` |
| 3.4 | Define `acmi:note:*` namespace — migrate 5 mock notes | `acmi_profile('note', ...)` |
| 3.5 | Wire Note selection to load from `acmi_get('note', id)` | `acmi_get('note', id)` |
| 3.6 | Wire auto-save to `acmi_profile('note', id, {...})` | `acmi_profile('note', id, ...)` |
| 3.7 | Wire search/filter client-side | (client-side only) |

### Phase 4: Calendar & Docs (Days 9-10)
**Goal:** Remaining pages. Lower priority but provides complete coverage.

| Step | Task | MCP Tools |
|---|---|---|
| 4.1 | Define `acmi:event:*` namespace — seed calendar events | `acmi_profile('event', ...)` |
| 4.2 | Render calendar grid from `acmi_list('event')` | `acmi_list`, `acmi_get` |
| 4.3 | Define `acmi:doc:*` namespace — seed documents | `acmi_profile('doc', ...)` |
| 4.4 | Wire Doc tree and viewer to `acmi_get('doc', id)` | `acmi_get('doc', id)` |
| 4.5 | Wire Calendar ACMI Timeline section with `acmi_cat` | `acmi_cat` |

### Phase 5: Settings & Configuration (Day 11)
**Goal:** Wire Settings page and dashboard configuration persistence.

| Step | Task | MCP Tools |
|---|---|---|
| 5.1 | Define `acmi:config:dashboard` — seed from mock settings | `acmi_profile('config', 'dashboard')` |
| 5.2 | Wire Widget Manager toggles to `acmi_signal('config', 'dashboard', ...)` | `acmi_signal` |
| 5.3 | Wire Data Source Health indicators from config profile | `acmi_get('config', 'dashboard')` |
| 5.4 | Wire Export button to snapshot all current ACMI state | All `list`/`get` tools |

### Phase 6: Real-Time & Polish (Day 12+)
**Goal:** Performance, real-time sync, error handling.

| Step | Task |
|---|---|
| 6.1 | Implement polling intervals per §5.1 |
| 6.2 | Add loading skeletons while ACMI data loads |
| 6.3 | Add error states when ACMI is unreachable |
| 6.4 | Implement optimistic updates for write operations |
| 6.5 | (Future) WebSocket Pub/Sub for push updates |
| 6.6 | Performance: batch ACMI calls, cache responses |

---

## 7. Dashboard JS Architecture

### 7.1 Recommended Refactoring

The current monolithic script (lines 2582–2837) should be decomposed into:

```
gsd-dashboard.html
├── <style> (remain as-is)
├── <html> (remain as-is)
└── <script>
    ├── acmi-client.js           ← NEW: ACMI client wrapper
    ├── acmi-bootstrap.js        ← NEW: bootstrap/hydration logic
    ├── store.js                 ← NEW: in-memory reactive store
    ├── components/
    │   ├── command-center.js    ← REFACTOR: wire to store
    │   ├── todo-list.js         ← REFACTOR: wire to store
    │   ├── notes.js             ← REFACTOR: wire to store
    │   ├── projects.js          ← REFACTOR: wire to store
    │   ├── calendar.js          ← REFACTOR: wire to store
    │   ├── docs.js              ← REFACTOR: wire to store
    │   ├── agent-console.js     ← REFACTOR: wire to store
    │   └── settings.js          ← REFACTOR: wire to store
    └── navigation.js            ← REFACTOR: keep as-is
```

However, since the current architecture is a single file, a **lighter approach** is recommended:

### 7.2 Lightweight Approach (Recommended for Phase 1)

Add one `<script>` block before the existing one:

```html
<script src="acmi-client.js"></script>
```

Where `acmi-client.js` contains:
- `class ACMIClient` — wraps all MCP tool calls via HTTP to a local ACMI MCP server
- `const acmi = new ACMIClient({ endpoint: '/api/acmi' })` — global singleton
- `async function dashboardBootstrap()` — bulk load
- `async function refreshPage(pageId)` — per-page refresh
- In-memory cache with TTL
- Polling scheduler

Then modify the existing inline `<script>` to:
- Replace `selectAgent()` hardcoded data → `acmi.get('agent', agentId)`
- Replace mock timelines → `acmi.cat(keys, { since: '24h' })`
- Replace mock KPI values → computed from bootstrap data
- Replace `addTask()` → `acmi.profile('task', newId, { title, priority, ... })`
- Replace note auto-save sim → `acmi.profile('note', noteId, { content })`

### 7.3 Key Refactoring Patterns

```javascript
// BEFORE (mock):
function selectAgent(agentId) {
  var names = { 'claude-engineer': ['Claude-Engineer', ...], ... };
  var data = names[agentId];
  panel.innerHTML = '<div>' + data[0] + '</div>...';
}

// AFTER (live):
async function selectAgent(agentId) {
  var ctx = await acmi.get('agent', agentId);
  panel.innerHTML = renderAgentDetail(ctx);
}
```

```javascript
// BEFORE (mock):
function addTask() {
  var item = document.createElement('div');
  item.innerHTML = '<div class="top">...' + inputVal + '...</div>';
  todayCol.appendChild(item);
}

// AFTER (live):
async function addTask() {
  var id = crypto.randomUUID();
  await acmi.profile('task', id, {
    title: inputVal,
    priority: 'P1',
    status: 'today',
    created: new Date().toISOString()
  });
  // Re-fetch and re-render the kanban column
  await refreshPage('page-todo');
}
```

---

## Appendix A: ACMI Tool Mapping Summary

| Dashboard Function | Primary ACMI Tool | Secondary |
|---|---|---|
| List all agents | `acmi_list('agent')` | — |
| Get agent detail | `acmi_bootstrap(id)` | `acmi_get('agent', id)` |
| List work items | `acmi_work_list()` | — |
| Get work item | `acmi_work_get(id)` | — |
| Create work item | `acmi_work_create(id, profile)` | — |
| Update work signals | `acmi_work_signal(id, data)` | — |
| Log work event | `acmi_work_event(id, source, summary)` | — |
| Merged timeline | `acmi_cat(keys, opts)` | — |
| Create/edit profile | `acmi_profile(ns, id, data)` | — |
| Update signals | `acmi_signal(ns, id, data)` | — |
| Log event | `acmi_event(ns, id, source, summary, kind, correlationId)` | — |
| Agent spawn | `acmi_spawn(agentId, sessionId, modelId)` | — |
| Active threads | `acmi_active(agentId, 'list')` | — |
| Delete key | `acmi_delete(key, confirm=true)` | — |

## Appendix B: ACMI Key Registry (Complete)

All keys the dashboard will read/write:

```
acmi:agent:{id}:profile              → Agent metadata
acmi:agent:{id}:signals              → Agent mutable state (status, task, heartbeat, skills, sessions, tokens)
acmi:agent:{id}:rollup:latest        → Agent session summary
acmi:agent:{id}:timeline             → Agent event stream
acmi:thread:{name}:profile           → Thread metadata
acmi:thread:{name}:timeline          → Thread event stream
acmi:work:{id}:profile               → Project/work item profile
acmi:work:{id}:signals               → Project mutable state (progress, blockers)
acmi:work:{id}:timeline              → Project event stream
acmi:task:{id}:profile          [NEW] → Todo task profile
acmi:task:{id}:signals          [NEW] → Todo task mutable state
acmi:task:{id}:timeline         [NEW] → Todo task event stream
acmi:note:{id}:profile          [NEW] → Note profile (title, content, tags)
acmi:note:{id}:signals          [NEW] → Note mutable state (pinned, archived)
acmi:note:{id}:timeline         [NEW] → Note edit history
acmi:event:{id}:profile         [NEW] → Calendar event profile
acmi:event:{id}:signals         [NEW] → Calendar event state
acmi:event:{id}:timeline        [NEW] → Calendar event changes
acmi:doc:{id}:profile           [NEW] → Document profile
acmi:doc:{id}:signals           [NEW] → Document state (read, template, archived)
acmi:doc:{id}:timeline          [NEW] → Document edit history
acmi:config:dashboard:profile   [NEW] → Dashboard configuration & API keys
acmi:config:dashboard:signals   [NEW] → Dashboard widget visibility toggles
```

---

*End of Plan*
