# Nielsen Norman 10-Heuristic Evaluation — GSD Dashboard

**Evaluator:** design-ux-researcher
**Date:** May 24, 2026
**Artifact:** `gsd-dashboard.html` (3453 lines, single-page app, 8 pages)
**Design Context:** "Bloomberg Terminal meets The New Yorker" — warm paper, forest green, high-density editorial dashboard for fleet operations.

---

## Methodology

Each of the 8 pages was scored against Nielsen Norman's 10 heuristics on a 0–4 scale:
- **4 = Excellent** — Full compliance, no issues
- **3 = Good** — Minor issues, not impactful
- **2 = Fair** — Notable issues that should be addressed
- **1 = Poor** — Significant problems
- **0 = Critical** — Complete failure / missing entirely

Scores are averaged per page for an overall page score, then across all pages for a system-wide average.

---

## Page 1: Command Center (Home / Overview)

### Heuristic Results

| # | Heuristic | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | **Visibility of system status** | **3** | ACMI status dot in header (online/warn/offline), clock updates every 30s, KPI values update from ACMI polling. Urgent items can be toggled completed with visual feedback (strikethrough + reduced opacity). Refresh button has animated feedback. However, no explicit loading skeleton on initial KPI strip render — hardcoded values appear before ACMI overrides them. Today's Timeline feed has no "last updated" timestamp. |
| 2 | **Match between system and real world** | **4** | Language is spot-on for fleet operators: "P0 Tasks", "blocking", "@agent" mentions, "Overdue", pipeline values in dollars, "Active Agents" with status colors corresponding to real-world agent states (active=green, idle=yellow, sleep=purple, offline=grey). "Urgent Actions" map directly to mental model of a command center. |
| 3 | **User control and freedom** | **3** | Users can navigate freely via sidebar/mobile nav/keyboard (Ctrl+1). Urgent items are click-to-complete with visual feedback (strikethrough), and clicking again toggles back — good undo. No "exit" affordance for the page itself (not needed, it's a page). However, modal search can be dismissed via Escape or clicking outside — good. No back/forward browser history integration for page navigation. |
| 4 | **Consistency and standards** | **4** | Page header pattern (title + subtitle + actions) reused across all pages. Widget cards use consistent header/body/p-0 patterns. Button variants (btn, btn-primary, btn-ghost, btn-sm) are consistent. KPI strip uses the same stat/label/trend pattern. Status dot color scheme is consistent. |
| 5 | **Error prevention** | **2** | Hardcoded mock data in KPI strip (3 P0 tasks, 7 agents, etc.) — no real-time validation. If ACMI fails, the KPI values are silently overwritten with '—' or stay at the stale mock value. No confirmation before toggling urgent items completed — a misclick marks it done. No "undo" toast. The search bar input is `readonly` (opens modal) — prevents accidental typing but could confuse users who try to type directly. |
| 6 | **Recognition rather than recall** | **4** | All information is surface-visible: KPI values, priority badges (P0/P1/P2 in red/amber/grey), agent status colors, time since last action, event sources tagged with agent name. No hidden menus or hover-reveal patterns needed to see critical info. User doesn't need to remember where things are. |
| 7 | **Flexibility and efficiency of use** | **3** | Keyboard shortcuts: Cmd+K search, Ctrl+1-8 page switching, Escape to close modals, / to focus search. Quick Actions bar is an accelerator for power users. However, no configurable shortcuts, no macro/script execution, no custom KPI configuration. The "View all" and "All agents →" links are present but don't go anywhere in the current build. |
| 8 | **Aesthetic and minimalist design** | **4** | Excellent application of the "Bloomberg Terminal meets The New Yorker" aesthetic. Warm paper tones, restrained forest green accent, serif for titles, mono for data. Each unit of information serves a purpose. KPI strip packs 6 metrics in one row. Urgent items show priority + title + meta + time — no extraneous elements. The design is information-dense but scannable. |
| 9 | **Help users recognize, diagnose, and recover from errors** | **2** | ACMI connection errors are handled gracefully: status dot turns amber with "ACMI · Error" text. However, there's no inline error state for individual widgets if ACMI fails — the KPI strip just shows stale mock data silently. The agent grid has a retry button on error. No system-wide error banner. No explanation of *why* ACMI failed. |
| 10 | **Help and documentation** | **2** | Tooltips on note editor toolbar icons (Bold, Italic, etc.). Keyboard shortcut hints shown in search bar (⌘K). No onboarding tour, no contextual help, no dedicated help page. "What is ACMI?" is not explained anywhere in the UI. New users would need external documentation. |

**Page 1 Score: 3.1 / 4.0** — Strong foundation. Primary issues are error recovery (silent staleness) and lack of onboarding.

---

## Page 2: Todo List (Task Management)

| # | Heuristic | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | **Visibility of system status** | **3** | Progress strip shows Today/Week/Month completion with bars and fractions (3/8, 12/23, 18/45). Kanban columns have counts ("Today · 3"). Add task appends immediately with visual feedback. However, no sync/save indicator — tasks exist only in the DOM, with no localStorage or ACMI persistence visible. Gantt view is a static mockup with no interactivity. |
| 2 | **Match between system and real world** | **4** | Kanban columns (Today, This Week, This Month, Backlog) map to how operators think about time. Priority labels P0-P3 mirror real-world triage. Natural language task input ("deploy ownerscout by Friday @growth-hacker") lowers the barrier. Drag-and-drop aligns with physical kanban boards. |
| 3 | **User control and freedom** | **2** | Tasks can be added and dragged (dragstart/dragend events wired), but there is NO actual drag-and-drop reordering or moving between columns implemented — the draggable attribute exists but no dropzone handlers. Undo: tasks cannot be deleted or undone once added (no delete button, no undo mechanism). No way to reorder. No way to collapse/expand columns. |
| 4 | **Consistency and standards** | **4** | Consistent with Page 1 patterns: same widget header style, same priority badges, same meta/color scheme. View toggle (Kanban/Gantt) matches the pattern used on Calendar page. Progress strip is a unique component but uses consistent design tokens. |
| 5 | **Error prevention** | **3** | Natural language task input could parse incorrectly (though no actual NLP is wired). No character limit on task title. No duplicate detection. No validation on "Add" button — empty input is silently ignored (good). However, the input doesn't sanitize in any visible way. The XSS-safe textContent approach in the JS is commendable. |
| 6 | **Recognition rather than recall** | **4** | All task metadata visible on the card: priority badge, title, assignee (@agent), status (due, blocked, done). Filter bar mentioned in design brief but not implemented. Kanban columns make bucket states obvious. The Gantt timeline bars are labeled. |
| 7 | **Flexibility and efficiency of use** | **2** | Keyboard shortcut for page navigation (Ctrl+2). Enter to add task. But no bulk operations, no multi-select, no keyboard navigation within kanban columns (arrow keys, etc.), no quick-filter by typing, no "quick complete" shortcut (like `[x]`). Power users would want batch re-assignment, column reordering, and export. |
| 8 | **Aesthetic and minimalist design** | **4** | Clean kanban layout with proportional column widths. Cards are compact (8px padding, 11px font). Priority colors (P0 danger-red, P1 warning-amber, P2 muted) provide clear visual hierarchy. The 4-column grid stays readable. Progress strip is slim (4px bar height). No clutter. |
| 9 | **Help users recognize, diagnose, and recover from errors** | **1** | No error states visible. If the natural language parser fails (when implemented), the user would have no indication. No validation messages. No feedback if a drag operation is invalid. The Gantt view has no interactivity at all — clicking "Gantt" shows a static mockup with no explanation. |
| 10 | **Help and documentation** | **1** | The placeholder text in the task input gives a hint: `'Add a task… e.g. "deploy ownerscout by Friday @growth-hacker"'`. No tooltip explaining kanban vs gantt. No help for what @mentions do. No documentation for NLP syntax. |

**Page 2 Score: 2.8 / 4.0** — Drag-and-drop is not functional, undo is missing, Gantt is a static mockup, no error recovery.

---

## Page 3: Notes

| # | Heuristic | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | **Visibility of system status** | **3** | Auto-save indicator in the page subtitle: "auto-saving…" → "auto-saved" → "last edited just now". Note list shows modification timestamps. Active note has a visual indicator (left border + darker background). However, there's no explicit "saved" vs "unsaved changes" indicator — the auto-save feedback is text-based and subtle. No sync status with ACMI/localStorage. |
| 2 | **Match between system and real world** | **4** | Notes interface mirrors familiar tools: left sidebar list with search, editor with toolbar (B, I, H, code, list, checklist). Tags shown as clickable chips. The `@agent` mention and `#tag` patterns are conventions users know from Slack/Notion. The Source Serif 4 serif font for the editor body creates a writing-affordance feel. |
| 3 | **User control and freedom** | **3** | Search filters the list in real-time (type to filter). Clicking a note loads it. "+ New Note" button navigates and focuses the editor. However, no way to delete notes, no undo for modifications, no way to reorder/pin notes, no "back" from a note to the list (though clicking another note works). The tag view is mentioned in the design brief but not implemented. |
| 4 | **Consistency and standards** | **4** | Split-panel layout (sidebar + editor) consistent with Docs page. Toolbar icons match standard rich-text conventions (B=bold, I=italic, H=headings, { }=code, ≡=list, ☑=checklist). Tag styling consistent with the note-item tag chips. |
| 5 | **Error prevention** | **2** | No character limit on notes (could be an issue with localStorage). No draft recovery on accidental close. No confirmation before overwriting a note when clicking another. The toolbar buttons are decorative (no actual formatting applied) — could mislead users into thinking rich text editing is functional. |
| 6 | **Recognition rather than recall** | **3** | Note list shows title + preview (2-line clamp) + tags + timestamp — good retrieval cues. However, search only filters by title (not content). Tags are recognizable but not filterable in the current build. The "Note Canvas" (Miro-style) is mentioned in the brief but not implemented. |
| 7 | **Flexibility and efficiency of use** | **2** | Cmd+N shortcut for new note (mentioned in design brief: "Cmd+N → New note"). Markdown toggle visible. But no keyboard shortcuts for formatting (Cmd+B for bold etc.), no slash commands, no template insertion, no quick-capture from search modal. No drag-drop to organize. |
| 8 | **Aesthetic and minimalist design** | **4** | Clean note cards with subtle tags using forest-glow background. Toolbar uses monochrome icons with hover effects. The 280px sidebar width is appropriate. The Source Serif 4 in the editor creates a pleasant writing experience. No visual noise. |
| 9 | **Help users recognize, diagnose, and recover from errors** | **1** | No error states. If localStorage is full or unavailable, no fallback. No "unsaved changes" warning before navigating away. No version history in the current build. If auto-save fails, there's no error indicator. |
| 10 | **Help and documentation** | **2** | Placeholder text in the textarea explains markdown, @mentions, #tags: "Write your note… Supports **markdown**, `code`, @agent mentions, #tags". Toolbar icons have `title` attributes with descriptions (Bold, Italic, etc.). But no onboarding for the note-list/editor layout. |

**Page 3 Score: 2.8 / 4.0** — Auto-save feedback is nice but toolbar formatting is non-functional, no delete/undo, no error recovery.

---

## Page 4: Project Tracker

| # | Heuristic | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | **Visibility of system status** | **3** | Project cards show completion % (progress bar), status badges (Live/Stalled/Draft), and pipeline funnel counts (8 Ideas → 5 Planned → ... → $8.7k Revenue). Project Health dashboard shows stalled items, last activity, avg days idle, agents assigned. However, no live ACMI data connection — all values are hardcoded mock data. No refresh indicator. |
| 2 | **Match between system and real world** | **4** | Pipeline funnel stages (Ideas → Planned → In Progress → Complete → Shipped → Revenue) match real project lifecycle. Status labels (Live, Stalled, Draft) are clear operational terms. "$8.7k" as revenue, "65%" completion, "Blocked: VAPI key" — all match how fleet operators track projects. |
| 3 | **User control and freedom** | **2** | No drill-through implemented — clicking a project card does nothing (no cursor:pointer in the HTML for project cards... actually it does have `cursor: pointer` but no click handler is wired). Semantic search input is decorative. No way to reorder project cards. No way to add/edit/remove projects. The Filter button has no action. |
| 4 | **Consistency and standards** | **4** | Project cards use the same border-radius, background, and typography as other widget cards. Health dashboard uses the same stat/label pattern as KPI strip. Status badges (live/stalled/draft) are consistent with agent status patterns. Pipeline funnel is a unique component but uses consistent colors. |
| 5 | **Error prevention** | **2** | Search project input has no debounce or validation. No confirmation before filtering (though Filter button is non-functional). No constraints on what can be typed. Project cards have no overflow handling for long titles. Health stats have no "no data" state. |
| 6 | ** Recognition rather than recall** | **3** | All project info is on cards (name, status, progress, lead, revenue). Pipeline funnel shows counts at each stage for quick scanning. Health metrics are aggregated. However, semantic search (TF-IDF) and "related-3 sidecar" are mentioned in design brief but not implemented — forcing users to scan manually. |
| 7 | **Flexibility and efficiency of use** | **2** | Search field is present but non-functional. Filter button is decorative. No keyboard shortcuts for project navigation. No bulk operations. No export per project. Power users would want to sort by completion %, filter by status, or search by revenue. |
| 8 | **Aesthetic and minimalist design** | **4** | Responsive grid (auto-fill, minmax 260px) adapts well. Pipeline funnel is a clever use of horizontal space. Health dashboard is a 4-stat row. Each card is compact (14px padding, 10px meta text). Progress bars are thin (3px). No visual overload despite dense information. |
| 9 | **Help users recognize, diagnose, and recover from errors** | **1** | No error states. If ACMI data is unavailable, stale mock data persists silently. No indication that data is mock vs live. Search has no "no results" state. Filter has no feedback. The Export → link in Project Health has no handler. |
| 10 | **Help and documentation** | **1** | No tooltips, no explanations of project health metrics (what does "Avg Days Idle" mean?). No help for the pipeline funnel stages. No guidance on what actions are available. |

**Page 4 Score: 2.6 / 4.0** — Mostly static mockups; drill-through, search, and filter are non-functional. Silent failure on missing data.

---

## Page 5: Calendar & Timeline

| # | Heuristic | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | **Visibility of system status** | **3** | Month/Week view toggle exists (Month is active, Week is non-functional). Today is highlighted (forest-green number, "Today" button scrolls to today). Events are color-coded by type (deadline=danger-red, milestone=forest-green, task=muted). ACMI Timeline widget below shows 3 historical events. However, no loading state for calendar events, no indication if events are ACMI-synced or mock. |
| 2 | **Match between system and real world** | **4** | Standard calendar layout (Sun-Sat, 7-column grid, previous/next month days shown faded). Week starts on Sunday (US convention). Event types (deadline, milestone, task) match project management parlance. Deadline warning legend (48h red, 24h amber, Overdue muted) matches real-world urgency semantics. "Today" button resets to present — intuitive. |
| 3 | **User control and freedom** | **2** | Previous/next month buttons (‹ ›) have no event handlers. Week view toggle is decorative. No drag-to-schedule (mentioned in design brief). No click-to-view event details. No ability to add events from the calendar. No jump-to-date feature. The calendar is entirely static. |
| 4 | **Consistency and standards** | **4** | Calendar uses the same view-toggle pattern as Todo page. Event styling (deadline, milestone, task) uses consistent color coding with other pages (danger, forest, paper-shade). ACMI Timeline widget uses the same tl-event pattern as Page 1. Deadline legend uses same color tokens. |
| 5 | **Error prevention** | **2** | No validation on date navigation. No guard against duplicate events. The calendar grid uses fixed HTML with no empty-state handling (hardcoded 6 rows × 7 columns). If events were dynamically populated, overlapping events on the same day would overflow the 80px min-height cells with no overflow handling (only `text-overflow: ellipsis` on individual events). |
| 6 | **Recognition rather than recall** | **3** | Events are visible as colored chips on their dates — good recognition. Date numbers are monospace and clear. However, no event tooltips on hover, no "more events" indicator on overflow days. Users must remember what deadlines are approaching without scanning the whole month. The deadline legend helps with color recall. |
| 7 | **Flexibility and efficiency of use** | **1** | No keyboard navigation within calendar (arrow keys, etc.). No jump-to-date input. No week numbers. No "go to today" keyboard shortcut. No export (iCal, etc.). No drag-to-schedule (mentioned in brief but absent). No Gantt overlay (mentioned but absent). Power users would expect at minimum arrow-key navigation between months. |
| 8 | **Aesthetic and minimalist design** | **4** | Clean 7-column grid with 80px min-height cells. Events are single-line with ellipsis overflow. Day numbers are small and unobtrusive. Other-month dates are faded to 0.3 opacity. Month header is serif 16px with clear navigation. The deadline legend is compact and placed below the grid. |
| 9 | **Help users recognize, diagnose, and recover from errors** | **1** | No error states. Sync → button has no handler. If events fail to load, there's no fallback. The ACMI Timeline integration is static mock data. No "no events" empty state for blank days. |
| 10 | **Help and documentation** | **1** | Deadline legend serves as minimal documentation. No tooltips on event types. No explanation of what "ACMI Timeline" shows. No help for calendar navigation. |

**Page 5 Score: 2.5 / 4.0** — Pretty static, most navigation controls and promised features (Week view, Gantt overlay, drag-to-schedule) are not functional.

---

## Page 6: Docs

| # | Heuristic | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | **Visibility of system status** | **3** | Document tree sidebar shows active document with highlight + active class. Page subtitle shows "14 documents · 3 types · last edited 12m ago". Doc metadata (type, date, word count, version) shown above the content body. However, no loading state for the document viewer. No indication if documents are live/loaded/stale. Templates section is collapsed under a folder icon. |
| 2 | **Match between system and real world** | **4** | File explorer-style tree view matches how documents are organized in real-world systems. Document types (Spec, Brief, Plan, Guide, Report) map to real document categories. The viewer shows title + meta + formatted body with headings, paragraphs, and code blocks — familiar from Notion/Coda. Templates (Design Brief, Project Plan, Agent Handoff) are recognizable patterns. |
| 3 | **User control and freedom** | **2** | "+ New Doc" button has no handler. Template buttons are decorative. Search input is non-functional. Clicking different documents in the tree has no effect (only the first item is shown active). No way to navigate back/forward through documents. No way to delete or rename. The tree view doesn't collapse/expand filtered documents. No recently accessed list (mentioned in design brief). |
| 4 | **Consistency and standards** | **4** | Left sidebar + right viewer layout is consistent with Notes page. Tree item styling (icon + name + type badge) matches pattern used elsewhere. Doc viewer headings (h2) use consistent Source Serif 4. Code blocks use JetBrains Mono with paper-shade background. Template nesting with indentation is clear. |
| 5 | **Error prevention** | **2** | No validation on document search. No confirmation before navigating away from unsaved edits (though there's no editing). The Search docs input has no placeholder hint for syntax. No safeguards if the document viewer receives malformed markdown. |
| 6 | **Recognition rather than recall** | **3** | Document titles are visible in the tree with type badges. The document viewer shows the full content — no need to remember. However, there's no "recently accessed" quick list (mentioned in brief). The templates section requires recognizing what each template is for from its name alone. |
| 7 | **Flexibility and efficiency of use** | **2** | No keyboard shortcuts for document navigation (Cmd+up/down to move between docs, etc.). No full-text search across documents (only filename-level). No version history panel (mentioned but absent). No link navigation to referenced tasks/agents/projects (mentioned but absent). No document comparison/diff. |
| 8 | **Aesthetic and minimalist design** | **4** | Tree view is clean with 11px font size and subtle hover states. Document viewer has generous 20px/24px padding for readability. Body text at 13px and 1.7 line-height is comfortable for reading. The doc-meta section is compact (10px mono). Minimal chrome. |
| 9 | **Help users recognize, diagnose, and recover from errors** | **1** | No error states at all. If a document fails to load, there's no fallback or retry. Search has no "no results" message. No version history means no way to recover from accidental changes (in a real app). |
| 10 | **Help and documentation** | **1** | No tooltips on document types. No explanation of what Templates section is for. No help on document format (markdown, etc.). No onboarding for the tree+viewer layout. |

**Page 6 Score: 2.6 / 4.0** — Nice layout but almost entirely static; no functional document loading, no search, no creation/deletion.

---

## Page 7: Agent Console

| # | Heuristic | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | **Visibility of system status** | **4** | This is the strongest page for system status. Loading placeholder with pulsing skeleton shows "Loading agent fleet data from ACMI…". Error state has retry button. Agent grid dynamically populated from ACMI with real data. Agent detail panel shows loading spinner on selection, then live profile/signals/timeline data. Comm channel feedback shows "Message sent ✓" on success and "Send failed: <error>" on failure. KPI strip (Fleet Health) shows live metrics: avg response rate, success/fail ratio, tasks completed today, avg cost per task. The page subtitle updates dynamically: "7 agents · 5 online · 1 idle · 1 sleeping · 0 offline". |
| 2 | **Match between system and real world** | **4** | Agent status classifications (online, idle, sleeping, offline) match human operator language. Agent roles (Dev, Orch, Sec, Creative, Mktg, Ops, Copy) map to real team functions. Fleet Health metrics (tasks completed today, cost per task) mirror business KPIs. The comm channel ("Send a message to <agent> via ACMI…") feels like a real chat interface. Assign New Task button at the bottom. |
| 3 | **User control and freedom** | **3** | Agents are clickable → detail panel loads. Comm channel sends messages to ACMI. Refresh button clears cache and re-fetches from ACMI with visual feedback. Retry button on error allows recovery. However, no way to close/dismiss the detail panel (it's a fixed right panel, not a slide-over that can be hidden). No way to go back to agent list from detail panel. No edit capabilities on agent data. |
| 4 | **Consistency and standards** | **4** | Agent cards use the same dot/name/role/task/ts pattern as Page 1's Active Agents grid. Fleet Health uses the same kpi-strip component. Detail panel uses kv-row pattern consistent with Settings rows. Comm channel input matches note editor textarea styling. |
| 5 | **Error prevention** | **3** | Comm channel: textarea disabled during send to prevent double-submission. Button disabled during send. Empty message check prevents blank sends. _esc() utility prevents XSS in agent data rendering/textContent. Retry button re-invokes selectAgent. However, no confirmation before sending a comm message (irreversible). No validation on the task assignment button (non-functional anyway). |
| 6 | **Recognition rather than recall** | **3** | Agent cards show name, role, status dot, current task, and last activity — all visible at a glance. Detail panel shows all data structured in kv-rows with clear labels (Status, Current Task, Skills, Sessions Today, Tokens Used, Last Heartbeat). Recent Events shown with timeline format. However, skills are shown as raw string (no structured display). No visual indicator of which agent is currently selected in the grid. |
| 7 | **Flexibility and efficiency of use** | **2** | Refresh button with visual feedback. ACMI cache clearing on refresh (power-user feature). Comm channel supports Enter to send (with Shift+Enter for newline). But no keyboard shortcuts for agent selection (arrow keys in grid), no bulk operations (message multiple agents), no agent search/filter (Search… widget header is decorative), no agent comparison. |
| 8 | **Aesthetic and minimalist design** | **4** | Agent cards are compact (150px min-width, 10px/12px padding). Fleet Health uses a 4-column KPI strip. Detail panel is 320px — appropriate for a side panel. The loading skeleton uses the same animated pulse pattern across the app. Each agent card shows exactly 5 information elements: dot, name, role, task, timestamp. |
| 9 | **Help users recognize, diagnose, and recover from errors** | **3** | ACMI errors show a descriptive error message in the agent grid with retry button. Agent detail loading failures show the error in the panel with retry button. Comm channel failures show error message in the textarea placeholder. If ACMI client isn't loaded, a clear message is shown: "ACMI client not loaded. Ensure acmi-client.js is loaded." The empty state shows a helpful message: "Select an agent from the grid to view detailed ACMI profile, signals, event timeline, and send commands." |
| 10 | **Help and documentation** | **2** | The empty state (placeholder) serves as built-in documentation: "Select an agent from the grid to view detailed ACMI profile, signals, event timeline, and send commands." However, no tooltips on Fleet Health metrics (what does "Avg Cost Per Task" mean in context?). No explanation of the Comm Channel's purpose. No help for the Assign New Task button. |

**Page 7 Score: 3.2 / 4.0** — The strongest page. Real ACMI integration with loading, empty, error, and data states. Comm channel with feedback. Retry on failure.

---

## Page 8: Settings & Integrations

| # | Heuristic | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | **Visibility of system status** | **4** | API Keys section shows live connection status per service with colored dots (green=Connected, red=Missing key, amber=Re-auth needed/Expiring). Data Source Health section shows each service with dot + status text + latency metric. Dark Mode toggle visually transforms the page instantly. Compact Mode toggle exists (though non-functional). Export buttons are present. All integration statuses are visible at a glance without drilling down. |
| 2 | **Match between system and real world** | **4** | Settings sections (API Keys, Display, Widget Manager, Data Source Health, Export) map to standard software preferences. Each service has a human-readable name and description ("ACMI primary data store", "Voice agent deployment", etc.). Toggle switches match iOS/macOS conventions. Key status patterns (green/red/amber dots) are intuitive. |
| 3 | **User control and freedom** | **3** | Dark Mode toggle works instantly with theme-deep class toggle. Widget Manager toggles exist (though non-functional — they don't actually hide pages). Toggle switches support keyboard activation (Enter/Space). However, no undo for any setting change (dark mode can be toggled back, but other changes have no revert). No way to reset to defaults. API keys cannot be edited or removed through the UI. |
| 4 | **Consistency and standards** | **4** | Settings-row pattern (label + description + control) is consistent throughout. Toggle switches use the same component. Dark mode toggle in sidebar nav works in concert with Settings toggle (same data-action="toggle-dark"). Status dots match the pattern used in header (ACMI status) and agent cards. Settings groups are clearly separated with mono uppercase titles. |
| 5 | **Error prevention** | **3** | Toggle switches have role="switch" and aria-checked for accessibility. Keyboard activation prevents accidental changes via click. However, no confirmation before toggling data sources off/on. No warning when disconnecting critical services (ACMI). No validation that API key inputs (if editable) are well-formed. Export buttons would need confirmation if implemented. |
| 6 | **Recognition rather than recall** | **4** | Every service name is displayed with description text beneath it — no need to remember what "VAPI" or "Postiz" does. Connection status is visible via colored dot + text label. Dark Mode has a visual preview (the page transforms). Widget Manager shows the exact page names. Users can see and recognize all settings at once. |
| 7 | **Flexibility and efficiency of use** | **2** | Speed-dial to Settings via Ctrl+8. Dark mode toggle accessible from sidebar (accelerator). But no bulk operations for API keys, no search within settings, no way to configure keyboard shortcuts, no profile switching (multiple dashboard configurations). Export buttons are present but non-functional. Widget Manager doesn't actually enable/disable pages. |
| 8 | **Aesthetic and minimalist design** | **4** | Settings are constrained to 640px max-width — readable and not overwhelming. Each row is a single-line flex with label, description (in smaller text below), and control. Group titles use compact mono uppercase. Toggle switches are small (32×18px). No visual noise — just labels, descriptions, and controls. |
| 9 | **Help users recognize, diagnose, and recover from errors** | **2** | Data Source Health shows connection errors with amber/red dots and text descriptions. But there's no "retry connection" button. No expandable error detail. If Upstash credentials are wrong, there's no inline error message explaining what to do. Export has no "this feature is not yet implemented" feedback — clicks do nothing silently. |
| 10 | **Help and documentation** | **2** | Each setting has a description text (`.desc` span) explaining what it does. The data-source lines show status text. However, no FAQ section, no "learn more" links, no documentation for what ACMI is or how API keys work. No initial setup wizard or welcome screen for first-time users configuring their dashboard. |

**Page 8 Score: 3.2 / 4.0** — Strong page with live connection status visibility. Dark mode works. Widget Manager is non-functional. API keys are view-only.

---

## Summary Scores

| Page | Heuristic Score | Assessment |
|------|:-:|------------|
| 1 — Command Center | **3.1 / 4.0** | Strong command surface. Silent error recovery on stale data is main issue. |
| 2 — Todo List | **2.8 / 4.0** | Good layout. Drag-and-drop non-functional, no undo, Gantt is static mockup. |
| 3 — Notes | **2.8 / 4.0** | Editing experience decent. Toolbar non-functional, no delete/undo, no error recovery. |
| 4 — Project Tracker | **2.6 / 4.0** | Rich visual display. Drill-through, search, and filter are all non-functional. |
| 5 — Calendar | **2.5 / 4.0** | Visually clean. Navigation and promised features (Week view, Gantt overlay, drag-to-schedule) absent. |
| 6 — Docs | **2.6 / 4.0** | Nice tree+viewer layout. Almost entirely static — no functional loading, search, or creation. |
| 7 — Agent Console | **3.2 / 4.0** | **Best page.** Real ACMI integration with loading/empty/error/data states. Comm channel works. |
| 8 — Settings | **3.2 / 4.0** | Live connection status, working dark mode, clean layout. Widget Manager is non-functional. |

### System-Wide Average: 2.85 / 4.0

---

## Cross-Cutting Findings

### Strengths
1. **Design system consistency** — Every page uses the same tokens, typography, spacing, and component patterns. High visual coherence.
2. **Agent Console & Settings integration** — Pages 7 and 8 have functional ACMI integration with proper loading, empty, error, and data states.
3. **Color-coded status signals** — Priority (P0/P1/P2), agent status (active/idle/sleep/offline), connection status (online/warn/offline) all use consistent, intuitive colors.
4. **Keyboard shortcuts** — Cmd+K search, Ctrl+1-8 page navigation, Escape to close, Enter to submit — solid baseline.
5. **Aesthetic execution** — The "Bloomberg Terminal meets The New Yorker" brief is well-executed; warm paper tones, restraint, editorial typography.
6. **Accessibility foundations** — ARIA attributes on pages (aria-label, aria-hidden, role="region"), focus-visible outlines, inert on inactive pages, reduced-motion support, keyboard navigation on interactive elements.

### Critical Issues (Score ≤ 2.0 average across all pages)

| Heuristic | Avg Score | Status |
|-----------|:---------:|--------|
| **9 — Error recovery** | **1.5** | ⚠️ **WORST** — Pages 2–6 have essentially no error states. Only Pages 7 and 8 handle errors properly. Silent stale data is the norm. |
| **10 — Help & documentation** | **1.5** | ⚠️ **Almost no onboarding/help.** Only placeholder text and a few tooltips exist. No help page, no tour, no contextual help. |
| **7 — Flexibility & efficiency** | **2.0** | ⚠️ Keyboard shortcuts exist for navigation but almost no power-user features, no bulk operations, no configurable shortcuts, no macros. |
| **3 — User control & freedom** | **2.5** | Mixed. Modal/search dismiss works. But no undo on most actions, drag-and-drop broken, many promised interactions are absent. |
| **5 — Error prevention** | **2.4** | Some guardrails (empty input ignored, XSS-safe textContent). But no validation feedback, no confirmation dialogs, no draft recovery. |

### Recommended Fix Priority

1. **P0 — Error recovery across Pages 2–6**: Every widget must show a meaningful error state when data fails to load, with retry actions. Currently only Pages 7 and 8 have this.
2. **P0 — Functional drag-and-drop on Page 2**: Drop zones are missing entirely. A kanban without column movement is a list.
3. **P1 — Non-decorative interactions on Pages 4–6**: Search, filter, navigation, and drill-through must be wired. Currently ~60% of controls are decorative.
4. **P1 — Undo for task operations**: Marking urgent items complete and adding tasks is irreversible. Add undo toast or delete capability.
5. **P2 — Help & onboarding**: Add a minimal help overlay or documentation page explaining ACMI, agent concepts, and keyboard shortcuts.
6. **P2 — Loading states for Pages 1–6**: Only Page 7 shows loading skeletons. Other pages flash hardcoded data before (potentially) updating from ACMI.

---

*Evaluation methodology: Nielsen Norman Group's 10 Usability Heuristics for User Interface Design (1994). Each heuristic scored on a 0–4 scale per page, based on code analysis of `gsd-dashboard.html` (3453 lines) and `acmi-client.js` (781 lines).*
