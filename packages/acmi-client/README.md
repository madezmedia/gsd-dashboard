# @mad-ez/acmi-client

**Browser-compatible ACMI MCP Wrapper** — wraps all ACMI tools (get, list, profile, signal, event, delete, cat, bootstrap, spawn, activeThreads, rollupSet, workList, workGet, workCreate, workEvent, workSignal, dashboardBootstrap) into a single client with caching, polling, event system, and WebSocket support.

Part of the **Mad EZ** ecosystem — connects GSD Dashboard to Live ACMI (Upstash Redis).

---

## Installation

```bash
npm install @mad-ez/acmi-client
```

Or load directly in the browser via a `<script>` tag:

```html
<script src="https://unpkg.com/@mad-ez/acmi-client"></script>
<script>
  // ACMIClient is available globally
  const acmi = new ACMIClient({ endpoint: '/api/acmi' });
</script>
```

---

## Quick Start

```js
// ESM (Node.js 16+ / bundlers)
import ACMIClient, { acmi } from '@mad-ez/acmi-client';

// CommonJS
const ACMIClient = require('@mad-ez/acmi-client');

// Create a client
const client = new ACMIClient({
  endpoint: '/api/acmi',
  cacheTTL: 15000,   // 15s cache
  timeout: 10000,    // 10s timeout
});

// Quick status check
client.status().then(console.log);
// => { online: true, agents: 3 }

// Fetch an entity
client.get('agent', 'claude-engineer').then(console.log);

// Use the pre-created default instance
acmi.list('work').then(console.log);
```

---

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `endpoint` | `'/api/acmi'` | MCP-over-HTTP endpoint URL |
| `cacheTTL` | `15000` | Default cache TTL in milliseconds (15s) |
| `timeout` | `10000` | Request timeout in milliseconds (10s) |
| `retries` | `2` | Number of retries for failed requests |
| `retryDelay` | `500` | Delay between retries in milliseconds |

```js
const client = new ACMIClient({
  endpoint: 'https://api.example.com/acmi',
  cacheTTL: 30000,
  timeout: 15000,
  retries: 3,
  retryDelay: 1000
});
```

---

## API Reference — 17 MCP Wrapper Methods

### Core Namespace Operations

#### `client.get(namespace, id, [opts])`

Fetch complete entity context: profile, signals, and recent timeline events (last 10).

```js
const entity = await client.get('agent', 'claude-engineer');
// => { id: 'claude-engineer', profile: {...}, signals: {...}, timeline: [...] }

// Bypass cache
const fresh = await client.get('agent', 'claude-engineer', { force: true });
```

#### `client.list(namespace, [opts])`

List all entity IDs in a namespace.

```js
const agents = await client.list('agent');
// => ['claude-engineer', 'gpt-4-agent', 'custom-agent']

const workItems = await client.list('work');
// => ['PROJ-001', 'TASK-045', 'IDEA-033']
```

#### `client.profile(namespace, id, data)`

Create or update an entity's profile. Automatically JSON-stringifies the data and invalidates the entity cache.

```js
await client.profile('agent', 'claude-engineer', {
  name: 'Claude Engineer',
  role: 'Senior Developer',
  skills: ['JavaScript', 'Python', 'System Design'],
  status: 'active'
});
```

#### `client.signal(namespace, id, data)`

Update mutable signal state for an entity (mood, priorities, scores, current task, etc.). Automatically JSON-stringifies and invalidates cache.

```js
await client.signal('agent', 'claude-engineer', {
  currentTask: 'Building ACMI client v2',
  mood: 'focused',
  priority: 'P1',
  energy: 0.85
});
```

#### `client.event(namespace, id, source, summary, [kind], [correlationId])`

Log a timestamped timeline event for an entity. Follows ACMI Communication Standard v1.1.

```js
await client.event(
  'agent',
  'claude-engineer',
  'system',
  'Deployed ACMI client v1.0 to production',
  'milestone',
  'corr-deploy-001'
);

await client.event(
  'thread',
  'design-review',
  'claude-engineer',
  'Completed architecture review of payment module',
  'handoff-complete'
);
```

#### `client.delete(key, [confirm])`

Delete an ACMI key. Refuses protected paths (`acmi:registry:*`, `acmi:notion-sync:*`) and any non-`acmi:*` key. Defaults to dry-run — pass `confirm: true` to actually delete.

```js
// Dry-run (default)
const preview = await client.delete('acmi:agent:old-agent:profile');
// => { dryRun: true, key: 'acmi:agent:old-agent:profile', ... }

// Actual deletion
await client.delete('acmi:agent:old-agent:profile', true);
```

### Multi-Stream Timeline

#### `client.cat(keys, [opts])`

Merge and view events from multiple timeline streams, sorted by timestamp.

```js
// Combine agent and thread timelines
const merged = await client.cat(
  ['agent:claude-engineer', 'thread:dashboard'],
  { since: '24h', limit: 50 }
);

// All entities in a namespace
const allEvents = await client.cat(
  ['agent:*', 'work:*'],
  { since: '7d', limit: 100 }
);
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `since` | `string` | `'all'` | Time window filter (`'24h'`, `'7d'`, `'30m'`) |
| `limit` | `number` | `50` | Max events to return |
| `force` | `boolean` | `false` | Bypass cache |

### Agent-Specific Operations

#### `client.bootstrap(agentId)`

One-shot agent context bundle. Fetches everything a fresh agent session needs: profile, signals, active threads, rollup, recent timeline, and spawns.

```js
const ctx = await client.bootstrap('claude-engineer');
// => {
//   agentId: 'claude-engineer',
//   profile: {...},
//   signals: {...},
//   activeThreads: [...],
//   rollup: {...},
//   recentTimeline: [...],
//   spawns: [...]
// }
```

#### `client.spawn(agentId, [sessionId], [modelId])`

Log an agent session spawn event.

```js
await client.spawn('claude-engineer', 'sess-abc-123', 'claude-4');
```

#### `client.activeThreads(agentId)`

Track agent thread engagement — list all threads an agent is currently active in.

```js
const threads = await client.activeThreads('claude-engineer');
// => [{ threadKey: 'thread:dashboard', role: 'lead' }, ...]
```

#### `client.rollupSet(agentId, data)`

Set the latest rollup snapshot for an agent (cross-session summary, decisions, blockers, etc.). Pairs with `bootstrap()`.

```js
await client.rollupSet('claude-engineer', {
  summary: 'Completed Q1 deliverables. Migrated 3 services.',
  decisions: ['Use Redis for cache layer', 'Adopt ACMI v1.1'],
  blockers: ['Awaiting security review for auth module'],
  nextActions: ['Deploy payment pipeline', 'Write integration tests']
});
```

### Work-Item Operations

#### `client.workList()`

List all work item IDs (projects, tasks, ideas).

```js
const ids = await client.workList();
// => ['PROJ-001', 'PROJ-002', 'TASK-045', 'IDEA-033']
```

#### `client.workGet(id)`

Read a work item's full context: profile, signals, timeline (last 50), and sessions.

```js
const work = await client.workGet('PROJ-001');
// => { id: 'PROJ-001', profile: {...}, signals: {...}, timeline: [...], sessions: [...] }
```

#### `client.workCreate(id, profile)`

Create a new work item (cross-session project, task, or idea).

```js
await client.workCreate('PROJ-042', {
  title: 'Redesign Dashboard Navigation',
  owner: 'claude-engineer',
  status: 'in-progress',
  priority: 'P1',
  description: 'Modernize the sidebar navigation with collapsible sections',
  tags: ['ui', 'ux', 'frontend'],
  revenue: 50000
});
```

#### `client.workEvent(id, source, summary, [sessionId])`

Log a progress event on a work item.

```js
await client.workEvent(
  'PROJ-042',
  'claude-engineer',
  'Completed wireframe mockups for new navigation',
  'sess-456-def'
);
```

#### `client.workSignal(id, data)`

Update signals for a work item (progress, blockers, metrics, etc.).

```js
await client.workSignal('PROJ-042', {
  progress: 0.35,
  status: 'in-progress',
  blockers: ['Awaiting design approval'],
  nextMilestone: 'Navigation prototype'
});
```

### Dashboard Bootstrap (Aggregate)

#### `client.dashboardBootstrap([opts])`

Bulk-load all data the dashboard needs in parallel. Fetches: all agents, work items, tasks, notes, events, docs, dashboard config, and merged timeline. Returns structured data with computed KPIs.

```js
const dash = await client.dashboardBootstrap({ timelineSince: '24h' });
// => { agents: [...], workItems: [...], tasks: [...], notes: [...],
//      events: [...], docs: [...], config: {...}, timeline: [...],
//      summary: { urgentCount: 3, activeAgentCount: 5, eventsToday: 42, ... } }
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `force` | `boolean` | `false` | Bypass all caches |
| `timelineSince` | `string` | `'24h'` | Time window for the merged timeline |

---

## Utility Methods

### `client.status()`

Quick health check — verifies the ACMI backend is reachable.

```js
const health = await client.status();
// => { online: true, agents: 3 }
```

### `client.clearCache([namespace])`

Clear the entire cache or a specific namespace's entries.

```js
client.clearCache('agent');   // Clear only agent cache entries
client.clearCache();           // Clear entire cache
```

### `client.on(event, fn)` / `client.off(event, [fn])`

Event system for reacting to ACMI changes.

```js
// Listen for changes
client.on('change', (data) => {
  console.log('ACMI changed:', data);
  // Refresh your UI
});

// Listen for specific events
client.on('profile-updated', ({ namespace, id, data }) => {
  console.log(`Profile updated for ${namespace}:${id}`);
});

client.on('event-logged', ({ namespace, id, summary }) => {
  console.log(`Event: ${summary}`);
});

// Remove listener
client.off('change');
```

**Available events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `change` | `{ type?, event?, topic?, namespace? }` | Generic ACMI change (also from WebSocket) |
| `cache-cleared` | `{ namespace }` | Cache was cleared for a namespace |
| `profile-updated` | `{ namespace, id, data }` | Entity profile was updated |
| `signal-updated` | `{ namespace, id, data }` | Entity signals were updated |
| `event-logged` | `{ namespace, id, summary, kind? }` | Timeline event was logged |
| `key-deleted` | `{ key }` | An ACMI key was deleted |
| `work-created` | `{ id, profile }` | A work item was created |
| `work-event-logged` | `{ id, summary }` | A work event was logged |
| `work-signal-updated` | `{ id, data }` | Work signals were updated |
| `poll:<key>` | `data` | Polling cycle result for a key |
| `poll-error:<key>` | `Error` | Polling cycle error for a key |
| `poll-stopped` | `{ key }` | Polling was stopped for a key |
| `ws-connected` | `{ url }` | WebSocket connected |
| `ws-message` | `message` | WebSocket message received |
| `ws-error` | `error` | WebSocket error |
| `ws-disconnected` | — | WebSocket disconnected |
| `ws-failed` | `error` | WebSocket initialization failed |

### `client.startPolling(key, fetchFn, intervalMs, [callback])`

Start polling a data source at a given interval. Runs immediately, then on interval.

```js
client.startPolling(
  'agent-status',
  () => client.list('agent'),
  30000,
  (err, data) => {
    if (err) console.error('Poll failed:', err);
    else console.log('Agents:', data);
  }
);

// Listen via events
client.on('poll:agent-status', (agents) => {
  console.log('Poll update:', agents);
});
```

### `client.stopPolling(key)`

Stop a polling timer.

```js
client.stopPolling('agent-status');
```

### `client.connectWebSocket([wsUrl])`

Establish WebSocket connection for real-time change events. Auto-reconnects on disconnect (5s delay).

```js
client.connectWebSocket('wss://api.example.com/ws');

client.on('change', (msg) => {
  console.log('Real-time update:', msg);
  // Cache is automatically cleared when changes arrive
});
```

### `client.search(query)`

Search across all dashboard elements using TF-IDF.

```js
const results = await client.search('payment redesign');
// Results include: notes, tasks, docs, work items, and agents
// Each result has: { id, title, content, preview, tags, ns, icon, linkPage, searchScore }
```

### `client.localSearch(query, docs)`

Low-level TF-IDF search over a provided array of documents.

```js
const docs = [
  { id: '1', title: 'Payment Module', content: 'handles stripe integration', tags: ['payments'] },
  { id: '2', title: 'Auth Service', content: 'OAuth2 and JWT tokens', tags: ['security'] },
];
const results = client.localSearch('payment stripe', docs);
```

---

## Dashboard Page Examples

### 1. Overview / Home Page

```js
async function loadOverview() {
  const dash = await client.dashboardBootstrap({ timelineSince: '24h' });

  return {
    kpis: dash.summary,
    // urgentCount, activeAgentCount, eventsToday, pipelineValue, unreadDocs, nextCalendarEvent
    recentTimeline: dash.timeline.slice(0, 20),
    config: dash.config,
  };
}
```

### 2. Agents Page

```js
async function loadAgentsPage() {
  const agentIds = await client.list('agent');

  const agents = await Promise.all(
    agentIds.map(id => client.get('agent', id))
  );

  return agents.map(agent => ({
    id: agent.id,
    name: agent.profile?.name || agent.id,
    role: agent.profile?.role,
    status: agent.signals?.status,
    currentTask: agent.signals?.currentTask,
    lastSeen: agent.timeline?.[0]?.ts,
  }));
}

// Or bootstrap individual agent sessions
const ctx = await client.bootstrap('claude-engineer');
```

### 3. Projects / Work Items Page

```js
async function loadProjectsPage() {
  const ids = await client.workList();

  const items = await Promise.all(
    ids.map(id => client.workGet(id))
  );

  return items.map(item => ({
    id: item.id,
    title: item.profile?.title,
    owner: item.profile?.owner,
    status: item.profile?.status || item.signals?.status,
    priority: item.profile?.priority,
    progress: item.signals?.progress,
    events: item.timeline?.slice(0, 5),
  }));
}

// Create a new project
await client.workCreate('PROJ-099', {
  title: 'New Landing Page',
  owner: 'design-team',
  status: 'planning',
  priority: 'P2',
});

// Log progress
await client.workEvent('PROJ-099', 'design-team', 'Started wireframing');

// Update signals
await client.workSignal('PROJ-099', { progress: 0.1, status: 'in-progress' });
```

### 4. Tasks / To-Do Page

```js
async function loadTasksPage() {
  const taskIds = await client.list('task');

  const tasks = await Promise.all(
    taskIds.map(id => client.get('task', id))
  );

  return tasks
    .map(task => ({
      id: task.id,
      title: task.profile?.title,
      description: task.profile?.description,
      status: task.profile?.status || task.signals?.status,
      priority: task.profile?.priority,
      assignee: task.profile?.assignee,
      tags: task.profile?.tags,
    }))
    .filter(t => t.status !== 'done' && t.status !== 'complete');
}
```

### 5. Notes Page

```js
async function loadNotesPage() {
  const noteIds = await client.list('note');

  const notes = await Promise.all(
    noteIds.map(id => client.get('note', id))
  );

  return notes.map(note => ({
    id: note.id,
    title: note.profile?.title || note.id,
    content: note.profile?.content,
    tags: note.profile?.tags,
    updated: note.timeline?.[0]?.ts,
  }));
}

// Create a note
await client.profile('note', 'note-042', {
  title: 'Architecture Decision Record',
  content: 'We decided to use Redis for the caching layer...',
  tags: ['architecture', 'backend'],
});

// Log that the note was created
await client.event('note', 'note-042', 'system', 'Note created', 'creation');
```

### 6. Documents / Knowledge Page

```js
async function loadDocsPage() {
  const docIds = await client.list('doc');

  const docs = await Promise.all(
    docIds.map(id => client.get('doc', id))
  );

  return docs.map(doc => ({
    id: doc.id,
    title: doc.profile?.title || doc.id,
    content: doc.profile?.content,
    preview: doc.profile?.preview,
    tags: doc.profile?.tags,
    read: doc.signals?.read !== false,
  }));
}

// Mark document as read
await client.signal('doc', 'doc-guide-001', { read: true });
```

### 7. Events / Calendar Page

```js
async function loadCalendarPage() {
  const eventIds = await client.list('event');

  const events = await Promise.all(
    eventIds.map(id => client.get('event', id))
  );

  return events
    .map(evt => ({
      id: evt.id,
      title: evt.profile?.title || evt.id,
      start: evt.profile?.start,
      end: evt.profile?.end,
      description: evt.profile?.description,
    }))
    .filter(evt => evt.start) // only events with dates
    .sort((a, b) => new Date(a.start) - new Date(b.start));
}

// Next upcoming event
const { summary } = await client.dashboardBootstrap();
if (summary.nextCalendarEvent) {
  console.log('Next event:', summary.nextCalendarEvent.profile?.title);
}
```

### 8. Timeline / Activity Page

```js
async function loadActivityPage() {
  // Get merged timeline from all sources
  const timeline = await client.cat(
    ['agent:*', 'thread:*', 'work:*'],
    { since: '7d', limit: 200 }
  );

  return timeline.map(evt => ({
    timestamp: evt.ts,
    source: evt.source,
    summary: evt.summary,
    kind: evt.kind,
    correlationId: evt.correlationId,
  }));
}

// Real-time updates via WebSocket
client.connectWebSocket();
client.on('change', () => {
  // Refresh timeline
  client.cat(['agent:*', 'work:*'], { since: '1h', force: true })
    .then(newEvents => console.log('New events:', newEvents.length));
});
```

---

## Advanced Usage

### Custom Cache Control

```js
// Read with custom cache TTL
const data = await client.get('agent', 'claude-engineer', {
  cacheTTL: 60000,   // cache for 60s
  force: false
});

// Clear specific namespace cache
client.clearCache('agent');

// Full cache clear
client.clearCache();
```

### Polling with Auto-Refresh

```js
// Poll agent list every 30 seconds
client.startPolling('agents', () => client.list('agent', { force: true }), 30000);

// Listen for poll results
client.on('poll:agents', (agents) => {
  updateAgentTable(agents);
});

// Stop when done
setTimeout(() => client.stopPolling('agents'), 300000);
```

### Full Dashboard with Real-Time Updates

```js
import ACMIClient from '@mad-ez/acmi-client';

const client = new ACMIClient({ endpoint: '/api/acmi' });

// Initial load
const data = await client.dashboardBootstrap();
renderDashboard(data);

// Real-time updates via WebSocket
client.connectWebSocket();
client.on('change', async () => {
  const fresh = await client.dashboardBootstrap({ force: true });
  renderDashboard(fresh);
});

// Fallback polling
client.startPolling('dashboard', () => client.dashboardBootstrap({ force: true }), 60000);
```

---

## Events Full Reference

Events emitted by the client, accessible via `client.on(event, handler)`:

| Event | Trigger | Payload |
|-------|---------|---------|
| `change` | Any ACMI mutation (profile, signal, event, delete) or WebSocket update | `{ type?, event?, topic?, namespace?, ... }` |
| `cache-cleared` | `clearCache()` called | `{ namespace: string }` |
| `profile-updated` | `profile()` completed | `{ namespace, id, data }` |
| `signal-updated` | `signal()` completed | `{ namespace, id, data }` |
| `event-logged` | `event()` completed | `{ namespace, id, summary, kind? }` |
| `key-deleted` | `delete()` completed | `{ key }` |
| `work-created` | `workCreate()` completed | `{ id, profile }` |
| `work-event-logged` | `workEvent()` completed | `{ id, summary }` |
| `work-signal-updated` | `workSignal()` completed | `{ id, data }` |
| `poll:<key>` | Polling cycle result | `data` (whatever fetchFn returns) |
| `poll-error:<key>` | Polling cycle error | `Error` |
| `poll-stopped` | `stopPolling()` called | `{ key }` |
| `ws-connected` | WebSocket opened | `{ url }` |
| `ws-message` | WebSocket message received | `{ type?, event?, ... }` |
| `ws-error` | WebSocket error | `error` |
| `ws-disconnected` | WebSocket closed | — |
| `ws-failed` | WebSocket init failed | `error` |

---

## Examples

See the [examples](./examples) directory for a complete HTML example.

---

## License

MIT © Mad EZ Media Partners
