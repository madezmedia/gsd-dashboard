# UX Implementation Audit — GSD Dashboard

**Reviewer:** design-ux-architect  
**Date:** May 24, 2026  
**Artifact:** `gsd-dashboard.html` (3264 lines, 8-page SPA)  
**Cross-references:** `design-fidelity-audit.md` (Bentley), `ACMI-INTEGRATION-PLAN.md`

---

## Executive Summary

The GSD Dashboard achieves a compelling visual identity ("Bloomberg Terminal meets The New Yorker") but suffers from significant UX implementation gaps that undermine its usability as a production tool. **The core problem: it's UI theatre, not a working dashboard.** Navigation works for mouse users but is broken for keyboard users; only 1 of 8 pages has actual loading states; responsive behavior uses a single breakpoint; and accessibility fundamentals (headings, focus indicators, ARIA) are entirely absent.

**UX Maturity Score: 45/100** — Visually polished, functionally hollow.

| Dimension | Score | Key Issues |
|---|---|---|
| Information Architecture | 55/100 | No heading hierarchy, no landmark regions |
| Interaction Design | 50/100 | Visual-only interactions, mock data throughout |
| Responsive Behavior | 35/100 | Single breakpoint, undersized touch targets |
| Accessibility | 25/100 | Keyboard nav broken, no focus, no ARIA |
| Loading States | 30/100 | Only Agent Console has loading/error states |
| Micro-interactions | 65/100 | Good hover/transitions but no focus states |

---

## 1. Information Architecture

### 1.1 What Works ✅
- 8 pages are logically organized: Overview → Work → System
- Sidebar nav uses clear groupings with mono labels
- Progressive disclosure: Command Center → detailed pages
- Widget cards with headers and consistent padding structure
- `inert` attribute properly applied to inactive pages (with `aria-hidden` + `tabindex="-1"`)

### 1.2 What's Broken ❌
#### 🔴 Critical: No heading hierarchy
- Page titles (`Command Center`, `Todo List`, etc.) are `<div class="page-hdr-title">` — should be `<h1>`
- Widget headers (`Urgent Actions`, `Active Agents`, etc.) are `<span class="widget-hdr-title">` — should be `<h2>`
- Doc viewer `<h2>` elements appear inside `.doc-body` but are visual only, not part of page outline
- No `<h1>` through `<h6>` anywhere in the document — screen readers have zero heading structure
- **Impact**: Screen reader users cannot navigate pages by heading; page outline is flat

#### 🟡 High: No landmark regions
- No `<main>` element — `.pages-container` is a `<div>`
- No `<aside>`, `<section>` with `aria-label`
- Sidebar `<nav>` lacks `aria-label="Main Navigation"`
- Mobile nav `<nav>` lacks `aria-label="Mobile Navigation"`
- Search modal has no `role="dialog"` or `aria-modal`
- **Impact**: Assistive tech users cannot quickly jump to content regions

#### 🟡 High: Content organization gaps
- "Today's Timeline" and "Active Agents" both in right column of 2-column grid — logical grouping but no visual separator for screen readers
- Deadline warning indicators at bottom of Calendar page use inline styles with no semantic structure
- Project Health dashboard uses inline grid with inline styles — no CSS classes, no responsive breakpoints

---

## 2. Interaction Design

### 2.1 What Works ✅
- **Page navigation**: `goPage()` function properly activates/deactivates pages with `inert` + `aria-hidden`
- **Gantt/Kanban toggle**: `toggleTodoView()` shows/hides views correctly
- **Urgent item click-to-complete**: Toggles `.completed` class with strikethrough, updates badge count
- **Dark mode toggle**: Works via `theme-deep` class on `<body>`, persisted visually
- **Add Task**: Creates kanban items with safe DOM construction (`textContent`, not `innerHTML`)
- **Note filter**: Filters notes by title in real-time
- **Keyboard shortcuts**: Cmd+K (search), Ctrl+1-8 (page nav), Escape (close search)
- **Clock**: Updates every 30s with proper formatting
- **simulateRefresh()**: Provides button feedback (text + disabled state)
- **Comm channel**: Send button with Enter key support, loading/disabled state, success/failure feedback

### 2.2 What's Broken ❌
#### 🔴 Critical: Sidebar nav not keyboard-accessible
- All nav items use `<a>` tags **without `href`** — per HTML spec, `<a>` without `href` is a placeholder link and **cannot receive keyboard focus**
- Keyboard users cannot Tab through the sidebar navigation
- The only way to navigate pages via keyboard is Ctrl+1-8 shortcuts (which require remembering key mappings)
- **Fix**: Add `tabindex="0"` and `role="button"` to `<a>` nav items, or better, use `<button>` elements

#### 🔴 Critical: All data is mock — zero functional interactions
- Kanban drag: `draggable="true"` with dragstart/dragend visual feedback, but **no drop handlers** on columns — items cannot actually be moved
- Note editor toolbar: 8 buttons with hover states, but **zero functional editing** — no `contenteditable`, no `execCommand`, no markdown processing
- Search modal: Opens with Cmd+K, focus goes to input, but **all 5 results are hardcoded** — typing does nothing
- Task detail panel: Permanently `display:none` — click on kanban items does nothing
- Gantt view: Static positioned bars — no drag, no zoom, no reschedule
- Calendar Month/Week toggle: Visual only — no actual view switching
- Calendar nav (`‹` / `›`): Buttons exist but do nothing
- Settings toggle switches: Visual only — no state persistence, no ACMI write-back
- Export buttons: No actual JSON or PDF generation
- Dark mode: Toggles class but does not persist preference across sessions

#### 🟡 High: Missing keyboard shortcuts
- `Cmd+N` (new note) — not wired
- `Cmd+T` (new task) — not wired
- `/` (focus search) — not wired
- Missing shortcut reference/cheatsheet UI

#### 🟡 High: No undo/confirmation on destructive actions
- Urgent item completion: Single click toggles strikethrough — no undo, no confirmation
- Add task: No validation, no duplicate detection
- Auto-save: Simulated visual only — no actual persistence, no recovery on page reload

---

## 3. Responsive Behavior

### 3.1 Breakpoint Analysis

| Viewport | Expected State | Actual State | Verdict |
|---|---|---|---|
| **1440px+** | Full layout with max-width: 1280px constraint, 4-col grids | Full-width layout, no max-width, 2/3-col grids | ❌ Missing max-width constraint, no 4-col |
| **1024px** | Fine-tuned tablet with adjusted grids | Falls through to full desktop layout | ❌ No 1024px breakpoint |
| **768px** | Tablet: 2-col grids, slide panels, adjusted KPI | Falls through to 900px breakpoint (too early) | ❌ Wrong breakpoint, no 768px handling |
| **360px** | Mobile: single column, full mobile nav | Falls through to 900px breakpoint, but KPI goes to 3-col (should be 2-col at 360px) | ❌ No 360px handling |

### 3.2 What Works ✅
- CSS Grid app shell (`var(--nav-w) 1fr` / `var(--header-h) 1fr`) — solid foundation
- Mobile nav appears at ≤900px with icon + label buttons
- KPI strip reduces from 6-col to 3-col on mobile
- All multi-column layouts collapse to single column
- `overflow-y: auto` on pages prevents layout breakage
- `auto-fill, minmax()` grids adapt to available space

### 3.3 What's Broken ❌
#### 🔴 Critical: Single breakpoint (900px) is insufficient
- **No `≥1280px` breakpoint**: Brief explicitly specifies `max-width: 1280px` with 4-col grids — not implemented
- **No `1024px` breakpoint**: Below 1280px but above 900px, layout should adjust gracefully — currently stuck in full desktop mode
- **No `768px` breakpoint**: Below 900px but above mobile, important tablet form factor — falls through to mobile layout
- **No `360px` breakpoint**: Small phones get 3-column KPI strip that wraps poorly

#### 🔴 Critical: No max-width constraint
- `.page` has `padding: 20px calc(50% - 640px)` which creates a max-width of 1280px + 40px padding = 1320px effective
- Wait — `calc(50% - 640px)` actually means: on a 1920px screen, padding = (960 - 640) = 320px each side, content = 1280px. This IS the 1280px max-width! ✅
- **BUT** at ≤900px, this becomes `padding: 20px` — content goes full width with no max-width constraint

#### 🟡 High: Undersized touch targets
- `.mob-item`: `min-width: 40px`, font-size: 8px — **below 44px WCAG AA minimum**
- `.nav-item`: `padding: 6px 8px` with 12px font — total height ~24px, **well below 44px**
- `.btn`: `padding: 6px 14px` — total height ~29px, **below 44px**
- `.btn-sm`: `padding: 3px 8px` — total height ~23px, **well below 44px**
- `.btn-icon`: `width: 30px; height: 30px` — **well below 44px**

#### 🟡 High: Missing responsive features
- No hamburger menu for sidebar at tablet widths — sidebar just disappears at 900px
- No slide-in panel pattern for task detail / agent detail at mobile widths
- Search bar hidden at ≤900px (`.header-center { display: none }`) — but mobile users need search too
- Calendar grid cells (`min-height: 80px`) may be too small on 360px screens for 7-column grid

---

## 4. Accessibility

### 4.1 Keyboard Navigation 🔴
| Component | Keyboard Accessible? | Details |
|---|---|---|
| Sidebar nav | ❌ **BROKEN** | `<a>` without `href` cannot receive focus |
| Page content (scroll) | ⚠️ Partial | Pages have `overflow-y: auto` but no `tabindex="0"` for keyboard scroll |
| Buttons | ✅ | All `<button>` elements are focusable |
| Search modal | ⚠️ Partial | Opens, gets focus, but no focus trap — Tab can escape modal |
| Kanban items | ⚠️ Partial | `draggable="true"` but no keyboard drag support |
| Toggle switches | ❌ | `<div>` elements with click handler — no keyboard activation |
| View toggles (Kanban/Gantt) | ❌ | `<span>` elements — not focusable |
| Calendar nav buttons | ✅ | `<button>` elements |
| Mobile nav | ✅ | `<button>` elements — focusable |

### 4.2 Focus Indicators 🔴
- **No `:focus-visible` styles anywhere** — zero instances
- Only `:focus` styles exist on 3 input elements (search bar, task input, comm textarea) — and these only change border color (insufficient contrast for some themes)
- Interactive elements (buttons, nav items, toggles) have **no visible focus state at all**
- **Impact**: Keyboard users cannot see which element is focused — severe WCAG 2.4.7 failure

### 4.3 Screen Reader Support 🔴
| Requirement | Status | Details |
|---|---|---|
| Heading hierarchy | ❌ Absent | No `<h1>`-`<h6>` in entire document |
| Landmark regions | ❌ Absent | No `<main>`, no `<aside>`, navs lack labels |
| ARIA labels | ❌ Absent | Zero `aria-label` attributes in document |
| Dynamic content announcements | ❌ Absent | No `aria-live` regions for refresh, auto-save, errors |
| Skip navigation link | ❌ Absent | No way to skip sidebar to main content |
| Color contrast | ⚠️ Marginal | `ink-5 (#9a9a96)` on `paper (#faf9f5)` = ~2.9:1 (fails AA for small text) |
| `prefers-reduced-motion` | ❌ Absent | No media query — animations play regardless |
| Search modal semantics | ❌ Absent | No `role="dialog"`, `aria-modal`, or `aria-labelledby` |
| Toggle switch semantics | ❌ Absent | No `role="switch"` or `aria-checked` |
| Active page indication | ✅ Good | `.page.active` + `aria-hidden="false"` + `inert` removed |

### 4.4 Color & Contrast 🟡
- KPI label text: 8px mono at `ink-4 (#7a7a76)` on `paper-elev (#f4f2eb)` — approximately 3.8:1 (fails AA for its size — text below 14px bold / 18px regular needs 4.5:1)
- `.cal-day .event`: 8px text on colored backgrounds — illegible at small sizes
- `.doc-type`: 7px mono on `paper-elev` — extremely difficult to read
- Status dot indicators: 5px circles — too small for color-only meaning (no text labels for colorblind users)

### 4.5 Interaction Model 🟡
- All touch targets on mobile are below 44px minimum (see §3.3)
- Urgent items have `cursor: pointer` but no `role="button"` — screen readers see them as generic containers
- Kanban items have `cursor: grab` but no keyboard drag support
- The `inert` polyfill is not loaded — only Chrome 102+ supports it natively

---

## 5. Loading States

### 5.1 Current State by Page

| Page | Loading State | Empty State | Error State | Data State |
|---|---|---|---|---|
| Command Center | ❌ Mock data shown immediately | ❌ Not implemented | ❌ Not implemented | ✅ Mock data |
| Todo List | ❌ Mock data shown immediately | ❌ Not implemented | ❌ Not implemented | ✅ Mock data |
| Notes | ❌ Mock data shown immediately | ❌ Not implemented | ❌ Not implemented | ✅ Mock data |
| Project Tracker | ❌ Mock data shown immediately | ❌ Not implemented | ❌ Not implemented | ✅ Mock data |
| Calendar | ❌ Mock data shown immediately | ❌ Not implemented | ❌ Not implemented | ✅ Mock data |
| Docs | ❌ Mock data shown immediately | ❌ Not implemented | ❌ Not implemented | ✅ Mock data |
| **Agent Console** | ✅ **IMPLEMENTED** (pulse skeleton + loading msg) | ✅ **IMPLEMENTED** ("No Agents Found") | ✅ **IMPLEMENTED** (error + retry button) | ✅ Live ACMI |
| Settings | ❌ Mock data shown immediately | ❌ Not implemented | ❌ Not implemented | ✅ Mock data |

### 5.2 What Works ✅
- CSS `.state-placeholder.loading` with pulse animation is well-designed
- Agent Console has proper loading/error/empty/data state machine
- `renderAgentGrid()` shows loading skeleton, fetches data, handles errors with retry
- `selectAgent()` shows loading state, handles errors gracefully
- `_showACMIError()` shows meaningful error messages with retry CTA
- Empty state for no agents found

### 5.3 What's Broken ❌
#### 🔴 Critical: 7 of 8 pages have zero loading states
- CSS for `.state-placeholder.loading` exists but is never used outside Agent Console
- CSS for `.state-placeholder` exists but never used for empty states
- No error state CSS defined for non-ACMI pages
- When ACMI data isn't available, mock data stays forever (no "data unavailable" indicator)

#### 🟡 High: No data refresh indicator
- The simulated "↻ Refreshing…" button feedback is cosmetic
- No visual indicator that data is being fetched (beyond button text change)
- No "last updated" timestamp on any page
- No polling interval hooks for real data sources

---

## 6. Micro-interactions

### 6.1 What Works ✅
- **Hover states**: All interactive elements (buttons, nav items, cards, todo items) have hover transitions
- **Transition timing**: Uses `--d-fast: 150ms` and `--d-norm: 280ms` with consistent `--ease` cubic-bezier
- **Toggle switch animation**: Smooth knob translation with `--d-fast`
- **Search modal**: Opens with overlay backdrop, closes on backdrop click or Escape
- **Dark mode toggle**: Smooth transition via CSS variables
- **simulateRefresh()**: Multi-step feedback (text → "Refreshing…" → "Done" → original)
- **Auto-save simulation**: Shows "auto-saving…" → "auto-saved" → "last edited just now"
- **Drag opacity**: Kanban items get 0.5 opacity during drag

### 6.2 What's Broken ❌
#### 🟡 High: No focus interaction states
- No `:focus-visible` styles on any interactive element
- `:active` states not defined for buttons — no press feedback
- Toggle switches have no active/down state

#### 🟡 Medium: Missing micro-interactions
- No loading skeleton entrance animation (fade in)
- No completion animation on urgent items (just instant strikethrough)
- No page transition animation between pages (instant swap)
- No ripple or click feedback on buttons
- No toast/notification system for actions (task added, saved, etc.)
- No drag ghost/preview for kanban items (uses default browser drag image)
- No sort/filter animation on notes list

---

## 7. Code Quality & Maintainability

### 7.1 CSS
- ~1400 lines of CSS with good organization (tokens → base → components → pages)
- But many inline styles still present (see Bentley's audit: ~25+ instances)
- `.page` padding `calc(50% - 640px)` is a clever max-width trick but brittle
- No CSS custom properties for breakpoints (hardcoded `900px`)

### 7.2 JavaScript
- ~680 lines, reasonably organized with navigation → features → ACMI integration
- `_esc()` sanitization function prevents XSS ✅
- `addTask()` uses proper DOM construction (no `innerHTML`) ✅
- `selectAgent()` still uses `innerHTML` for agent detail panel ❌ (noted by Bentley)
- Event listeners wired in `DOMContentLoaded` with no cleanup — potential memory leaks
- No error boundary — one JS error can break the entire dashboard

---

## 8. Concrete UX Bugs (With Fixes Applied)

The following bugs have been fixed directly in `gsd-dashboard.html`:

| # | Bug | Severity | Fix Applied |
|---|---|---|---|
| 1 | Sidebar nav `<a>` tags lack `href` — not keyboard-focusable | 🔴 Critical | Added `tabindex="0"` + `role="button"` + keyboard Enter handler |
| 2 | No `:focus-visible` styles on any interactive element | 🔴 Critical | Added `:focus-visible` outline on buttons, nav items, inputs, toggles |
| 3 | No `prefers-reduced-motion` media query | 🔴 Critical | Added `@media (prefers-reduced-motion)` disabling animations |
| 4 | Search modal lacks ARIA dialog semantics | 🔴 Critical | Added `role="dialog"`, `aria-modal="true"`, `aria-label` |
| 5 | No `role="switch"` or `aria-checked` on toggle switches | 🟡 High | Added `role="switch"` + `aria-checked` + keyboard toggle |
| 6 | Mobile nav items have `min-width: 40px` (below 44px AA) | 🟡 High | Increased to `min-width: 48px; min-height: 44px` |
| 7 | No `aria-live` regions for dynamic content | 🟡 High | Added `aria-live="polite"` to timeline, agent grid, KPI strip |
| 8 | Sidebar nav and mobile nav lack `aria-label` | 🟡 High | Added `aria-label="Main Navigation"` and `aria-label="Mobile Navigation"` |
| 9 | View toggle (Kanban/Gantt) spans not keyboard-accessible | 🟡 High | Added `tabindex="0"` + `role="tab"` + keyboard Enter/Space handler |
| 10 | No keyboard scroll on overflow containers | 🟡 Medium | Added `tabindex="0"` to scrollable `.pages-container` and `.app-nav` |

---

## 9. Recommendations by Priority

### P0 — Must Fix
1. **Fix sidebar nav keyboard accessibility** ✅ Applied — all `<a>` nav items now have `tabindex="0"`, `role="button"`, and keyboard handlers
2. **Add `:focus-visible` styles** ✅ Applied — consistent focus ring using `--forest` color
3. **Add `prefers-reduced-motion`** ✅ Applied — disables all animations when user prefers reduced motion
4. **Add proper heading hierarchy** — Convert `.page-hdr-title` → `<h1>`, `.widget-hdr-title` → `<h2>`. This requires HTML structural changes.
5. **Implement loading/empty/error states for all 7 remaining pages** — Use the existing CSS classes that are already defined

### P1 — Should Fix
6. **Add ARIA dialog semantics to search modal** ✅ Applied
7. **Fix toggle switch ARIA** ✅ Applied
8. **Fix mobile nav touch targets** ✅ Applied (44px+)
9. **Add `aria-live` regions** ✅ Applied
10. **Add responsive breakpoints at 360px, 768px, 1024px, 1440px** — Currently only 900px
11. **Implement functional note editor** — Replace textarea with `contenteditable` or proper markdown editor
12. **Implement kanban drop handling** — Add `dragover`/`drop` event listeners

### P2 — Nice to Have
13. **Add page transition animation** — Smooth opacity/transform transition between pages
14. **Add toast notification system** — For task added, note saved, refresh complete
15. **Add `/` keyboard shortcut for search focus**
16. **Add Cmd+N / Cmd+T shortcuts**
17. **Persist dark mode preference** in `localStorage`
18. **Add skip navigation link** at top of page
19. **Add `role="table"`/`role="grid"` to calendar**

---

## 10. Final Score

| Dimension | Score | Assessment |
|---|---|---|
| Information Architecture | 55/100 | Good grouping, no heading hierarchy |
| Interaction Design | 50/100 | Navigation works, but all data is mock |
| Responsive Behavior | 35/100 | Single breakpoint, no tablet optimization |
| Accessibility | 25/100 | Keyboard nav broken, no focus, no ARIA |
| Loading States | 30/100 | Only Agent Console has proper states |
| Micro-interactions | 65/100 | Good hover/transitions, no focus states |
| **Overall UX** | **43/100** | **Not production-ready** |

### Progress Since Bentley's Design Fidelity Audit
Bentley found 10 definite breaches and scored 82/100 on visual fidelity. This UX audit finds that beneath the polished surface, the dashboard is functionally incomplete. The 10 applied fixes address the most critical UX barriers, but 7 of 8 pages remain mock-data-only and full accessibility remediation requires structural HTML changes beyond the scope of targeted patches.

**Estimated effort to production-ready UX: 1-2 weeks (building on existing design system).**
