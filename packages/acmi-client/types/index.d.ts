// Type definitions for @mad-ez/acmi-client 1.0.0
// Project: https://github.com/mad-ez/acmi-client

declare module '@mad-ez/acmi-client' {

  // ─── Configuration ───────────────────────────────────────────── //

  export interface ACMIClientOptions {
    /** MCP-over-HTTP endpoint (default: '/api/acmi') */
    endpoint?: string;
    /** Default cache TTL in ms (default: 15000) */
    cacheTTL?: number;
    /** Request timeout in ms (default: 10000) */
    timeout?: number;
    /** Number of retries for failed requests (default: 2) */
    retries?: number;
    /** Delay between retries in ms (default: 500) */
    retryDelay?: number;
  }

  // ─── Core Response Types ─────────────────────────────────────── //

  /** An entity's full context response from acmi_get */
  export interface EntityContext {
    id: string;
    profile?: Record<string, unknown>;
    signals?: Record<string, unknown>;
    timeline?: TimelineEvent[];
    [key: string]: unknown;
  }

  /** A single timeline event */
  export interface TimelineEvent {
    ts: string;
    source: string;
    summary: string;
    kind?: string;
    correlationId?: string;
    [key: string]: unknown;
  }

  /** Agent context bundle from acmi_bootstrap */
  export interface AgentBootstrap {
    agentId: string;
    profile?: Record<string, unknown>;
    signals?: Record<string, unknown>;
    activeThreads?: ActiveThread[];
    rollup?: Record<string, unknown>;
    recentTimeline?: TimelineEvent[];
    spawns?: SpawnEvent[];
    [key: string]: unknown;
  }

  /** Active thread entry */
  export interface ActiveThread {
    threadKey: string;
    role?: string;
    [key: string]: unknown;
  }

  /** Spawn event record */
  export interface SpawnEvent {
    sessionId?: string;
    modelId?: string;
    ts?: string;
    [key: string]: unknown;
  }

  /** Work item full context from acmi_work_get */
  export interface WorkItemContext {
    id: string;
    profile?: WorkItemProfile;
    signals?: Record<string, unknown>;
    timeline?: TimelineEvent[];
    sessions?: Record<string, unknown>[];
    [key: string]: unknown;
  }

  /** Work item profile shape */
  export interface WorkItemProfile {
    title?: string;
    owner?: string;
    status?: string;
    priority?: string;
    description?: string;
    revenue?: number;
    [key: string]: unknown;
  }

  /** Dashboard bootstrap bundle from dashboardBootstrap() */
  export interface DashboardBootstrapResult {
    agents: EntityContext[];
    workItems: WorkItemContext[];
    tasks: EntityContext[];
    notes: EntityContext[];
    events: EntityContext[];
    docs: EntityContext[];
    config: Record<string, unknown>;
    timeline: TimelineEvent[];
    summary: KpiSummary;
  }

  /** KPI summary computed from dashboard bootstrap */
  export interface KpiSummary {
    urgentCount: number;
    activeAgentCount: number;
    eventsToday: number;
    pipelineValue: number;
    unreadDocs: number;
    nextCalendarEvent: EntityContext | null;
  }

  /** Status check result */
  export interface StatusResult {
    online: boolean;
    agents: number;
  }

  /** Cat (multi-stream timeline) request options */
  export interface CatOptions {
    /** Time window filter (e.g. '24h', '7d', '30m') */
    since?: string;
    /** Max events to return (default: 50) */
    limit?: number;
    /** Bypass cache */
    force?: boolean;
  }

  /** Generic request options */
  export interface RequestOptions {
    /** Bypass cache */
    force?: boolean;
    /** Custom cache TTL for this request */
    cacheTTL?: number;
    /** Custom timeout for this request */
    timeout?: number;
    /** Custom retry count for this request */
    retries?: number;
  }

  /** Dashboard bootstrap options */
  export interface DashboardBootstrapOptions extends RequestOptions {
    /** Time window for merged timeline (default: '24h') */
    timelineSince?: string;
  }

  /** Polling timer state */
  export interface PollTimer {
    timer: ReturnType<typeof setInterval>;
    fetchFn: () => Promise<unknown>;
    interval: number;
  }

  /** Search result document */
  export interface SearchDocument {
    id: string;
    title: string;
    content: string;
    preview: string;
    tags: string[];
    ns: string;
    icon: string;
    linkPage: string;
    searchScore?: number;
  }

  /** Event handler function */
  export type EventHandler = (data: unknown) => void;
  export type PollCallback = (err: Error | null, data?: unknown) => void;

  // ─── Change Event Payloads ───────────────────────────────────── //

  export interface CacheClearedEvent {
    namespace: string;
  }

  export interface ProfileUpdatedEvent {
    namespace: string;
    id: string;
    data: Record<string, unknown>;
  }

  export interface SignalUpdatedEvent {
    namespace: string;
    id: string;
    data: Record<string, unknown>;
  }

  export interface EventLoggedEvent {
    namespace: string;
    id: string;
    summary: string;
    kind?: string;
  }

  export interface KeyDeletedEvent {
    key: string;
  }

  export interface WorkCreatedEvent {
    id: string;
    profile: Record<string, unknown>;
  }

  export interface WorkEventLoggedEvent {
    id: string;
    summary: string;
  }

  export interface WorkSignalUpdatedEvent {
    id: string;
    data: Record<string, unknown>;
  }

  export interface PollStoppedEvent {
    key: string;
  }

  export interface WsConnectedEvent {
    url: string;
  }

  export interface WsMessageEvent {
    type?: string;
    event?: string;
    topic?: string;
    namespace?: string;
    [key: string]: unknown;
  }

  export interface WsErrorEvent {
    error?: unknown;
  }

  // ─── Main Client Class ───────────────────────────────────────── //

  export class ACMIClient {

    // ─── Internal State ────────────────────────────────────────── //
    _config: Required<ACMIClientOptions>;
    _cache: Record<string, unknown>;
    _pollTimers: Record<string, PollTimer>;
    _listeners: Record<string, EventHandler[]>;
    _requestId: number;
    _ws: WebSocket | null;
    _lastBootstrapData: DashboardBootstrapResult | null;

    constructor(opts?: ACMIClientOptions);

    // ─── Core Namespace Operations ─────────────────────────────── //

    /**
     * List all entity IDs in a namespace.
     * @param namespace ACMI namespace (e.g. 'agent', 'work', 'note')
     * @param opts Options ({ force: true } to bypass cache)
     */
    list(namespace: string, opts?: RequestOptions): Promise<string[]>;

    /**
     * Fetch complete entity context: profile + signals + recent timeline.
     * @param namespace ACMI namespace
     * @param id Entity ID
     * @param opts Options
     */
    get(namespace: string, id: string, opts?: RequestOptions): Promise<EntityContext>;

    /**
     * Create or update an entity profile.
     * @param namespace ACMI namespace
     * @param id Entity ID
     * @param data Profile data
     */
    profile(namespace: string, id: string, data: Record<string, unknown>): Promise<unknown>;

    /**
     * Update signals for an entity.
     * @param namespace ACMI namespace
     * @param id Entity ID
     * @param data Signal data
     */
    signal(namespace: string, id: string, data: Record<string, unknown>): Promise<unknown>;

    /**
     * Log a timeline event for an entity.
     * @param namespace ACMI namespace
     * @param id Entity ID
     * @param source Source of the event
     * @param summary Human-readable summary
     * @param kind Event kind (step-done, milestone, decision, etc.)
     * @param correlationId Correlation ID for cross-session tracking
     */
    event(
      namespace: string,
      id: string,
      source: string,
      summary: string,
      kind?: string,
      correlationId?: string
    ): Promise<unknown>;

    /**
     * Delete an ACMI key.
     * @param key Full ACMI key (must start with 'acmi:')
     * @param confirm Must be true to actually delete
     */
    delete(key: string, confirm?: boolean): Promise<unknown>;

    // ─── Multi-Stream Timeline ─────────────────────────────────── //

    /**
     * Merge and view events from multiple timeline streams.
     * @param keys Timeline keys (e.g. ['agent:claude-engineer', 'thread:dashboard'])
     * @param opts Options ({ since: '24h', limit: 50 })
     */
    cat(keys: string[], opts?: CatOptions): Promise<TimelineEvent[]>;

    // ─── Agent-Specific Operations ─────────────────────────────── //

    /**
     * One-shot agent context bundle.
     * @param agentId Agent ID
     */
    bootstrap(agentId: string): Promise<AgentBootstrap>;

    /**
     * Log an agent session spawn event.
     * @param agentId Agent ID
     * @param sessionId Session ID (auto-generated if omitted)
     * @param modelId Model ID
     */
    spawn(agentId: string, sessionId?: string, modelId?: string): Promise<unknown>;

    /**
     * Track agent thread engagement.
     * @param agentId Agent ID
     */
    activeThreads(agentId: string): Promise<ActiveThread[]>;

    /**
     * Set the latest rollup snapshot for an agent.
     * @param agentId Agent ID
     * @param data Rollup data
     */
    rollupSet(agentId: string, data: Record<string, unknown>): Promise<unknown>;

    // ─── Work-Item Operations ──────────────────────────────────── //

    /** List all work item IDs. */
    workList(): Promise<string[]>;

    /**
     * Read a work item's full context.
     * @param id Work item ID
     */
    workGet(id: string): Promise<WorkItemContext>;

    /**
     * Create a new work item.
     * @param id Unique work item ID
     * @param profile Work item profile ({ title, owner, status, ... })
     */
    workCreate(id: string, profile: WorkItemProfile): Promise<unknown>;

    /**
     * Log a progress event on a work item.
     * @param id Work item ID
     * @param source Source of the event
     * @param summary Event summary
     * @param sessionId Optional session ID
     */
    workEvent(id: string, source: string, summary: string, sessionId?: string): Promise<unknown>;

    /**
     * Update signals for a work item.
     * @param id Work item ID
     * @param data Signal data (progress, blockers, metrics, etc.)
     */
    workSignal(id: string, data: Record<string, unknown>): Promise<unknown>;

    // ─── Dashboard Bootstrap ───────────────────────────────────── //

    /**
     * Bulk-load all data the dashboard needs in parallel.
     * @param opts Options
     */
    dashboardBootstrap(opts?: DashboardBootstrapOptions): Promise<DashboardBootstrapResult>;

    // ─── Status ────────────────────────────────────────────────── //

    /** Check if the ACMI backend is online. */
    status(): Promise<StatusResult>;

    // ─── Cache ─────────────────────────────────────────────────── //

    /**
     * Clear the entire cache or a specific namespace.
     * @param namespace Optional namespace to clear
     */
    clearCache(namespace?: string): void;

    // ─── Event System ──────────────────────────────────────────── //

    /**
     * Register an event listener.
     * Events: 'cache-cleared', 'profile-updated', 'signal-updated', 'event-logged',
     * 'key-deleted', 'work-created', 'work-event-logged', 'work-signal-updated',
     * 'poll-stopped', 'poll:<key>', 'poll-error:<key>',
     * 'change', 'ws-connected', 'ws-message', 'ws-error', 'ws-disconnected', 'ws-failed'
     * @param event Event name
     * @param fn Handler function
     */
    on(event: string, fn: EventHandler): this;

    /**
     * Remove an event listener.
     * @param event Event name
     * @param fn Handler function (omitting removes all listeners for that event)
     */
    off(event: string, fn?: EventHandler): this;

    // ─── Polling ───────────────────────────────────────────────── //

    /**
     * Start polling a data source at a given interval.
     * @param key Unique poll identifier
     * @param fetchFn Async function that fetches data
     * @param intervalMs Poll interval in milliseconds
     * @param callback Called with result each poll
     */
    startPolling(
      key: string,
      fetchFn: () => Promise<unknown>,
      intervalMs: number,
      callback?: PollCallback
    ): Promise<unknown>;

    /**
     * Stop a polling timer.
     * @param key Poll identifier to stop
     */
    stopPolling(key: string): void;

    /** Stop all active polling timers. */
    stopAllPolling(): void;

    // ─── WebSocket ─────────────────────────────────────────────── //

    /**
     * Establish WebSocket connection for real-time change events.
     * @param wsUrl WebSocket URL (auto-detected if omitted)
     */
    connectWebSocket(wsUrl?: string): void;

    // ─── Search ────────────────────────────────────────────────── //

    /**
     * Local TF-IDF search engine.
     * @param query Search query
     * @param docs Array of documents
     */
    localSearch(query: string, docs: SearchDocument[]): SearchDocument[];

    /**
     * Search across all dashboard elements using TF-IDF.
     * @param query Search query
     */
    search(query: string): Promise<SearchDocument[]>;
  }

  // ─── Default Instance ─────────────────────────────────────────── //

  /** Pre-created default ACMI client instance */
  export const acmi: ACMIClient;

  export default ACMIClient;
}
