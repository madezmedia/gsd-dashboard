# ACMI Data Gap Map — GSD Dashboard

**Version:** 1.0
**Date:** 2026-05-25
**Goal:** Zero mock data. Every namespace seeded. Any user can `node server.mjs` and see a fully populated workspace.

---

## Namespace Status

| Namespace | Status | Records Needed | Server Support |
|-----------|--------|---------------|----------------|
| `acmi:agent:*` | ✅ LIVE | 15 auto-fetched | list/get/bootstrap |
| `acmi:work:*` | ✅ LIVE | 30 auto-fetched | workList/workGet/workCreate/workSignal/workEvent |
| `acmi:task:*` | ❌ EMPTY | ~12 seed tasks | profile/signal/list (via acmi:task:* in proxy) |
| `acmi:note:*` | ❌ EMPTY | ~5 seed notes | profile/signal/list |
| `acmi:event:*` | ❌ EMPTY | ~6 seed events | profile/signal/list |
| `acmi:doc:*` | ❌ EMPTY | ~4 seed docs | profile/signal/list |
| `acmi:config:dashboard` | ❌ EMPTY | 1 config record | profile/signal/get |
| `acmi:thread:*` | ✅ PARTIAL | agent-coordination has data | cat/list |

---

## Per-Page Data Map

### 1. Command Center (`#page-command`)
| Component | ID | Source | Status |
|-----------|-----|--------|--------|
| KPI strip (6 metrics) | `.kpi-value` | `data.agents`, `data.workItems` | ✅ LIVE |
| Urgent actions list | `#ccUrgentList` | `data.workItems` filtered P0/P1 | ✅ LIVE |
| Agent cards | `#ccAgentGrid` | `data.agents` | ✅ LIVE |
| Today's timeline | `#ccTimelineFeed` | `data.timeline` + `acmi.cat()` | ✅ LIVE |
| ACMI status | `#acmiDot`, `#acmiLabel` | `updateACMIStatus()` | ✅ LIVE |

### 2. Todo List (`#page-todo`)
| Component | ID | Source | Status |
|-----------|-----|--------|--------|
| Kanban columns (4) | `.kanban-col` | `data.tasks` | ❌ EMPTY → seed `acmi:task:*` |
| Gantt timeline | `#todoGanttView` | `data.tasks` | ❌ EMPTY → seed `acmi:task:*` |
| Add task form | `#taskInput` | `acmi.profile('task', ...)` | ✅ WRITE works, needs task namespace seeded |
| KPI strip | `.kpi-value` | `data.tasks.length` | ❌ Shows 0 |

**Data shape for `acmi:task:*`:**
```json
{
  "id": "task-{uuid}",
  "profile": {
    "title": "Deploy OwnerScout MVP",
    "priority": "P0",
    "status": "today",
    "owner": "@claude-engineer",
    "dueDate": "2026-05-28"
  },
  "signals": {
    "completed": false,
    "blocked": false,
    "pipeline": "design-agency-pipeline"
  }
}
```

### 3. Notes (`#page-notes`)
| Component | ID | Source | Status |
|-----------|-----|--------|--------|
| Notes list | `#notesList` | `data.notes` | ❌ EMPTY → seed `acmi:note:*` |
| Note editor | `#noteEditor` | `acmi.get('note', id)` | ✅ WRITE works, needs data |
| Auto-save | debounce | `acmi.profile('note', id, ...)` | ✅ WRITE works |
| @mention | `#noteEditor` | `acmi.list('agent')` | ✅ LIVE |

**Data shape for `acmi:note:*`:**
```json
{
  "id": "note-{uuid}",
  "profile": {
    "title": "GSD Dashboard Architecture",
    "content": "## Overview\nThe GSD Dashboard is an 8-page SPA...",
    "preview": "## Overview\nThe GSD Dashboard is an 8-page SPA...",
    "tags": ["architecture", "acmi"],
    "modified": "2026-05-25T12:00:00Z"
  },
  "signals": {
    "pinned": false,
    "wordCount": 1200,
    "version": 1
  }
}
```

### 4. Project Tracker (`#page-projects`)
| Component | ID | Source | Status |
|-----------|-----|--------|--------|
| Pipeline funnel | `#projectPipeline` | `data.workItems` | ✅ LIVE |
| Project cards | `#projectGrid` | `data.workItems` | ✅ LIVE |
| Health stats | `#projectHealthGrid` | `data.workItems` | ✅ LIVE |
| Search/filter | `#projectSearchInput` | client-side | ✅ LIVE |

### 5. Calendar (`#page-calendar`)
| Component | ID | Source | Status |
|-----------|-----|--------|--------|
| Month grid | `#calendarGrid` | `data.events` | ❌ EMPTY → seed `acmi:event:*` |
| Event dots | `.event-dot` | `data.events` | ❌ EMPTY → seed `acmi:event:*` |
| Create event | click day | `acmi.profile('event', ...)` | ✅ WRITE works |
| ACMI Timeline (30d) | `#calTimelineList` | `_lastTimeline` | ✅ LIVE |

**Data shape for `acmi:event:*`:**
```json
{
  "id": "event-{uuid}",
  "profile": {
    "title": "Design Review",
    "type": "milestone",
    "start": "2026-05-25T10:00:00Z",
    "end": "2026-05-25T11:00:00Z",
    "allDay": false
  },
  "signals": {}
}
```

### 6. Docs (`#page-docs`)
| Component | ID | Source | Status |
|-----------|-----|--------|--------|
| Doc tree | `#docTree` | `data.docs` | ❌ EMPTY → seed `acmi:doc:*` |
| Doc viewer | `#docContentView` | `acmi.get('doc', id)` | ✅ WRITE works |
| New doc | button | `acmi.profile('doc', ...)` | ✅ WRITE works |

**Data shape for `acmi:doc:*`:**
```json
{
  "id": "doc-{uuid}",
  "profile": {
    "title": "ACMI Fleet Architecture",
    "type": "Spec",
    "content": "# ACMI Fleet Architecture\n\nThe ACMI fleet...",
    "updated": "2026-05-25T12:00:00Z"
  },
  "signals": {
    "isTemplate": false,
    "read": false
  }
}
```

### 7. Agent Console (`#page-agents`)
| Component | ID | Source | Status |
|-----------|-----|--------|--------|
| Fleet health KPIs | `.kpi-value` | computed from agents | ✅ LIVE |
| Agent grid | `#agentGrid` | `data.agents` | ✅ LIVE |
| Agent detail | `#agentDetailPanel` | `acmi.bootstrap(id)` | ✅ LIVE |
| Assign task | form | `acmi.workCreate()` | ✅ LIVE |

### 8. Settings (`#page-settings`)
| Component | ID | Source | Status |
|-----------|-----|--------|--------|
| API keys list | `#settingsApiKeys` | `data.config.profile.apiKeys` | ❌ EMPTY → seed `acmi:config:dashboard` |
| Widget toggles | `.toggle-switch` | `data.config.signals.widgets` | ❌ EMPTY → seed |
| Dark mode | toggle | localStorage | ✅ CLIENT-SIDE |
| Export | button | `acmi.list()` calls | ✅ WORKS with live data |

---

## Detail Pages (`screens/`)

| File | Lines | ACMI Needed | Status |
|------|-------|-------------|--------|
| `agent-detail.html` | 375 | agent bootstrap data | ✅ Agent Console already shows this inline |
| `task-detail.html` | 377 | `acmi:task:*` profile | ❌ Needs task namespace seeded |
| `note-detail.html` | 387 | `acmi:note:*` profile | ❌ Needs note namespace seeded |
| `project-detail.html` | 1246 | `acmi:work:*` get | ✅ workGet works, showing in tracker |
| `event-detail.html` | 375 | `acmi:event:*` profile | ❌ Needs event namespace seeded |
| `doc-viewer.html` | 380 | `acmi:doc:*` profile | ❌ Needs doc namespace seeded |

---

## Server Capability Matrix (server.mjs)

| Tool | Route | Status |
|------|-------|--------|
| `list(ns)` | POST → tool=list | ✅ Returns SMEMBERS of acmi:{ns}:list |
| `get(ns, id)` | POST → tool=get | ✅ TYPE-aware, handles string + hash + zset |
| `profile(ns, id, data)` | POST → tool=profile | ✅ SET as JSON string + SADD to list |
| `signal(ns, id, data)` | POST → tool=signal | ✅ Merge + SET as JSON string |
| `event(ns, id, ...)` | POST → tool=event | ✅ ZADD to timeline |
| `cat(keys, opts)` | POST → tool=cat | ✅ ZREVRANGEBYSCORE across keys |
| `workList()` | POST → tool=workList | ✅ SMEMBERS acmi:work:list |
| `workGet(id)` | POST → tool=workGet | ✅ Full context fetch |
| `workCreate(id, profile)` | POST → tool=workCreate | ✅ SET + SADD |
| `workSignal(id, data)` | POST → tool=workSignal | ✅ Merge + SET |
| `workEvent(id, ...)` | POST → tool=workEvent | ✅ ZADD |
| `bootstrap(id)` | POST → tool=bootstrap | ✅ Full bundle |
| `dashboardBootstrap()` | POST → tool=dashboardBootstrap | ✅ Parallel batch aggregate |
| `delete(key)` | POST → tool=delete | ❌ Not implemented (daemon-only) |

---

## Seeding Required

To fully populate the dashboard, seed these keys:

```bash
# 12 tasks
acmi:task:task-{1..12}:profile    → SET
acmi:task:task-{1..12}:signals    → SET
acmi:task:list                    → SADD

# 5 notes
acmi:note:note-{1..5}:profile     → SET
acmi:note:note-{1..5}:signals     → SET
acmi:note:list                     → SADD

# 6 events
acmi:event:event-{1..6}:profile   → SET
acmi:event:event-{1..6}:signals   → SET
acmi:event:list                    → SADD

# 4 docs
acmi:doc:doc-{1..4}:profile       → SET
acmi:doc:doc-{1..4}:signals       → SET
acmi:doc:list                      → SADD

# 1 config
acmi:config:dashboard:profile     → SET
acmi:config:dashboard:signals     → SET
config:list                        → SADD
```
