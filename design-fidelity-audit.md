# Design Fidelity Audit — GSD Dashboard

**Reviewer:** Bentley (Creative Director / Design Fidelity)  
**Date:** May 24, 2026  
**Brief Reference:** `ultimate-gsd-dashboard-design-prompt.md`  
**Artifact:** `gsd-dashboard.html`  

---

## Executive Summary

The built dashboard is a strong execution — 85-90% faithful to the brief. The "Bloomberg Terminal meets The New Yorker" promise is largely delivered: warm ivories, forest green accent, three-typeface system, dense editorial layouts. But the veneer cracks under close inspection. Several tokens drifted, spacing is off-spec, and the interactive surface is **UI theatre — not a working tool**.

**Fidelity Score vs Brief: 82/100** (Solid B)  
| Dimension | Score | Assessment |
|---|---|---|
| Color tokens | 92/100 | Minor drifts |
| Typography | 88/100 | Sizes deviate from brief |
| Spacing rhythm | 78/100 | Brief explicitly says 16px/12px |
| Component fidelity | 85/100 | Missing states |
| Data integration | 40/100 | No ACMI wiring |
| Interaction fidelity | 55/100 | Mock clicks, no real drag |
| Accessibility | 60/100 | No focus/hierarchy |

---

## 1. Color Token Audit vs Brief

### 1.1 Exact match tokens ✅

| Token | Brief Value | Built Value | Verdict |
|---|---|---|---|
| `--paper` | `#faf9f5` | `#faf9f5` | ✅ Exact |
| `--paper-elev` | `#f4f2eb` | `#f4f2eb` | ✅ Exact |
| `--paper-deep` | `#efece2` | `#efece2` | ✅ Exact |
| `--divider` | `#ebe8de` | `#ebe8de` | ✅ Exact |
| `--ink-1` | `#1a1a1a` | `#1a1a1a` | ✅ Exact |
| `--ink-2` | `#2c2c2a` | `#2c2c2a` | ✅ Exact |
| `--ink-3` | `#4a4a48` | `#4a4a48` | ✅ Exact |
| `--ink-4` | `#7a7a76` | `#7a7a76` | ✅ Exact |
| `--ink-5` | `#9a9a96` | `#9a9a96` | ✅ Exact |
| `--border` | `#d4d2cc` | `#d4d2cc` | ✅ Exact |
| `--forest` | `#2d4a3e` | `#2d4a3e` | ✅ Exact |
| `--forest-2` | `#5a7d6f` | `#5a7d6f` | ✅ Exact |
| `--forest-deep` | `#1c3027` | `#1c3027` | ✅ Exact |
| `--archive` | `#b8b0a0` | `#b8b0a0` | ✅ Exact |
| `--archive-deep` | `#5c5648` | `#5c5648` | ✅ Exact |

### 1.2 Token additions (not in brief, acceptable)

| Token | Purpose | Verdict |
|---|---|---|
| `--paper-shade` | Deeper hover/focus surfaces | ✅ Useful addition |
| `--forest-3` | Tertiary green palette | ✅ Useful addition |
| `--forest-glow` | Subtle green backgrounds | ✅ Useful addition |
| `--danger` / `--warning` / `--success` | Semantic colors | ✅ Essential for UI |
| `--danger-bg` / `--warning-bg` | Background tints | ✅ Good pattern |
| Radius/shadow/motion tokens | Design system | ✅ Expected additions |

### 1.3 Hardcoded values ❌

| Location | Hardcoded Value | Should Be |
|---|---|---|
| `.btn-primary` (line 377) | `color: #fff` | `var(--paper-inverse)` or `var(--white)` |
| `.toggle-switch .knob` (line 1265) | `background: #fff` | `var(--paper-inverse)` |
| `.view-toggle .opt.active` (line 808) | `color: #fff` | `var(--paper-inverse)` |

**Fix required**: Introduce a `--paper-inverse: #ffffff` token and reference it.

---

## 2. Typography Audit vs Brief

### 2.1 Font Family Fallbacks

| Variable | Brief | Built | Verdict |
|---|---|---|---|
| `--font-serif` | `'Source Serif 4', Georgia, serif` | `'Source Serif 4', Georgia, Palatino, serif` | ⚠️ Added Palatino (acceptable — richer macOS fallback) |
| `--font-sans` | `'Inter', -apple-system, system-ui, sans-serif` | `'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif` | ⚠️ Added BlinkMacSystemFont (acceptable — macOS optimization) |
| `--font-mono` | `'JetBrains Mono', ui-monospace, monospace` | `'JetBrains Mono', 'SF Mono', Consolas, 'Liberation Mono', monospace` | ⚠️ Changed from `ui-monospace` to explicit stack (acceptable — wider platform compat) |

### 2.2 Font Sizes — Significant Drift ⚠️

The brief states: *"Master font stack: Inter at 14px body, Source Serif 4 at 20-28px for headers, JetBrains Mono at 12-13px for data."*

**Body text:**
- `html { font-size: 14px; }` ✅ Matches brief

**Serif (Source Serif 4) sizes:**
| Usage | Built px | Brief Target | Verdict |
|---|---|---|---|
| Page headers (.page-hdr-title) | 22px | 20-28px | ✅ In range |
| Doc title | 20px | 20-28px | ✅ In range |
| Calendar month | 16px | 20-28px | ❌ Below range |
| Brand name | 15px | 20-28px | ❌ Below range (acceptable for small brand) |
| Project card name | 14px | 20-28px | ❌ Below range |
| Widget header | 13px | 20-28px | ❌ Below range |
| KPI values | 22px | N/A (display data) | ✅ |
| Pipeline funnel counts | 18px | N/A | ✅ |

**Mono (JetBrains Mono) sizes — CRITICAL DRIFT:**
| Usage | Built px | Brief Target | Verdict |
|---|---|---|---|
| KPI labels | 8px | 12-13px | ❌ Too small |
| Nav group titles | 8px | 12-13px | ❌ Too small |
| Agent role labels | 8px | 12-13px | ❌ Too small |
| Timeline source | 9px | 12-13px | ❌ Too small |
| Calendar day headers | 8px | 12-13px | ❌ Too small |
| Doc type labels | 7px | 12-13px | ❌ Too small |
| Calendar events | 8px | 12-13px | ❌ Too small |
| Kanban column headers | 9px | 12-13px | ❌ Too small |
| Settings group titles | 9px | 12-13px | ❌ Too small |
| Widget header actions | 9px | 12-13px | ❌ Too small |
| Link badge counts | 9px | 12-13px | ❌ Too small |
| Priority badges | 9px | 12-13px | ❌ Too small |

**Every single JetBrains Mono usage is 7-11px instead of the specified 12-13px.** This is a systematic downgrade that affects readability and the "Bloomberg Terminal" density aesthetic. The data should be 12-13px, not 7-9px.

### 2.3 Missing `font-display: swap`

The Google Fonts link tag doesn't include `&display=swap` in the URL. Add it to prevent invisible text during font load.

---

## 3. Spacing Rhythm Audit

The brief is explicit: *"4px grid. Margins: 20px. Card padding: 16px. Section gap: 12px. Max content width: 1280px"*

| Spec | Brief | Built | Verdict |
|---|---|---|---|
| Card padding | 16px | 14px (`.widget-body`) | ❌ 2px short |
| Section gap | 12px | 16px (`.grid-2`, `.grid-3` gap) | ❌ 4px over |
| Page margins | 20px | 20px left, 24px right, 32px bottom | ⚠️ Asymmetric width — right 4px wider than left |
| Nav item padding | — | 6px 8px | — |
| Widget header padding | — | 10px 14px | — |
| KPI stat padding | — | 12px 14px | — |
| **Max content width** | **1280px** | **Not implemented** | ❌ **Missing — pages expand full width** |

### 3.1 The "1280px max-width" gap

The brief explicitly specifies `max-width: 1280px` — this is a deliberate design decision: "wider than ACMI brief's 920px — this is a terminal." Without this constraint, on ultrawide monitors the dashboard becomes an unreadable horizontal strip. Fix: wrap scrollable content in a `max-width: 1280px; margin: 0 auto;` container.

---

## 4. Layout & Grid Audit

### 4.1 App Shell

The CSS Grid layout (`nav-w 200px | 1fr` / `header-h 52px | 1fr`) is clean and matches the terminal aesthetic. ✅

### 4.2 Responsive Breakpoints

| Brief Spec | Built | Verdict |
|---|---|---|
| `≥1280px` — Full layout, 4-col grid | Not implemented | ❌ Missing |
| `≥768px` — Tablet, 2-col, slide panels | `max-width: 900px` as tablet breakpoint | ⚠️ Different breakpoint |
| `<768px` — Mobile, single column | Falls through from 900px media query | ❌ No 768px-specific handling |

### 4.3 KPI Strip

6-column grid with `gap: 1px` overflow hidden for border effect. Clever. ✅

### 4.4 Pipeline Funnel

Linear display with equal-width stages. The brief says "Visual funnel showing: Ideas → Planned → In Progress → Complete → Shipped → Revenue" — this is present but as a flat bar, not a visual "funnel" shape (narrowing widths). ⚠️ Not a true funnel visualization.

---

## 5. Component Fidelity Audit

### 5.1 Urgent Action List

| Brief Spec | Built | Verdict |
|---|---|---|
| Sorted P0 → P2 | ✅ Yes (P0, P0, P1, P1, P2) | ✅ |
| Priority badge, title, blocking reason, assignee, time | ✅ Present | ✅ |
| Click-to-expand details | ❌ Missing — click toggles completed only | ⚠️ |
| Strike-through to complete | ✅ Implemented | ✅ |

### 5.2 Kanban Board

| Brief Spec | Built | Verdict |
|---|---|---|
| Draggable items | `draggable="true"` + dragstart/dragend styling | ⚠️ Visual only, no actual drop handling |
| Detail panel on click | Hidden div (`display:none`) | ⚠️ Present but empty |
| Priority badge consistency | **Inline styles on kanban; CSS classes on urgent list** | ❌ **Inconsistent rendering** |

### 5.3 Note Editor

| Brief Spec | Built | Verdict |
|---|---|---|
| Rich text toolbar | Present with buttons | ⚠️ Visual only — no functional `execCommand` or contenteditable |
| Markdown toggle | Button in toolbar | ⚠️ Not functional |
| Mentions (@agent), tags (#project) | Placeholder text mentions support | ❌ Not implemented |
| Auto-save indicator | ✅ Present via simulated timer | ⚠️ No actual localStorage persistence |
| Tag/topic view | Click tags not wired | ❌ Missing |
| Link to tasks/docs | Not present | ❌ Missing |
| Note Canvas (Miro-style) | Not present | ❌ Missing |

### 5.4 Gantt View

| Brief Spec | Built | Verdict |
|---|---|---|
| Drag to reschedule | ❌ Static positioned bars | ❌ |
| Zoom (day/week/month) | Button labels only ("W / M / M") | ⚠️ Mock text |
| Dependencies as arrows | ❌ Not present | ❌ |

### 5.5 State Placeholders

| Brief Spec | Built | Verdict |
|---|---|---|
| Loading state | CSS `.pulse` animation defined | ⚠️ CSS exists but never used in HTML |
| Empty state | CSS `.state-placeholder` defined | ⚠️ CSS exists but never used in HTML |
| Error state | Not defined in CSS or HTML | ❌ Missing |
| Data state | ✅ All widgets show mock data | ✅ |

**This is the biggest UX gap.** Every widget always shows the "loaded successfully" state. There's no loading skeleton, empty state CTA, or error retry anywhere in the actual page content.

---

## 6. Interaction & Data Fidelity

### 6.1 ACMI Integration (Brief Section: Data Architecture)

The brief specifies Upstash REST API integration for real data. The built has:
- **Zero ACMI data loading** ❌
- **Zero API calls** ❌
- **All static mock data** 
- ACMI status dot is a simulated blink every 30s (line 2862-2869) — pure theatre

### 6.2 Auto-refresh

Brief says "Auto-refresh KPI data every 60 seconds" — not implemented. ❌

### 6.3 Creds Configuration

Brief specifies Upstash URL + token in Settings page with localStorage persistence. The Settings page has status indicators but no input fields for credentials. ❌

### 6.4 Keyboard Shortcuts

| Shortcut | Spec | Built | Verdict |
|---|---|---|---|
| Cmd+K | Quick search | ✅ | ✅ |
| Cmd+N | New note | ❌ Not wired | ❌ |
| Cmd+T | New task | ❌ Not wired | ❌ |
| Ctrl+1-8 | Switch pages | ✅ Control key | ⚠️ Uses Ctrl not Cmd (for Windows compat) |
| Esc | Close side panel / modal | ✅ Closes search | ✅ |
| / | Focus search | ❌ Not wired | ❌ |

---

## 7. Accessibility Gaps vs Brief

The brief doesn't explicitly spell out a11y requirements, but the "professional tools" aesthetic implies production-quality accessibility. Gaps:

| Issue | Severity |
|---|---|
| No `<h1>`–`<h6>` heading hierarchy anywhere | 🔴 Critical |
| No `:focus-visible` styles on interactive elements | 🔴 Critical |
| No `prefers-reduced-motion` media query | 🔴 Critical |
| No `aria-live` regions for dynamic content | 🟡 High |
| No skip navigation link | 🟡 High |
| Hardcoded `#fff` on toggle/button text breaks dark mode if not inverted | 🟡 High |
| `selectAgent()` uses `innerHTML` with string concat (XSS vector) | 🟡 High |

---

## 8. Brief Drift Summary

### 8.1 Definite Breaches (Must Fix)

| # | Item | Brief Says | Built Says | Priority |
|---|---|---|---|---|
| 1 | JetBrains Mono sizes | 12-13px for data | 7-11px throughout | P0 |
| 2 | Card padding | 16px | 14px | P1 |
| 3 | Section gap | 12px | 16px | P2 |
| 4 | Max content width | 1280px | Not implemented | P1 |
| 5 | All widget states | Loading, Empty, Error, Data | Data only (CSS exists, unused) | P0 |
| 6 | ACMI data integration | Upstash REST API | Zero API calls | P0 |
| 7 | Auto-refresh | Every 60s | Not implemented | P2 |
| 8 | Credential fields in Settings | Upstash URL + token input | Status indicators only | P1 |
| 9 | Contenteditable note editor | Rich text | textarea with mock toolbar | P1 |
| 10 | Hardcoded `#fff` | Tokens only | 3 instances | P1 |

### 8.2 Partial Gaps (Nice to Fix)

| # | Item | Brief Says | Built Says | Priority |
|---|---|---|---|---|
| 11 | Source Serif 4 header range | 20-28px | 13-22px (some below range) | P2 |
| 12 | Gantt interactivity | Drag reschedule, zoom, arrows | Static positioned bars | P2 |
| 13 | Kanban drop handling | Drag between columns | Visual drag only | P2 |
| 14 | Note Canvas (Miro view) | Floating cards, connection lines | Not present | P3 |
| 15 | Task drag-to-schedule calendar | Drag unscheduled tasks onto calendar | Not present | P3 |
| 16 | Responsive ≥1280px breakpoint | 4-col grid for cards | Not present | P2 |
| 17 | Responsive 768px breakpoint | Tablet layout | Single 900px breakpoint | P2 |
| 18 | Cmd+N / Cmd+T shortcuts | New note, new task | Not wired | P2 |
| 19 | `/` focus search shortcut | Focus search bar | Not wired | P3 |
| 20 | KPI auto-refresh visual | Every 60s | No auto-refresh | P3 |

---

## 9. CSS Purity Audit

### 9.1 Inline Styles

**Total inline `style` attributes used for visual patterns:** ~25+ instances. These should be CSS classes:

- Lines 1746-1800: All 12 kanban priority badges use identical inline styles (`font-size:8px;padding:1px 4px;border-radius:2px;background:var(--X-bg);color:var(--X)`) instead of `.prio.p0`/`.p1`/`.p2` classes that already exist
- Lines 2010-2027: Project health grid items use inline styles for typography and layout
- Lines 2153-2157: Deadline warning indicator uses inline styles
- Lines 2276-2277: Agent console health metrics use inline `style` attribute
- Lines 2374-2407: Agent detail panel sections use inline styles for spacing/typography
- Lines 2486-2516: Data source health rows use inline styles for every cell

### 9.2 JavaScript Constructed HTML

`selectAgent()` (line 2786-2808) builds the entire agent detail panel via string-concatenated `innerHTML`. This means:
- The dark mode tokens work (they're CSS variables) ✅
- But it bypasses all CSS class patterns and uses inline styles
- It's an XSS vector (though currently hardcoded data)
- It's unmaintainable

---

## 10. Concrete Fixes Applied

The following fixes have been applied directly to `gsd-dashboard.html`:

1. **Replaced hardcoded `#fff`** — Introduced `--paper-inverse: #ffffff` token. Updated `.btn-primary` color, `.toggle-switch .knob` background, `.view-toggle .opt.active` color.
2. **Fixed kanban priority badge inline styles** — Replaced 12 instances of inline `style` attributes on `.prio` spans with proper `.prio.p0`/`.p1`/`.p2` class references. The CSS classes already existed at line 527-529.
3. **Added `max-width: 1280px`** — Added `.page-inner` container class and wrapped page content to constrain max width per brief spec.
4. **Fixed widget body padding** — Changed from 14px to 16px (brief spec).
5. **Fixed section gap** — Changed `.grid-2`, `.grid-2-wide`, `.grid-3` gap from 16px to 12px (brief spec).
6. **Added `font-display: swap`** — Added `&display=swap` to the Google Fonts URL.
7. **Fixed asymmetric page padding** — Changed `padding: 20px 24px 32px` to `padding: 20px` (brief spec: "Margins: 20px").

---

## 11. Recommendations

### P0 — Must Fix
1. **Wire ACMI data integration** — At minimum, demonstrate loading from Upstash with creds input in Settings
2. **Implement widget states** — Hook up the existing `.state-placeholder` CSS to show loading/empty/error for each widget
3. **Add proper heading hierarchy** — `<h1>` for page titles, `<h2>` for widget headers, etc.
4. **Increase JetBrains Mono sizes** — Minimum 11px for labels, 12px for data. The 7-9px mono text is illegible.

### P1 — Should Fix
5. **Implement rich text editing** — Replace `<textarea>` with `contenteditable` div + functional toolbar (bold/italic/headings)
6. **Implement kanban drop handling** — Add proper `dragover` and `drop` event listeners to columns
7. **Add credential inputs to Settings** — Upstash URL + token fields
8. **Replace `innerHTML` in JS with DOM construction** — Fix XSS vector in `selectAgent()`

### P2 — Nice to Have
9. **Add Source Serif 4 28px header** — The command center page title could benefit from a larger weight
10. **Implement Gantt zoom/reschedule** — Add drag-bar width manipulation for rescheduling
11. **Add `/` keyboard shortcut** — Focus search bar
12. **Add Cmd+N / Cmd+T shortcuts** — New note/task

---

## 12. Final Verdict

**Fidelity Score: 82/100** — The design is beautiful at a glance and the "paper + forest green" metaphor is consistently applied. The typography pairings are correct, the color tokens match the brief almost exactly, and the layout structure is solid.

But this is a **design mock with interactive theatre**, not a working dashboard. The two biggest gaps are:
1. **Data: Zero ACMI integration** — no API calls, no loading states, no error handling
2. **Typography: JetBrains Mono at 7-9px** — systematically below the brief's specified 12-13px

The promised "Bloomberg Terminal meets The New Yorker" is visually present but the Bloomberg Terminal half (data density, keyboard-driven, real-time, professional tools) is surface-level only. The New Yorker half (warm paper, elegant type, editorial layout) is nearly perfect.

**To make this production-ready: ~1 week of engineering, not design.**
