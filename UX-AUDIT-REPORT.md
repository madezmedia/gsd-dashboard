# UX Audit Report — GSD Dashboard ACMI Integration

**Audited:** 2026-05-25  
**Project root:** `b0867076-555a-4da3-a39f-a10c81d44368/`  
**Scope:** Findability, navigation, orphaned-tool detection, ACMI data state coverage, consistency, dark mode

---

## Navigation Flow Diagram (Textual)

```
index.html (Launchpad)
  │
  ├──→ gsd-dashboard.html (Main SPA — 8 pages)
  │       ├── Command Center (#page-command)  ← default
  │       │     ├──→ [agent card click] → screens/agent-detail.html
  │       │     ├──→ [project card click] → screens/project-detail.html
  │       │     └──→ "Detail →" button → screens/agent-detail.html
  │       ├── Todo (#page-todo)  ← sidebar
  │       │     └──→ [task item click?] → no link wired
  │       ├── Notes (#page-notes)  ← sidebar
  │       │     └──→ note-item click opens inline editor (no detail page link)
  │       ├── Project Tracker (#page-projects)  ← sidebar
  │       │     └──→ [project card click] → screens/project-detail.html
  │       ├── Calendar (#page-calendar)  ← sidebar
  │       │     └──→ [event click] → screens/event-detail.html (NOT wired)
  │       ├── Docs (#page-docs)  ← sidebar
  │       │     └──→ [doc tree item click] → opens in-page viewer (no detail page link)
  │       ├── Agent Console (#page-agents)  ← sidebar
  │       │     ├──→ [agent card click] → inline detail panel (NOT screens/agent-detail.html)
  │       │     └──→ KPI strip, event timeline, comm channel (all in-page)
  │       └── Settings (#page-settings)  ← sidebar
  │
  ├──→ fleet-ops.html (Standalone — own sidebar nav)
  │     └──→ no links to detail screens
  │
  ├──→ explainer.html (Marketing animation — self-contained)
  │
  └──→ screens/agent-detail.html ← "Back to Dashboard" → index.html (WRONG TARGET)
  └──→ screens/task-detail.html  ← "Back to Dashboard" → index.html (WRONG TARGET)
  └──→ screens/note-detail.html  ← "Back to Dashboard" → index.html (WRONG TARGET)
  └──→ screens/event-detail.html ← "Back to Dashboard" → index.html (WRONG TARGET)
  └──→ screens/doc-viewer.html   ← "Back to Dashboard" → index.html (WRONG TARGET)
  └──→ screens/project-detail.html ← top-bar back-link → no href (LOOKS BROKEN)
```

---

## Page-by-Page Findability Scores

| Page | Path | Findability | Notes |
|------|------|:-----------:|-------|
| **Command Center** | `gsd-dashboard.html` `#page-command` | 🟢 | Default landing page, sidebar item #1 |
| **Todo List** | `gsd-dashboard.html` `#page-todo` | 🟢 | Sidebar item #2 |
| **Notes** | `gsd-dashboard.html` `#page-notes` | 🟢 | Sidebar item #3 |
| **Project Tracker** | `gsd-dashboard.html` `#page-projects` | 🟢 | Sidebar item #4 |
| **Calendar** | `gsd-dashboard.html` `#page-calendar` | 🟢 | Sidebar item #5 |
| **Docs** | `gsd-dashboard.html` `#page-docs` | 🟢 | Sidebar item #6 |
| **Agent Console** | `gsd-dashboard.html` `#page-agents` | 🟢 | Sidebar item #7 |
| **Settings** | `gsd-dashboard.html` `#page-settings` | 🟢 | Sidebar item #8 |
| **Agent Detail** | `screens/agent-detail.html` | 🟡 | Reachable from Command Center "Detail →" link, but not directly from Agent Console sidebar (which uses inline panel instead). Back link → index.html, not gsd-dashboard.html. |
| **Project Detail** | `screens/project-detail.html` | 🟡 | Reachable from Project Tracker cards. Back link broken (`#` href on top-bar). |
| **Task Detail** | `screens/task-detail.html` | 🔴 | **Orphaned** — no links from main SPA. Todo kanban items do not link to task-detail.html. Only reachable via direct URL. |
| **Note Detail** | `screens/note-detail.html` | 🔴 | **Orphaned** — Notes page uses inline editor, does not link to note-detail.html. Only reachable via direct URL. |
| **Event Detail** | `screens/event-detail.html` | 🔴 | **Orphaned** — Calendar page has no clickable events linking to event-detail.html. Only reachable via direct URL. |
| **Doc Viewer** | `screens/doc-viewer.html` | 🔴 | **Orphaned** — Docs page uses inline viewer, does not link to doc-viewer.html. Only reachable via direct URL. |
| **Fleet Ops** | `fleet-ops.html` | 🟡 | Reachable from `index.html` and `index.html` only. No link from `gsd-dashboard.html` sidebar. Standalone page with its own sidebar. |
| **System Launchpad** | `index.html` | 🟢 | Entry point, links to all major pages |
| **Explainer** | `explainer.html` | 🟡 | Reachable from `index.html` only. No link from dashboard. |

---

## Orphaned Tools & Dead Ends

### 🔴 ORPHANED — Not Reachable From Main SPA (0 clicks from dashboard)

1. **`screens/task-detail.html`** — No link exists anywhere in the main SPA. The Todo kanban items are draggable cards with no `href` or click handler that navigates to a detail view. The `addTask()` JS function writes to ACMI but doesn't open a detail page.

2. **`screens/note-detail.html`** — No link exists. The Notes page has an inline editor. Clicking a note in the list toggles it active in the sidebar editor; there's no "Open in detail view" affordance.

3. **`screens/event-detail.html`** — No link exists. The Calendar page renders inline event dots and a timeline strip. No click handler navigates to event-detail.html.

4. **`screens/doc-viewer.html`** — No link exists. The Docs page has an inline tree + viewer. No "Open in new view" link.

### 🟡 PARTIALLY REACHABLE

5. **`fleet-ops.html`** — Only reachable from `index.html` (the launchpad). The main SPA sidebar has no "Fleet Ops" link. Users in the dashboard must leave to the launchpad to access fleet ops.

6. **`explainer.html`** — Only reachable from `index.html`. Not linked from the dashboard at all.

### 🔴 BROKEN BACK-NAVIGATION (Dead-End Detail Screens)

7. **`screens/project-detail.html`** — The top-bar `back-link` has no `href` attribute. The HTML shows `<a class="back-link" href="#">` — clicking it does nothing useful (navigates to `#` / top of page). Users are stranded.

8. **`screens/agent-detail.html`** — Has two back links: `../index.html` (launchpad) and `#` (void for "Back to Agents"). Neither returns to `gsd-dashboard.html`. Users coming from the dashboard go to the launchpad instead.

9. **`screens/task-detail.html`** — Single back link goes to `../index.html` instead of `../gsd-dashboard.html`.

10. **`screens/note-detail.html`** — Back links → `../index.html` and `#` (void).

11. **`screens/event-detail.html`** — Back links → `../index.html` and `#` (void).

12. **`screens/doc-viewer.html`** — Back links → `../index.html` and `#` (void).

---

## Consistency Audit

### Navigation Chrome

| Page | Has Sidebar? | Has Header? | Dark Mode Toggle? | Search? |
|------|:---:|:---:|:---:|:---:|
| `gsd-dashboard.html` | ✅ | ✅ | ✅ (sidebar footer) | ✅ (Cmd+K, `/`, search bar) |
| `fleet-ops.html` | ✅ | ✅ | ✅ (sidebar footer) | ❌ |
| `index.html` | ❌ | ✅ (custom) | ✅ (header badge) | ❌ |
| `explainer.html` | ❌ | ❌ | ❌ | ❌ |
| `screens/agent-detail.html` | ❌ | ❌ | ❌ (CSS supports `.theme-deep` but no toggle) | ❌ |
| `screens/project-detail.html` | ❌ | ❌ (has minimal top-bar) | ❌ (CSS supports `.theme-deep` but no toggle) | ❌ |
| `screens/task-detail.html` | ❌ | ❌ | ❌ (CSS supports `.theme-deep` but no toggle) | ❌ |
| `screens/note-detail.html` | ❌ | ❌ | ❌ (CSS supports `.theme-deep` but no toggle) | ❌ |
| `screens/event-detail.html` | ❌ | ❌ | ❌ (CSS supports `.theme-deep` but no toggle) | ❌ |
| `screens/doc-viewer.html` | ❌ | ❌ | ❌ (CSS supports `.theme-deep` but no toggle) | ✅ (in-page search) |

**Key findings:**
- No detail screen shares the main SPA's chrome. They are standalone pages with minimal navigation.
- Dark mode *styles* exist on all pages via CSS, but only `gsd-dashboard.html`, `fleet-ops.html`, and `index.html` have a toggle UI. Detail screens rely on `localStorage` or previous page setting — but there's no path for users to toggle it when they land directly on a detail page.
- The `index.html` launchpad uses a different header design than the dashboard, but the design tokens are consistent.

### URL Param Pattern

- **Required but missing:** No detail screen parses URL query parameters. All are fully static HTML with hardcoded demo data.
- `screens/project-detail.html` uses `#project=acmi-fleet-ops` hash format but never reads it from JS.
- `gsd-dashboard.html` uses hash-based routing (`#page-command`, etc.) but only for SPA page switching — not for linking to external detail pages.
- **Ideal pattern:** `screens/agent-detail.html?id=agent-ll-7` — consistent, parseable, bookmarkable.

---

## ACMI Data State Coverage

### Main SPA (gsd-dashboard.html)

| Component | Loading State | Empty State | Error State | Status |
|-----------|:---:|:---:|:---:|:------|
| KPI Strip | ✅ Pulse skeleton animation | ✅ Static fallback values | ❌ No explicit error UI | 🟡 Good |
| Urgent Actions List | ✅ Skeleton items | ✅ Empty placeholder | ❌ No error handling | 🟡 |
| Agent Status Grid | ✅ Skeleton cards | ✅ "No agents online" empty state | ❌ No error state | 🟡 |
| Timeline Feed | ✅ Skeleton events | ✅ "No recent events" placeholder | ❌ No error state | 🟡 |
| Todo Kanban | ❌ No loading state | ✅ Empty column "No tasks" | ❌ No error state | 🟡 |
| Notes List | ❌ No loading state | ✅ "No notes logged" placeholder | ❌ No error state | 🟡 |
| Project Grid | ❌ No loading state | ❌ Falls back to static HTML silently | ❌ No error state | 🔴 |
| Calendar | ❌ No loading state | ✅ "No recent events" text | ❌ No error state | 🟡 |
| Docs Tree | ❌ No loading state | ❌ Falls back to static HTML | ❌ No error state | 🔴 |
| Agent Console | ✅ Agent cards have skeleton | ✅ "No agents" placeholder | ❌ No error state | 🟡 |
| Settings | ❌ No loading state | ❌ Static HTML only | ❌ No error state | 🔴 |
| Search Modal | ❌ No loading state | ✅ "No results found" message | ❌ No error state | 🟡 |

### Detail Screens (All)

| Page | Loading State | Empty State | Error State | Status |
|------|:---:|:---:|:---:|:------|
| **screens/agent-detail.html** | ❌ None | ❌ None | ❌ None | 🔴 100% static |
| **screens/project-detail.html** | ❌ None | ❌ None | ❌ None | 🔴 100% static |
| **screens/task-detail.html** | ❌ None | ❌ None | ❌ None | 🔴 100% static |
| **screens/note-detail.html** | ❌ None | ❌ None | ❌ None | 🔴 100% static |
| **screens/event-detail.html** | ❌ None | ❌ None | ❌ None | 🔴 100% static |
| **screens/doc-viewer.html** | ❌ None | ❌ None | ❌ None | 🔴 100% static |
| **fleet-ops.html** | ❌ None | ❌ None | ❌ None | 🔴 100% static |

**Note:** The ACMI-COMPONENT-WIRING-CHECKLIST.md confirms: 148 total components across the project, only 24 (16%) are live-wired. The main SPA handles loading/empty with CSS skeleton classes and placeholders, but the detail screens have zero data-fetching logic.

---

## Dark Mode Audit

| Page | `.theme-deep` CSS? | Toggle UI? | `localStorage` Persist? | Works on direct load? |
|------|:---:|:---:|:---:|:---:|
| `gsd-dashboard.html` | ✅ Full | ✅ Sidebar + header button | ✅ | ✅ |
| `fleet-ops.html` | ✅ Full | ✅ Sidebar button | ✅ | ✅ |
| `index.html` | ✅ Full | ✅ Header "☾ Dark" | ✅ | ✅ |
| `explainer.html` | ❌ | ❌ | ❌ | ❌ (dark-only design) |
| `screens/agent-detail.html` | ✅ (CSS only) | ❌ | ❌ (no toggle) | 🟡 (picks up localStorage if set) |
| `screens/project-detail.html` | ✅ (CSS only) | ❌ | ❌ | 🟡 |
| `screens/task-detail.html` | ✅ (CSS only) | ❌ | ❌ | 🟡 |
| `screens/note-detail.html` | ✅ (CSS only) | ❌ | ❌ | 🟡 |
| `screens/event-detail.html` | ✅ (CSS only) | ❌ | ❌ | 🟡 |
| `screens/doc-viewer.html` | ✅ (CSS only) | ❌ | ❌ | 🟡 |

**Finding:** All detail screens include `.theme-deep` CSS variable overrides and `body.theme-deep` styling. If a user sets dark mode in the SPA or launchpad (which writes to `localStorage`), detail screens would respect it **if** they read `localStorage` on load — but none of them do. The theme class would be lost on page transition because each screen is a separate HTML file.

---

## Recommendations (Ranked by Priority)

### 🔴 P0 — Critical Fixes

1. **Fix all "Back to Dashboard" links on detail screens**  
   Change `href="../index.html"` → `href="../gsd-dashboard.html"` on all 6 detail screens. Users come from the dashboard, they should return to the dashboard — not the launchpad.

2. **Wire Todo kanban items → task-detail.html**  
   Add click handlers with URL like `screens/task-detail.html?id=<task-id>` so users can drill into task details. Currently clicking a kanban card does nothing.

3. **Wire Calendar events → event-detail.html**  
   Add click handlers on calendar grid events to navigate `screens/event-detail.html?id=<event-id>`.

4. **Wire Notes list → note-detail.html**  
   Add "Open in detail view" button or double-click handler on note items.

5. **Wire Docs tree → doc-viewer.html**  
   Add "Open in viewer" option on doc tree items.

6. **Fix project-detail.html broken back link**  
   The `back-link` has `href="#"` — change to `href="../gsd-dashboard.html"`.

### 🟡 P1 — High Priority

7. **Add "Fleet Ops" link to main SPA sidebar**  
   Currently fleet-ops.html is invisible from the dashboard. Add a nav item under System group or in the footer.

8. **Add dark mode toggle to all detail screens**  
   Include a visible toggle (e.g., in the header/top-bar). Even if localStorage sync is implemented, the user needs a way to toggle when on a detail page directly.

9. **Implement URL param parsing on all detail screens**  
   Add JS that reads `?id=X` or `#project=X` from the URL and fetches ACMI data. Currently all screens are static placeholders.

10. **Add loading/empty/error states to detail screens**  
    Every detail component should show a skeleton during load, a friendly message when empty, and error UI when ACMI is unreachable. See `gsd-dashboard.html`'s `.state-placeholder` and `.skeleton` classes for the pattern.

### 🟢 P2 — Medium Priority

11. **Add search to fleet-ops.html**  
    Consistent with the main SPA, it should have at least a local search bar.

12. **Standardize URL param naming**  
    Use `?id=<entity-id>` consistently across all screens. Currently project-detail uses `#project=`, others don't parse anything.

13. **Add browser history / back-button support for SPA pages**  
    Navigating between dashboard pages with the sidebar doesn't update the URL hash or push history state. Deep-linking to a specific page bookmark only works if the hash is set on load.

14. **Add `localStorage` theme sync to detail screens**  
    Read `localStorage.getItem('acmi-theme')` on DOMContentLoaded and apply `.theme-deep` class to `body` if present.

### 🔵 P3 — Nice to Have

15. **Add "Back to Agents" real link on agent-detail.html**  
    Currently `href="#"` — should link back to `gsd-dashboard.html#page-agents` (or a hash fragment for the SPA).

16. **Add explainer.html link from dashboard**  
    Could be a footer link or "About" menu item.

17. **Responsive sidebar collapse**  
    On narrow screens, the sidebar (`--nav-w: 200px`) takes up significant space. Consider a hamburger toggle.

---

## Summary

| Metric | Count |
|--------|:-----:|
| Total pages/screens | 10 |
| 🟢 Fully findable (≤2 clicks from SPA) | 8 |
| 🟡 Partially findable (3+ clicks or limited reach) | 4 |
| 🔴 Orphaned (no path from dashboard) | 5 |
| 🔴 Dead-end pages (broken back nav) | 1 |
| Pages with proper loading/empty/error states | 1 (gsd-dashboard.html, partial) |
| Pages with dark mode toggle | 3 |
| Pages with search | 2 |
| ACMI live-wired components | 24 / 148 (16%) |
