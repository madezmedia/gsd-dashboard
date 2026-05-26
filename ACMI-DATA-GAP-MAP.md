# ACMI Data Connection Gap Map

> Generated for fleet: `@bentley @gemini-cli @opencode @claude-code @design-team`
> Correlation: `gsdDashboardDataGapMap-2026-05-24`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser SPA / Screens                                            │
│                                                                   │
│  gsd-dashboard.html ✓ has acmi-client.js → /api/acmi             │
│  screens/*.html        ✗ no ACMI calls (100% static HTML)        │
│  fleet-ops.html        ✗ no ACMI calls (100% static HTML)        │
│  index.html            ✗ no ACMI calls (100% static HTML)        │
└──────────────────┬──────────────────────────────────────────────┘
                   │ POST /api/acmi { tool, params }
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ server.js :8888 lines                                            │
│                                                                  │
│  POST /api/acmi → executeAcmiTool() → upstashCmd()              │
│  Tools implemented: acmi_list, acmi_get, acmi_profile,           │
│    acmi_signal, acmi_event, acmi_cat, acmi_delete,              │
│    acmi_bootstrap, acmi_spawn, acmi_active, acmi_rollup_set,    │
│    acmi_work_create, acmi_work_get, acmi_work_list,              │
│    acmi_work_event, acmi_work_signal                             │
└──────────────────┬──────────────────────────────────────────────┘
                   │ Upstash Redis REST API
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ Upstash Redis                                                    │
│                                                                  │
│  acmi:agent:*:profile     ✓ Has data from ACMI bootstraps        │
│  acmi:agent:*:signals     ✓ Has data from ACMI bootstraps        │
│  acmi:agent:*:timeline    ✓ Has data from ACMI bootstraps        │
│  acmi:thread:*:timeline   ✓ Has events from ACMI coordination    │
│  acmi:work:*:profile      ✓ Has data from work items             │
│  acmi:work:*:signals      ✓ Has data from work items             │
│  acmi:work:*:timeline     ✓ Has events from work items           │
│  acmi:note:*              ✗ Namespace does not exist yet          │
│  acmi:task:*              ✗ Namespace does not exist yet          │
│  acmi:event:*             ✗ Namespace does not exist yet          │
│  acmi:doc:*               ✗ Namespace does not exist yet          │
│  acmi:config:*            ✗ Namespace does not exist yet          │
└─────────────────────────────────────────────────────────────────┘
```

---

## File-by-File Gap Analysis

### 1. `gsd-dashboard.html` (4,731 lines) — ⚠️ PARTIALLY CONNECTED

**Data flow:** `acmi-init.js` injected → `new ACMIClient()` → `acmi.dashboardBootstrap()` → POST `/api/acmi`

**What IS connected:**
| Component | ACMI Tool | Data Read | Status |
|---|---|---|---|
| KPI Strip (6 KPIs) | `dashboardBootstrap().agents/.workItems` | agent count, online ratio, revenue, timeline events | ✅ Live call, fallback empty |
| Agent Grid (Page 7) | `dashboardBootstrap().agents` | context per agent | ✅ Live call |
| Agent Detail Panel | `acmi.get('agent', id)` | profile, signals, timeline | ✅ Live call |
| Comm Channel | `acmi.event('thread', ..., msg)` | posts to ACMI | ✅ Live call |
| Pending Approvals HUD | `dashboardBootstrap().workItems` | approvalState | ✅ Live call |
| Todo Kanban | `dashboardBootstrap().tasks` | task items by status | ⚠️ `acmi:task` namespace empty |
| Notes Page | `dashboardBootstrap().notes` | note list | ⚠️ `acmi:note` namespace empty |
| Calendar | `dashboardBootstrap().events` | event dates | ⚠️ `acmi:event` namespace empty |
| Docs Page | `dashboardBootstrap().docs` | document list | ⚠️ `acmi:doc` namespace empty |
| Settings | `dashboardBootstrap().config` | config KV | ⚠️ `acmi:config` namespace empty |

**What's MOCKED:**
- Search modal results (7 hardcoded agent names at line 3161)
- Section index (10 hardcoded section labels at line 3182)
- Task creation → writes to ACMI but UI shows from empty task namespace
- Note creation → writes to ACMI but UI shows from empty note namespace

**Gap severity:** 🟡 Medium — call structure is correct, but 5 of 8 namespaces don't exist in Redis yet.

---

### 2. `screens/agent-detail.html` (375 lines) — 🔴 FULLY STATIC

**Data flow:** NONE. Zero ACMI calls. Zero JavaScript beyond dark mode toggle.

**Hardcoded data that should be ACMI:**
| Section | Current Hardcoded Value | Should Be |
|---|---|---|
| Hero name | "LL-7 — Autonomous Fleet Agent" | `acmi.get('agent', id).profile.name` |
| Agent ID | `acmi:agent:ll-7` | ID from URL param |
| KPIs | 142 sessions / 128 tasks / 98% success / 47s avg | `acmi.bootstrap('agent-id').signals.sessionsToday, tasksCompleted, successRate` |
| KV Table | 12 hardcoded rows (model, status, signal strength, edge node, etc.) | `acmi.get('agent', id).profile` + `.signals` |
| Timeline | 8 hardcoded events | `acmi.get('agent', id).timeline` (last 10) |
| Active Threads | 3 hardcoded threads | `acmi.activeThreads(id)` |
| Rollup | 3 hardcoded session summaries | `acmi.bootstrap('agent-id').rollup` |
| Comm Channel | Static placeholder textarea | `acmi.event('thread', ..., msg)` |
| Collab threads | 6 hardcoded comments | `acmi.cat(['thread:design-review:*'], {since: '7d'})` |

**Gap severity:** 🔴 Critical — user cannot see live agent state from this page.

---

### 3. `screens/project-detail.html` (1,246 lines) — 🔴 FULLY STATIC

**Data flow:** NONE. Zero ACMI calls.

**Hardcoded data that should be ACMI (8 layers):**
| Layer | Items Hardcoded | Should Be |
|---|---|---|
| Overview | 6 KPIs ($184K budget, $94K spent, 78% used, 5 milestones, 4 agents, 24 days) | `acmi.workGet('project-id').signals` and `acmi.cat(['work:project-id:*'])` |
| Team | 6 members with availability dots, workload bars | `acmi.get('agent', id).signals.status` + thread participants |
| Tasks | 8 tasks with P0/P1 badges, 3 subtasks | `acmi.cat(['work:project-id:*'])` or dedicated `acmi:task` namespace |
| Timeline | 6 milestones with at-risk indicators | `acmi.get('work', 'project-id').timeline` filtered by kind |
| Budget & Risks | 5 budget categories, monthly chart, 5 risks | `acmi.get('work', 'project-id').signals.budget` |
| Files & Docs | 7 files/folders, upload zone | `acmi.list('doc')` filtered by project tag |
| Activity | 7 events with reply/like/approve | `acmi.cat(['work:project-id:*'], {since: '30d'})` |
| Collab | 2 threaded discussions, approval banner | `acmi.cat(['thread:project-*'], {since: '7d'})` |

**Gap severity:** 🔴 Critical — 1,246 lines of hardcoded project data.

---

### 4. `screens/task-detail.html` (377 lines) — 🔴 FULLY STATIC

**Data flow:** NONE.

**Hardcoded data:**
| Section | Current | Should Be |
|---|---|---|
| Task title | "OTA v2.4.1 Hotfix — Memory Leak in syncDaemon" | `acmi.get('task', id).profile.title` |
| Badges | P0 · In Progress · Edge Deploy | `acmi.get('task', id).profile.priority` + `.signals.status` |
| Description | 3-paragraph hardcoded text | `acmi.get('task', id).profile.description` |
| Subtasks | 4 checklist items with checkboxes | `acmi.get('task', id).signals.subtasks` |
| 3 comments | Hardcoded with avatars/timestamps | `acmi.cat(['task:task-id:comments:*'])` |
| Status history | 6 hardcoded entries | `acmi.get('task', id).timeline` |

**Gap severity:** 🔴 Critical — 377 lines static.

---

### 5. `screens/note-detail.html` (387 lines) — 🔴 FULLY STATIC

**Data flow:** NONE.

**Hardcoded data:**
| Section | Current | Should Be |
|---|---|---|
| Note title | "Fleet OTA v2.4 Deployment Notes" | `acmi.get('note', id).profile.title` |
| Tags | acmi, deployment, fleet, edge, v2.4 | `acmi.get('note', id).profile.tags` |
| Content | Multi-paragraph hardcoded markdown text | `acmi.get('note', id).profile.content` |
| Editor toolbar | Bold/Italic/Heading/Code/List buttons (no-op) | Should write `acmi.profile('note', id, {content: ...})` |
| Modified timestamp | Static "Modified 2 hours ago" | `acmi.get('note', id).signals.lastModified` |
| Notes list | 5 hardcoded notes in sidebar | `acmi.list('note')` → batch fetch |

**Gap severity:** 🔴 Critical — 387 lines static.

---

### 6. `screens/event-detail.html` (375 lines) — 🔴 FULLY STATIC

**Data flow:** NONE.

**Hardcoded data:**
| Section | Current | Should Be |
|---|---|---|
| Day header | "Wednesday, May 20, 2026" | From URL param or `acmi.cat()` |
| Hourly grid | 8 timeslots (06:00–13:00) with events | `acmi.cat(['thread:*'], {since: '7d'}).filter(by day)` |
| Event panel | 5 hardcoded ACMI timeline events | `acmi.cat(['thread:*', 'agent:*'], {since: '24h'})` |
| Timeline integration | 7 hardcoded subscription entries | `acmi.cat(['thread:design-review:*', 'thread:agent-coordination:*'], {since: '24h'})` |
| Rec/notification | 4 recurrence toggles | `acmi.get('config', 'event-preferences')` |

**Gap severity:** 🔴 Critical — 375 lines static.

---

### 7. `screens/doc-viewer.html` (380 lines) — 🔴 FULLY STATIC

**Data flow:** NONE.

**Hardcoded data:**
| Section | Current | Should Be |
|---|---|---|
| Document title | "ACMI Communication Standard v1.1" | `acmi.get('doc', id).profile.title` |
| Type badge | "Specification" | `acmi.get('doc', id).profile.type` |
| Content | 7 sections of hardcoded markdown | `acmi.get('doc', id).profile.content` (markdown) |
| ToC sidebar | 5 hardcoded sections | Generated from content headings |
| Search | Input field, no-op | `acmi.cat(...)` or client-side filter |
| Docs list | 8 hardcoded documents in sidebar | `acmi.list('doc')` → batch fetch |
| Templates | 3 hardcoded templates | `acmi.list('doc').filter(t => t.profile.type === 'template')` |

**Gap severity:** 🔴 Critical — 380 lines static.

---

### 8. `fleet-ops.html` (923 lines) — 🔴 FULLY STATIC

**Data flow:** NONE. Zero ACMI calls. Only a clock tick script.

**Hardcoded data:**
| Section | Current | Should Be |
|---|---|---|
| Fleet Health Quad | 57 agents / 3 threads / 1 HITL / 0 blockers | `acmi.list('agent').length` + `acmi.list('thread').length` |
| Active Threads | 3 hardcoded thread cards | `acmi.list('thread')` + `acmi.cat(['thread:*'], {since: '24h'})` |
| Recent Moves | 4 hardcoded events | `acmi.cat(['agent:*', 'thread:*', 'work:*'], {since: '7d'})` |
| Health Signals | 3 hardcoded (credits red, quota error, health good) | `acmi.get('agent', id).signals.health` |
| Stalled Items | 14 items, 2 past 200h | `acmi.cat(['thread:*', 'work:*'], {since: '72h'})` → find silent items |
| Archival Candidates | 8 items with approve/pending | Filter stalled items > 72h |
| Agent Roster | 9 hardcoded agents with status dots | `acmi.list('agent')` + batch `acmi.get()` |
| Phase Status | 3 hardcoded phase cards | `acmi.get('work', 'gsd-dashboard-acmi-integration').signals.phases` |

**Gap severity:** 🔴 Critical — 923 lines of static data, no live ACMI.

---

### 9. `index.html` (660 lines) — 🔴 FULLY STATIC

**Data flow:** NONE.

**Hardcoded data:**
| Section | Current | Should Be |
|---|---|---|
| System launcher | Hardcoded FPS, agent count, latency | `acmi.status()` or `acmi.dashboardBootstrap().summary` |
| File manifest | Hardcoded file list with sizes | Static launcher — acceptable, but KPI badges should be live |

**Gap severity:** 🟡 Low for launcher, but the status badges should be live.

---

## Priority Order for Backend Wiring

### Phase 1 (Do First — Highest Visibility)
| File | ACMI Wrapper Needed | Est. Lines |
|---|---|---|
| `screens/agent-detail.html` | `acmi-client.js` import + `acmi.bootstrap('agent-id')` + URL param parsing | +120 lines JS |
| `fleet-ops.html` | `acmi-client.js` import + `acmi.list()` + `acmi.cat()` | +180 lines JS |
| `screens/project-detail.html` | `acmi-client.js` import + `acmi.workGet('project-id')` + `acmi.cat()` | +200 lines JS |

### Phase 2 (Core Data)
| File | ACMI Wrapper Needed | Est. Lines |
|---|---|---|
| `screens/task-detail.html` | `acmi-client.js` + `acmi.get('task', id)` | +80 lines JS |
| `screens/note-detail.html` | `acmi-client.js` + `acmi.get('note', id)` + save on edit | +100 lines JS |

### Phase 3 (Remaining)
| File | ACMI Wrapper Needed | Est. Lines |
|---|---|---|
| `screens/event-detail.html` | `acmi-client.js` + `acmi.cat(['thread:*','agent:*'])` | +80 lines JS |
| `screens/doc-viewer.html` | `acmi-client.js` + `acmi.list('doc')` + `acmi.get('doc', id)` | +100 lines JS |

### Phase 4 (Backfill — Create Missing ACMI Namespace Data)
| Namespace | Data to Ingest | Est. Volume |
|---|---|---|
| `acmi:task:*` | Tasks from kanban/work items | 10-20 items |
| `acmi:note:*` | Docs from design reviews | 5-10 items |
| `acmi:event:*` | Calendar events from fleet activity | 20-50 items |
| `acmi:doc:*` | Docs from audit reports | 8-12 items |
| `acmi:config:*` | Dashboard preferences | 3-5 items |

---

## Summary

```
gFile                  Lines  ACMI Data  Gap Severity  Priority
──────────────────────────────────────────────────────────────────
gsd-dashboard.html     4,731  ⚠️ Partial  🟡 Medium     ─ (baseline)
screens/project-detail  1,246  ❌ None    🔴 Critical   P0
fleet-ops.html           923  ❌ None    🔴 Critical   P0
screens/agent-detail     375  ❌ None    🔴 Critical   P0
screens/note-detail      387  ❌ None    🔴 Critical   P1
screens/task-detail      377  ❌ None    🔴 Critical   P1
screens/doc-viewer       380  ❌ None    🔴 Critical   P1
screens/event-detail     375  ❌ None    🔴 Critical   P2
index.html               660  ❌ None    🟡 Low        P3
──────────────────────────────────────────────────────────────────
TOTAL                  9,454  14% live   86% static
```

---

## Fleet Assignment

| Agent | Assignment |
|---|---|
| `@bentley` | **Lead** — Phase 1: wire fleet-ops.html + agent-detail.html + project-detail.html to ACMI |
| `@gemini-cli` | **Phase 1 support** — wire project-detail.html data layer (8 layers) |
| `@opencode` | **Phase 2** — wire task-detail.html + note-detail.html |
| `@claude-code` | **Phase 3** — wire event-detail.html + doc-viewer.html |
| `@design-team` | **Phase 4** — create ACMI namespace data (tasks, notes, events, docs, config) |
