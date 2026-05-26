/* ================================================================
   ACMI Client Wrapper v1.0 — Phase 0: Foundation
   GSD Dashboard → Live ACMI (Upstash Redis) Wiring
   ================================================================
   Wraps all ACMI MCP tools into a browser-callable client.
   Single-file ES5-compatible module — no build step required.
   Include via: <script src="acmi-client.js"></script>
   ================================================================ */

(function (root) {
  'use strict';

  var DEFAULTS = {
    endpoint: '/api/acmi',              // ACMI-over-HTTP endpoint (Vercel /api/acmi)
    token: null,                    // Auth Bearer token
    cacheTTL: 15000,                // Default cache TTL (15s)
    timeout: 10000,                 // Request timeout (10s)
    retries: 2,                     // Failed request retries
    retryDelay: 500                 // Delay between retries (ms)
  };

  /* ─── Cache Entry Constructor ────────────────────────────────── */
  function CacheEntry(data, ttl) {
    this.data = data;
    this.expiresAt = Date.now() + (ttl || DEFAULTS.cacheTTL);
  }

  CacheEntry.prototype.isExpired = function () {
    return Date.now() >= this.expiresAt;
  };

  function ACMIClient(opts) {
    opts = opts || {};
    
    // Auto-detect token from URL or localStorage if not explicitly passed
    var detectedToken = null;
    if (typeof window !== 'undefined') {
      try {
        var params = new URLSearchParams(window.location.search);
        detectedToken = params.get('token');
      } catch (e) {}
      if (!detectedToken) {
        try {
          detectedToken = localStorage.getItem('gsd:token');
        } catch (e) {}
      }
    }

    this._config = {
      endpoint: opts.endpoint || DEFAULTS.endpoint,
      token: opts.token || detectedToken || DEFAULTS.token || null,
      cacheTTL: opts.cacheTTL || DEFAULTS.cacheTTL,
      timeout: opts.timeout || DEFAULTS.timeout,
      retries: opts.retries != null ? opts.retries : DEFAULTS.retries,
      retryDelay: opts.retryDelay || DEFAULTS.retryDelay
    };
    this._cache = {};
    this._pollTimers = {};
    this._listeners = {};
    this._requestId = 0;

    // Bind public API to instance
    this.get = this.get.bind(this);
    this.list = this.list.bind(this);
    this.profile = this.profile.bind(this);
    this.signal = this.signal.bind(this);
    this.event = this.event.bind(this);
    this['delete'] = this['delete'].bind(this);
    this.cat = this.cat.bind(this);
    this.bootstrap = this.bootstrap.bind(this);
    this.spawn = this.spawn.bind(this);
    this.activeThreads = this.activeThreads.bind(this);
    this.rollupSet = this.rollupSet.bind(this);
    this.workList = this.workList.bind(this);
    this.workGet = this.workGet.bind(this);
    this.workCreate = this.workCreate.bind(this);
    this.workEvent = this.workEvent.bind(this);
    this.workSignal = this.workSignal.bind(this);
    this.dashboardBootstrap = this.dashboardBootstrap.bind(this);
    this.status = this.status.bind(this);
    this.clearCache = this.clearCache.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.startPolling = this.startPolling.bind(this);
    this.stopPolling = this.stopPolling.bind(this);
  }

  /* ─── Internal: HTTP Request ─────────────────────────────────── */
  ACMIClient.prototype._request = function (tool, params, opts) {
    opts = opts || {};
    var self = this;
    var payload = {
      tool: tool,
      params: params || {}
    };

    var maxRetries = opts.retries != null ? opts.retries : this._config.retries;
    var attempt = 0;

    function doFetch() {
      return new Promise(function (resolve, reject) {
        var reqId = ++self._requestId;
        var controller = new AbortController();
        var timer = setTimeout(function () {
          controller.abort();
          reject(new Error('ACMI request timeout: ' + tool + ' (request #' + reqId + ')'));
        }, opts.timeout || self._config.timeout);

        var headers = { 'Content-Type': 'application/json' };
        if (self._config.token) {
          headers['Authorization'] = 'Bearer ' + self._config.token;
        }

        fetch(self._config.endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        }).then(function (response) {
          clearTimeout(timer);
          if (!response.ok) {
            return response.text().then(function (text) {
              var errMsg = 'ACMI HTTP ' + response.status;
              try {
                var body = JSON.parse(text);
                if (body.error) errMsg += ': ' + body.error;
              } catch (e) { if (text) errMsg += ': ' + text; }
              var err = new Error(errMsg);
              err.status = response.status;
              err.tool = tool;
              throw err;
            });
          }
          return response.json();
        }).then(function (data) {
          // Typical MCP response: { result: ... } or { data: ... }
          // or just the entity directly
          resolve(data);
        }).catch(function (err) {
          clearTimeout(timer);
          if (err.name === 'AbortError') {
            reject(new Error('ACMI request aborted: ' + tool));
          } else {
            reject(err);
          }
        });
      });
    }

    function retryLoop() {
      return doFetch().catch(function (err) {
        attempt++;
        if (attempt <= maxRetries && _isRetryable(err)) {
          return new Promise(function (resolve) {
            setTimeout(resolve, self._config.retryDelay * attempt);
          }).then(retryLoop);
        }
        throw err;
      });
    }

    return retryLoop();
  };

  function _isRetryable(err) {
    // Retry on network errors, 5xx, and 429 rate limits
    if (!err.status) return true; // Network error (no status)
    return err.status >= 500 || err.status === 429;
  }

  /* ─── Internal: Cached Request ───────────────────────────────── */
  ACMIClient.prototype._cachedRequest = function (cacheKey, tool, params, opts) {
    opts = opts || {};
    var self = this;

    // Check cache
    var entry = this._cache[cacheKey];
    if (entry && !entry.isExpired() && !opts.force) {
      return Promise.resolve(entry.data);
    }

    // Fetch and cache
    return this._request(tool, params, opts).then(function (data) {
      self._cache[cacheKey] = new CacheEntry(data, opts.cacheTTL || self._config.cacheTTL);
      return data;
    });
  };

  /* ─── Clear Cache ────────────────────────────────────────────── */
  ACMIClient.prototype.clearCache = function (namespace) {
    if (namespace) {
      // Clear only entries matching a namespace prefix
      var prefix = namespace + ':';
      for (var key in this._cache) {
        if (this._cache.hasOwnProperty(key) && key.indexOf(prefix) === 0) {
          delete this._cache[key];
        }
      }
    } else {
      this._cache = {};
    }
    this._emit('cache-cleared', { namespace: namespace || '*all*' });
  };

  /* ─── Event System ───────────────────────────────────────────── */
  ACMIClient.prototype.on = function (event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return this;
  };

  ACMIClient.prototype.off = function (event, fn) {
    var list = this._listeners[event];
    if (!list) return this;
    if (!fn) {
      delete this._listeners[event];
    } else {
      this._listeners[event] = list.filter(function (f) { return f !== fn; });
    }
    return this;
  };

  ACMIClient.prototype._emit = function (event, data) {
    var list = this._listeners[event];
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      try { list[i](data); } catch (e) { /* swallow listener errors */ }
    }
  };

  /* ─── Status Check ───────────────────────────────────────────── */
  ACMIClient.prototype.status = function () {
    return this.list('agent').then(function (agents) {
      return { online: true, agents: agents.length };
    }).catch(function () {
      return { online: false, agents: 0 };
    });
  };

  /* ─── Core Namespace Operations ──────────────────────────────── */

  /**
   * List all entity IDs in a namespace.
   * @param {string} namespace - ACMI namespace (e.g. 'agent', 'work', 'note')
   * @param {object} [opts] - Options ({ force: true } to bypass cache)
   * @returns {Promise<string[]>}
   */
  ACMIClient.prototype.list = function (namespace, opts) {
    var cacheKey = 'list:' + namespace;
    return this._cachedRequest(cacheKey, 'acmi_list', { namespace: namespace }, opts);
  };

  /**
   * Fetch complete entity context: profile + signals + recent timeline.
   * @param {string} namespace - ACMI namespace
   * @param {string} id - Entity ID
   * @param {object} [opts] - Options
   * @returns {Promise<object>} { id, profile, signals, timeline }
   */
  ACMIClient.prototype.get = function (namespace, id, opts) {
    var cacheKey = 'get:' + namespace + ':' + id;
    return this._cachedRequest(cacheKey, 'acmi_get', { namespace: namespace, id: id }, opts);
  };

  /**
   * Create or update an entity profile.
   * @param {string} namespace - ACMI namespace
   * @param {string} id - Entity ID
   * @param {object} data - Profile data (will be JSON-stringified)
   * @returns {Promise<void>}
   */
  ACMIClient.prototype.profile = function (namespace, id, data) {
    var self = this;
    var cacheKey = 'get:' + namespace + ':' + id;
    return this._request('acmi_profile', {
      namespace: namespace,
      id: id,
      profile: JSON.stringify(data)
    }).then(function (result) {
      // Invalidate cache for this entity
      delete self._cache[cacheKey];
      self._emit('profile-updated', { namespace: namespace, id: id, data: data });
      return result;
    });
  };

  /**
   * Update signals for an entity.
   * @param {string} namespace - ACMI namespace
   * @param {string} id - Entity ID
   * @param {object} data - Signal data (will be JSON-stringified)
   * @returns {Promise<void>}
   */
  ACMIClient.prototype.signal = function (namespace, id, data) {
    var self = this;
    var cacheKey = 'get:' + namespace + ':' + id;
    return this._request('acmi_signal', {
      namespace: namespace,
      id: id,
      signals: JSON.stringify(data)
    }).then(function (result) {
      delete self._cache[cacheKey];
      self._emit('signal-updated', { namespace: namespace, id: id, data: data });
      return result;
    });
  };

  /**
   * Log a timeline event for an entity.
   * @param {string} namespace - ACMI namespace
   * @param {string} id - Entity ID
   * @param {string} source - Source of the event
   * @param {string} summary - Human-readable summary
   * @param {string} [kind] - Event kind (step-done, milestone, decision, etc.)
   * @param {string} [correlationId] - Correlation ID for cross-session tracking
   * @returns {Promise<void>}
   */
  ACMIClient.prototype.event = function (namespace, id, source, summary, kind, correlationId) {
    var self = this;
    var params = {
      namespace: namespace,
      id: id,
      source: source,
      summary: summary
    };
    if (kind) params.kind = kind;
    if (correlationId) params.correlationId = correlationId;

    return this._request('acmi_event', params).then(function (result) {
      // Invalidate timeline cache entries for this entity
      var prefix = 'get:' + namespace + ':' + id;
      for (var key in self._cache) {
        if (self._cache.hasOwnProperty(key) && key.indexOf(prefix) === 0) {
          delete self._cache[key];
        }
      }
      self._emit('event-logged', { namespace: namespace, id: id, summary: summary, kind: kind });
      return result;
    });
  };

  /**
   * Delete an ACMI key.
   * @param {string} key - Full ACMI key (must start with 'acmi:')
   * @param {boolean} [confirm] - Must be true to actually delete
   * @returns {Promise<void>}
   */
  ACMIClient.prototype['delete'] = function (key, confirm) {
    var self = this;
    return this._request('acmi_delete', {
      key: key,
      confirm: confirm === true
    }).then(function (result) {
      self.clearCache();
      self._emit('key-deleted', { key: key });
      return result;
    });
  };

  /* ─── Multi-Stream Timeline ──────────────────────────────────── */

  /**
   * Merge and view events from multiple timeline streams.
   * @param {string[]} keys - Timeline keys (e.g. ['agent:claude-engineer', 'thread:dashboard'])
   * @param {object} [opts] - Options ({ since: '24h', limit: 50 })
   * @returns {Promise<object[]>} Sorted timeline events
   */
  ACMIClient.prototype.cat = function (keys, opts) {
    opts = opts || {};
    var params = { keys: keys };
    if (opts.since) params.since = opts.since;
    if (opts.limit) params.limit = opts.limit;

    var cacheKey = 'cat:' + keys.sort().join(',') + ':' + (opts.since || 'all') + ':' + (opts.limit || 50);
    if (opts.force) {
      return this._request('acmi_cat', params);
    }
    return this._cachedRequest(cacheKey, 'acmi_cat', params, opts);
  };

  /* ─── Agent-Specific Operations ───────────────────────────────── */

  /**
   * One-shot agent context bundle.
   * @param {string} agentId - Agent ID
   * @returns {Promise<object>} { agentId, profile, signals, activeThreads, rollup, recentTimeline, spawns }
   */
  ACMIClient.prototype.bootstrap = function (agentId) {
    var self = this;
    var cacheKey = 'bootstrap:' + agentId;
    return this._cachedRequest(cacheKey, 'acmi_bootstrap', { agentId: agentId }).then(function (data) {
      // Ensure consistent shape
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) {}
      }
      return data;
    });
  };

  /**
   * Log an agent session spawn event.
   * @param {string} agentId - Agent ID
   * @param {string} [sessionId] - Session ID (auto-generated if omitted)
   * @param {string} [modelId] - Model ID
   * @returns {Promise<void>}
   */
  ACMIClient.prototype.spawn = function (agentId, sessionId, modelId) {
    var params = { agentId: agentId };
    if (sessionId) params.sessionId = sessionId;
    if (modelId) params.modelId = modelId;
    return this._request('acmi_spawn', params);
  };

  /**
   * Track agent thread engagement.
   * @param {string} agentId - Agent ID
   * @returns {Promise<object[]>} List of active threads
   */
  ACMIClient.prototype.activeThreads = function (agentId) {
    return this._request('acmi_active', {
      agentId: agentId,
      action: 'list'
    });
  };

  /**
   * Set the latest rollup snapshot for an agent.
   * @param {string} agentId - Agent ID
   * @param {object} data - Rollup data (will be JSON-stringified)
   * @returns {Promise<void>}
   */
  ACMIClient.prototype.rollupSet = function (agentId, data) {
    return this._request('acmi_rollup_set', {
      agentId: agentId,
      rollup: JSON.stringify(data)
    });
  };

  /* ─── Work-Item Operations ───────────────────────────────────── */

  /**
   * List all work item IDs.
   * @returns {Promise<string[]>}
   */
  ACMIClient.prototype.workList = function () {
    return this._cachedRequest('work:list', 'acmi_work_list', {});
  };

  /**
   * Read a work item's full context.
   * @param {string} id - Work item ID
   * @returns {Promise<object>} { id, profile, signals, timeline, sessions }
   */
  ACMIClient.prototype.workGet = function (id) {
    var cacheKey = 'work:get:' + id;
    return this._cachedRequest(cacheKey, 'acmi_work_get', { id: id });
  };

  /**
   * Create a new work item.
   * @param {string} id - Unique work item ID
   * @param {object} profile - Work item profile ({ title, owner, status, ... })
   * @returns {Promise<void>}
   */
  ACMIClient.prototype.workCreate = function (id, profile) {
    var self = this;
    return this._request('acmi_work_create', {
      id: id,
      profile: JSON.stringify(profile)
    }).then(function (result) {
      delete self._cache['work:list'];
      self._emit('work-created', { id: id, profile: profile });
      return result;
    });
  };

  /**
   * Log a progress event on a work item.
   * @param {string} id - Work item ID
   * @param {string} source - Source of the event
   * @param {string} summary - Event summary
   * @param {string} [sessionId] - Optional session ID
   * @returns {Promise<void>}
   */
  ACMIClient.prototype.workEvent = function (id, source, summary, sessionId) {
    var self = this;
    var params = { id: id, source: source, summary: summary };
    if (sessionId) params.sessionId = sessionId;
    return this._request('acmi_work_event', params).then(function (result) {
      delete self._cache['work:get:' + id];
      self._emit('work-event-logged', { id: id, summary: summary });
      return result;
    });
  };

  /**
   * Update signals for a work item.
   * @param {string} id - Work item ID
   * @param {object} data - Signal data (progress, blockers, metrics, etc.)
   * @returns {Promise<void>}
   */
  ACMIClient.prototype.workSignal = function (id, data) {
    var self = this;
    return this._request('acmi_work_signal', {
      id: id,
      signals: JSON.stringify(data)
    }).then(function (result) {
      delete self._cache['work:get:' + id];
      self._emit('work-signal-updated', { id: id, data: data });
      return result;
    });
  };

  /* ─── Dashboard Bootstrap (Aggregate) ────────────────────────── */

  /**
   * Bulk-load all data the dashboard needs in parallel.
   * This loads: all agents, work items, tasks, notes, events, docs,
   * dashboard config, and merged timeline.
   *
   * @param {object} [opts] - Options
   * @param {boolean} [opts.force] - Bypass cache
   * @param {string} [opts.timelineSince] - Time window for merged timeline (default: '24h')
   * @returns {Promise<object>} DashboardBootstrap bundle
   */
  ACMIClient.prototype.dashboardBootstrap = function (opts) {
    opts = opts || {};
    var self = this;
    // Single server-side bulk call — replaces 100+ individual HTTP requests
    return self._request('acmi_dashboard_bootstrap', {
      maxAgents: opts.maxAgents || 20,
      maxWork: opts.maxWork || 20,
      timelineSince: opts.timelineSince || '7d',
      timelineLimit: opts.timelineLimit || 100
    }).then(function (data) {
      if (!data) return { agents: [], workItems: [], tasks: [], notes: [], events: [], docs: [], config: {}, timeline: [], summary: {} };

      // Normalize: dashboard code expects full context objects, not {id, profile, signals}
      function toContext(item) {
        if (!item) return null;
        var p = item.profile || {};
        var s = item.signals || {};
        // Fleet agent profiles often use actor_type instead of name — normalize
        if (!p.name && p.actor_type) p.name = p.actor_type;
        if (!p.name) p.name = item.id || 'agent';
        return { id: item.id, profile: p, signals: s };
      }

      var result = {
        agents: (data.agents || []).map(toContext).filter(Boolean),
        workItems: (data.workItems || []).map(toContext).filter(Boolean),
        tasks: (data.tasks || []).map(function (t) { return t.data || t; }),
        notes: (data.notes || []).map(function (n) { return n.data || n; }),
        events: (data.events || []).map(function (e) { return e.data || e; }),
        docs: (data.docs || []).map(function (d) { return d.data || d; }),
        config: data.config || {},
        timeline: data.timeline || [],
        summary: data.summary || {}
      };
      // Compute KPIs client-side (same as before)
      result.summary = self._computeKpis(result.agents, result.workItems, result.tasks, result.notes, result.events, result.docs, result.timeline);
      self._lastBootstrapData = result;
      return result;
    });
  };

  /* ─── Internal: KPI Computation ──────────────────────────────── */

  ACMIClient.prototype._computeKpis = function (agents, workItems, tasks, notes, events, docs, timeline) {
    // Urgent: work items or tasks with P0/P1 priority, not complete
    var urgentCount = 0;
    var allTasks = (tasks || []).concat(workItems || []);
    allTasks.forEach(function (item) {
      var sig = item.signals || item.signal || {};
      var profile = item.profile || {};
      var priority = profile.priority || sig.priority || '';
      var completed = sig.completed === true || profile.status === 'complete' || profile.status === 'done';
      if ((priority === 'P0' || priority === 'P1') && !completed) {
        urgentCount++;
      }
    });

    // Active agents: signals.status === 'active'
    var activeAgentCount = 0;
    (agents || []).forEach(function (agent) {
      var sig = agent.signals || agent.signal || {};
      if (sig.status === 'active') activeAgentCount++;
    });

    // Events today from timeline
    var eventsToday = 0;
    var today = new Date().toISOString().slice(0, 10);
    (timeline || []).forEach(function (evt) {
      var ts = String(evt.ts || '');
      if (ts.slice(0, 10) === today) eventsToday++;
    });

    // Pipeline value: sum of profile.revenue (or signals.revenue)
    var pipelineValue = 0;
    (workItems || []).forEach(function (item) {
      var profile = item.profile || {};
      var sig = item.signals || {};
      var rev = parseFloat(profile.revenue || sig.revenue || 0);
      if (!isNaN(rev)) pipelineValue += rev;
    });

    // Unread docs
    var unreadDocs = 0;
    (docs || []).forEach(function (doc) {
      var sig = doc.signals || doc.signal || {};
      if (sig.read === false) unreadDocs++;
    });

    // Next calendar event
    var nextCalendarEvent = null;
    var now = new Date();
    (events || []).forEach(function (evt) {
      var profile = evt.profile || {};
      var start = profile.start || '';
      if (start && new Date(start) > now) {
        if (!nextCalendarEvent || new Date(start) < new Date(nextCalendarEvent.profile.start)) {
          nextCalendarEvent = evt;
        }
      }
    });

    return {
      urgentCount: urgentCount,
      activeAgentCount: activeAgentCount,
      eventsToday: eventsToday,
      pipelineValue: pipelineValue,
      unreadDocs: unreadDocs,
      nextCalendarEvent: nextCalendarEvent
    };
  };

  /* ─── Polling Scheduler ──────────────────────────────────────── */

  /**
   * Start polling a data source at a given interval.
   * @param {string} key - Unique poll identifier
   * @param {function} fetchFn - Async function that fetches data
   * @param {number} intervalMs - Poll interval in milliseconds
   * @param {function} [callback] - Called with result each poll
   * @returns {Promise<void>} Resolves after first successful poll
   */
  ACMIClient.prototype.startPolling = function (key, fetchFn, intervalMs, callback) {
    var self = this;

    // Stop existing poll for this key
    if (this._pollTimers[key]) {
      clearInterval(this._pollTimers[key].timer);
    }

    // Run immediately, then on interval
    function runPoll() {
      return Promise.resolve()
        .then(fetchFn)
        .then(function (data) {
          self._emit('poll:' + key, data);
          if (callback) callback(null, data);
          return data;
        })
        .catch(function (err) {
          self._emit('poll-error:' + key, err);
          if (callback) callback(err);
        });
    }

    var firstPoll = runPoll();

    var timer = setInterval(runPoll, intervalMs);
    this._pollTimers[key] = {
      timer: timer,
      fetchFn: fetchFn,
      interval: intervalMs
    };

    return firstPoll;
  };

  /**
   * Stop a polling timer.
   * @param {string} key - Poll identifier to stop
   */
  ACMIClient.prototype.stopPolling = function (key) {
    var poll = this._pollTimers[key];
    if (poll) {
      clearInterval(poll.timer);
      delete this._pollTimers[key];
      this._emit('poll-stopped', { key: key });
    }
  };

  /**
   * Stop all active polling timers.
   */
  ACMIClient.prototype.stopAllPolling = function () {
    for (var key in this._pollTimers) {
      if (this._pollTimers.hasOwnProperty(key)) {
        this.stopPolling(key);
      }
    }
  };

  /**
   * Establish WebSocket connection for real-time change events.
   * Falls back to polling if WebSocket fails.
   */
  ACMIClient.prototype.connectWebSocket = function (wsUrl) {
    // WebSocket not supported in proxy mode — silently no-op
    return;
    var self = this;
    if (this._ws) {
      try { this._ws.close(); } catch (e) {}
    }

    // Detect URL if not provided
    if (!wsUrl) {
      var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      var host = window.location.host || 'localhost:8080';
      wsUrl = protocol + '//' + host + '/ws';
    }

    console.log('[ACMI WS] Connecting to ' + wsUrl);
    try {
      var ws = new WebSocket(wsUrl);
      this._ws = ws;

      ws.onopen = function () {
        console.log('[ACMI WS] Connected successfully');
        self._emit('ws-connected', { url: wsUrl });
      };

      ws.onmessage = function (event) {
        try {
          var msg = JSON.parse(event.data);
          console.log('[ACMI WS] Received message:', msg);
          self._emit('ws-message', msg);

          // Trigger change events if relevant
          if (msg.type === 'acmi-change' || msg.event === 'update' || msg.topic === 'acmi') {
            self._emit('change', msg);
            if (msg.namespace) {
              self.clearCache(msg.namespace);
            } else {
              self.clearCache();
            }
          }
        } catch (e) {
          console.error('[ACMI WS] Error parsing message:', e);
        }
      };

      ws.onerror = function (err) {
        console.warn('[ACMI WS] Connection error:', err);
        self._emit('ws-error', err);
      };

      ws.onclose = function () {
        console.log('[ACMI WS] Connection closed');
        self._ws = null;
        self._emit('ws-disconnected');

        // Reconnect after delay (5s)
        setTimeout(function () {
          self.connectWebSocket(wsUrl);
        }, 5000);
      };
    } catch (e) {
      console.warn('[ACMI WS] WebSocket initialization failed:', e);
      self._emit('ws-failed', e);
    }
  };

  /**
   * Local TF-IDF search engine.
   * Compiles tf-idf scores for a query across a list of documents.
   * @param {string} query - The search query
   * @param {object[]} docs - Array of documents { id, text, ns, title, ... }
   * @returns {object[]} Ranked search results with scores
   */
  ACMIClient.prototype.localSearch = function (query, docs) {
    if (!query || !docs || docs.length === 0) return [];

    // Tokenize a string (lowercase, alphanumeric split)
    function tokenize(text) {
      if (!text) return [];
      return text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(function (w) { return w.length > 1; }); // skip single characters
    }

    var queryTerms = tokenize(query);
    if (queryTerms.length === 0) return [];

    // Tokenize each document
    var docTokens = docs.map(function (doc) {
      var content = (doc.title || '') + ' ' + (doc.content || '') + ' ' + (doc.preview || '') + ' ' + (doc.id || '') + ' ' + (doc.tags ? doc.tags.join(' ') : '');
      return tokenize(content);
    });

    var numDocs = docs.length;

    // Calculate IDF for each query term
    var idfs = {};
    queryTerms.forEach(function (term) {
      var docsWithTerm = 0;
      docTokens.forEach(function (tokens) {
        if (tokens.indexOf(term) !== -1) {
          docsWithTerm++;
        }
      });
      // IDF = ln(1 + totalDocs / (1 + docsWithTerm))
      idfs[term] = Math.log(1 + (numDocs / (1 + docsWithTerm)));
    });

    // Calculate scores for each document
    var results = [];
    for (var i = 0; i < numDocs; i++) {
      var doc = docs[i];
      var tokens = docTokens[i];
      var score = 0;

      if (tokens.length === 0) continue;

      // Term Frequency counts
      var termCounts = {};
      tokens.forEach(function (t) {
        termCounts[t] = (termCounts[t] || 0) + 1;
      });

      queryTerms.forEach(function (term) {
        if (termCounts[term]) {
          var tf = termCounts[term] / tokens.length;
          score += tf * idfs[term];
        }
      });

      if (score > 0) {
        results.push({
          doc: doc,
          score: score
        });
      }
    }

    // Sort by score descending
    results.sort(function (a, b) {
      return b.score - a.score;
    });

    return results.map(function (r) {
      var returnedDoc = r.doc;
      returnedDoc.searchScore = r.score;
      return returnedDoc;
    });
  };

  /**
   * Search across all dashboard elements using TF-IDF.
   * @param {string} query - Search query
   * @returns {Promise<object[]>} Searched documents matching query
   */
  ACMIClient.prototype.search = function (query) {
    var self = this;
    var fetchPromise = this._lastBootstrapData 
      ? Promise.resolve(this._lastBootstrapData)
      : this.dashboardBootstrap({ force: false });

    return fetchPromise.then(function (data) {
      var docs = [];

      // Notes
      (data.notes || []).forEach(function (note) {
        var profile = note.profile || {};
        docs.push({
          id: note.id,
          title: profile.title || note.title || note.id,
          content: profile.content || note.content || '',
          preview: profile.preview || note.preview || '',
          tags: profile.tags || note.tags || [],
          ns: 'note',
          icon: '📝',
          linkPage: 'page-notes'
        });
      });

      // Tasks
      (data.tasks || []).forEach(function (task) {
        var profile = task.profile || {};
        var signals = task.signals || {};
        docs.push({
          id: task.id,
          title: profile.title || task.title || task.id,
          content: profile.description || '',
          preview: 'Status: ' + (profile.status || signals.status || ''),
          tags: profile.tags || task.tags || [],
          ns: 'task',
          icon: '☑',
          linkPage: 'page-todo'
        });
      });

      // Docs
      (data.docs || []).forEach(function (doc) {
        var profile = doc.profile || {};
        docs.push({
          id: doc.id,
          title: profile.title || doc.title || doc.id,
          content: profile.content || doc.content || '',
          preview: profile.preview || doc.preview || '',
          tags: profile.tags || doc.tags || [],
          ns: 'doc',
          icon: '📄',
          linkPage: 'page-docs'
        });
      });

      // WorkItems
      (data.workItems || []).forEach(function (work) {
        var profile = work.profile || {};
        var signals = work.signals || {};
        docs.push({
          id: work.id,
          title: profile.title || work.title || work.id,
          content: profile.description || '',
          preview: 'Status: ' + (profile.status || signals.status || ''),
          tags: profile.tags || work.tags || [],
          ns: 'project',
          icon: '📊',
          linkPage: 'page-projects'
        });
      });

      // Agents
      (data.agents || []).forEach(function (agent) {
        var profile = agent.profile || {};
        var signals = agent.signals || {};
        docs.push({
          id: agent.id,
          title: profile.name || agent.id,
          content: profile.role || '',
          preview: signals.currentTask || '',
          tags: profile.skills || [],
          ns: 'agent',
          icon: '🤖',
          linkPage: 'page-agents'
        });
      });

      return self.localSearch(query, docs);
    });
  };

  /* ─── Exports ────────────────────────────────────────────────── */

  root.ACMIClient = ACMIClient;
  root.acmi = new ACMIClient();

})(typeof window !== 'undefined' ? window : global);
