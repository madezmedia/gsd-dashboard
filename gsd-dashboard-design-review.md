# GSD Dashboard — Design System Review

**Reviewer:** Bentley (Design Systems / Product Review)  
**File:** `gsd-dashboard.html` (117 KB, 2839 lines, single-file SPA)  
**Date:** May 24, 2026

---

## Executive Summary

This single-file SPA implements a sophisticated "Bloomberg Terminal meets The New Yorker" dashboard with 8 pages. The design system is **remarkably coherent** for a single-file artifact. Tokenization is strong, component naming is consistent, and the typographic hierarchy follows the brief faithfully. However, several accessibility gaps and token-purity issues should be addressed before this goes to production.

**Fidelity Score: 87/100** (Strong B+)  
- Design tokens: 95/100  
- Component system: 88/100  
- Accessibility: 65/100  
- Responsiveness: 85/100  
- Dark mode: 92/100  

---

## 1. Design Tokens Audit

### 1.1 Color Palette — 🟢 EXCELLENT

| Token | Value | Status |
|---|---|---|
| `--paper` | `#faf9f5` | ✅ Matches brief ("warm ivory") |
| `--forest` | `#2d4a3e` | ✅ Matches brief |
| `--ink-1` through `--ink-5` | `#1a1a1a` → `#9a9a96` | ✅ 5-level charcoal scale |
| `--danger` / `--warning` / `--success` | Defined | ✅ Semantic palette |
| `--archive` / `--archive-deep` | `#b8b0a0` / `#5c5648` | ✅ Bonus archival tones |

The paper elevation stack (`paper → paper-elev → paper-deep → paper-shade`) is thoughtful — each step gets slightly darker/more saturated, supporting the tactile "paper" metaphor.

### 1.2 Typography — 🟢 EXCELLENT

| Font Family | CSS Variable | Use Case | Status |
|---|---|---|---|
| Source Serif 4 | `--font-serif` | Headlines, KPI values, project names | ✅ |
| Inter | `--font-sans` | UI text, buttons, body | ✅ |
| JetBrains Mono | `--font-mono` | Data, telemetry, labels, timestamps | ✅ |

**Observation:** Google Fonts URL includes `&display=swap` implicitly via the link tag, but there's no explicit `font-display: swap` fallback mention in the CSS. The font stacks include good system fallbacks.

### 1.3 Spacing & Radius Scale — 🟢 GOOD

```
--radius-sm: 3px, --radius-md: 4px, --radius-lg: 6px, --radius-xl: 10px
```

This is a logical Fibonacci-adjacent scale. The radii are restrained — consistent with a "professional tools" aesthetic rather than a consumer product.

### 1.4 Shadows — 🟢 GOOD

```
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04)
--shadow-md: 0 2px 8px rgba(0,0,0,0.06)
--shadow-lg: 0 8px 32px rgba(0,0,0,0.08)
```

Subtle, low-opacity shadows. Appropriate for the paper metaphor — these read as "elevation of paper" rather than "floating UI."

### 1.5 Motion — 🟢 GOOD

```
--ease: cubic-bezier(0.16,1,0.3,1)
--d-fast: 150ms, --d-norm: 280ms
```

The ease curve is an overshoot-free "quartz" ease-out. Good for a tools dashboard where motion should feel responsive but not playful.

### ⚠️ Token Issues

1. **Hardcoded `#fff` values** (2 instances):
   - `.btn-primary` uses `color: #fff;` instead of a token
   - `.toggle-switch .knob` uses `background: #fff;` instead of a token
   - `.view-toggle .opt.active` uses `color: #fff;` instead of a token

2. **`--success` is aliased to `--forest-2`** rather than being a distinct semantic color. Works fine visually but creates a coupling between semantic and accent palettes.

---

## 2. Component System Audit

### 2.1 App Shell & Layout — 🟢 EXCELLENT

The CSS Grid layout is clean:
```
grid-template-columns: var(--nav-w) 1fr
grid-template-rows: var(--header-h) 1fr
```

The header uses `grid-column: 1 / -1` to span full width. Page container uses absolute positioning for page transitions. This is well-structured.

### 2.2 Navigation — 🟢 EXCELLENT

Sidebar nav uses a consistent component pattern:
- `.nav-group` with `.nav-group-title`
- `.nav-item` with hover/active states
- Active state uses `border-left-color: var(--forest)` — a nice tactile "bookmark" detail
- `.nav-spacer` + `.nav-footer` for the dark mode toggle

Mobile nav bar replicates this as a bottom tab bar with `.mob-item` class. Consistent icon sizing (`14x14` SVG viewBox).

### 2.3 Widget Cards — 🟢 EXCELLENT

```
.widget → .widget-hdr (with .widget-hdr-title + .widget-hdr-action) → .widget-body
```

Consistent padding (10/14px header, 14px body). `.p-0` variant for body when content provides its own spacing. All cards share `border-radius: var(--radius-lg)` and `border: 1px solid var(--border)`.

### 2.4 Buttons — 🟡 GOOD (MINOR ISSUES)

Three variants: `.btn` (default), `.btn-primary` (forest), `.btn-ghost` (transparent).  
Three sizes: default, `.btn-sm`, `.btn-icon`.

**Issues:**
- ❌ No `:focus-visible` styles defined
- ❌ No `:active` or `:disabled` states (except JS `disabled` attribute)
- ❌ `.btn-primary` uses hardcoded `#fff` color

### 2.5 KPI Strip — 🟢 EXCELLENT

```
.kpi-strip (grid, 6 columns, gap: 1px to show border through)
→ .kpi-stat (individual stat with .value, .label, .trend)
```

The "gap: 1px with border on parent" trick creates clean bordered cells. Value uses Source Serif 4 (correct per brief for data emphasis). `.green`/`.amber`/`.red` color classes are well-named.

### 2.6 Urgent List — 🟢 GOOD

Semantic priority classes (`.p0`, `.p1`, `.p2`) with matching background/text colors. Completed state via `.completed` class (opacity 0.5 + line-through). Hover state shifts background. Good pattern.

### 2.7 Kanban Board — 🟡 GOOD

Four-column grid with draggable items. Column headers use JetBrains Mono uppercase.

**Issue: Inline-style duplication** — Priority badges inside kanban items repeat inline styles for the same visual treatment that `.prio` classes already define (lines 1746, 1749, 1754, etc.). Should use `.prio.p0`/`.p1`/`.p2` classes instead.

### 2.8 State Placeholders — 🟢 EXCELLENT

Empty state (`icon + msg + action`) and loading state (pulsing bars via CSS animation) are both handled. The `@keyframes pulse` animation is simple and effective. The `.pulse` bars use `animation-delay` staggering for a natural loading effect.

### 2.9 Calendar — 🟢 GOOD

7-column grid for days. Three event types (`.deadline`, `.milestone`, `.task`) with semantic colors. Today highlight, other-month dimming. This is clean.

### 2.10 Toggle Switch — 🟢 GOOD

Custom CSS toggle with `.toggle-switch` + `.knob`. Active state transitions the knob via `translateX(14px)`. The `width: 32px` → `translateX(14px)` is slightly off (should be ~16px for center), but visually acceptable.

---

## 3. Accessibility Audit — ⚠️ NEEDS WORK

| Check | Status |
|---|---|
| Semantic HTML structure | 🟡 Partial — uses `<section>` with `id` but no `aria-labelledby` |
| Heading hierarchy | 🟡 Missing h1-h6 globally — uses divs with classes |
| Focus-visible styles | ❌ Not defined anywhere |
| Button keyboard support | 🟡 Most `onclick` works with keyboard, but `:focus-visible` missing |
| Color contrast | 🟢 Good — ink scale provides strong contrast on warm paper |
| Form labels | 🟡 Search inputs have placeholder text but no explicit `<label>` |
| Dark mode contrast | 🟢 Deep theme maintains 4.5:1+ contrast ratios |
| Screen reader announcements | ❌ No `aria-live` regions for dynamic updates |
| Skip navigation | ❌ Missing |
| Reduced motion | ❌ No `@media (prefers-reduced-motion)` support |

### Critical Issues

1. **No `:focus-visible` anywhere** — All interactive elements (buttons, nav items, editable areas) lose visual focus indicators when outline is set to `none`. This violates WCAG 2.4.7.

2. **Missing heading hierarchy** — The entire document uses `<div>` elements with class-based typography instead of `<h1>`–`<h6>` elements. This significantly impacts screen reader navigation.

3. **No `prefers-reduced-motion` query** — The page transitions (opacity) and pulse animations have no reduced-motion fallback.

---

## 4. Responsive Design Audit — 🟢 GOOD

| Breakpoint | Behavior | Status |
|---|---|---|
| >900px | Full sidebar + main layout | ✅ |
| ≤900px | Single column, nav hidden, mobile bottom bar | ✅ |
| Mobile header | Search bar hidden, header center hidden | ✅ |

The mobile nav bar (`.mobile-nav`) at 48px height with tab-style items is well-implemented. The `body { padding-bottom: 48px }` ensures content doesn't hide behind the fixed bar.

**Minor issue:** The Notes and Docs page calculate height as `calc(100vh - var(--header-h) - 100px)` which doesn't account for the mobile bottom bar on small screens.

---

## 5. Dark Mode Audit — 🟢 EXCELLENT

The `.theme-deep` class provides a complete dark token inversion:

```
Light → Dark mapping:
--paper: #faf9f5 → #121418 (warm white → dark charcoal)
--forest: #2d4a3e → #7fa090 (dark green → lighter sage)
--ink-1: #1a1a1a → #e8e6e0 (black → off-white)
```

The forest green is inverted to a lighter, more legible sage tone — correct decision for dark backgrounds. Semantic colors (`danger`, `warning`) are also lightened.

**No issues found** in dark mode token mapping. Every token is properly remapped.

---

## 6. Code Quality & Maintainability

### Strengths
- CSS custom properties used consistently throughout (only ~8 instances of hardcoded values)
- Component naming follows BEM-lite conventions
- No external dependencies (vanilla JS, embedded SVG icons)
- Clear comments separating CSS sections and JS function groups
- localStorage for page state persistence

### Issues

1. **Proliferating inline styles**: ~20 elements use inline `style` attribute for repeated patterns like:
   ```
   font-family:var(--font-mono);font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:var(--ink-5)
   ```
   These should be extracted into utility classes (e.g., `.mono-label`, `.stat-header`).

2. **Inconsistency in priority rendering**: Kanban items use inline styles for P0/P1/P2 badges (lines 1746–1800) while the Command Center uses proper `.prio.p0`/`.p1`/`.p2` classes (lines 1536–1575). These should be unified.

3. **No formal typographic scale**: Headline sizes (22px, 20px, 16px, 15px, 14px, 13px, 12px) are defined ad-hoc rather than derived from a modular scale.

4. **Page height calculation inconsistency**: The Notes and Docs pages use `calc(100vh - var(--header-h) - 100px)` while the Agent Console uses a different layout. This should be centralized.

---

## 7. Page-by-Page Review

| Page | Completeness | Notes |
|---|---|---|
| **Command Center** | 🟢 100% | KPI strip, urgent list, active agents, timeline, quick actions — fully populated |
| **Todo List** | 🟢 95% | Kanban + Gantt toggle, task input, working drag events — functional mock |
| **Notes** | 🟢 90% | List + editor with toolbar, search filter working — `.active` states handled |
| **Project Tracker** | 🟢 100% | Pipeline funnel, project cards, health dashboard — complete |
| **Calendar** | 🟢 95% | Full month grid with events, timeline integration, legend — complete |
| **Docs** | 🟢 90% | Tree navigation + viewer with rendered markdown-like content |
| **Agent Console** | 🟢 100% | Agent grid, detail panel, comm channel, KV inspector — fully functional |
| **Settings** | 🟢 100% | API keys, display, widgets, data sources, export — all sections present |

---

## 8. Recommendations (Priority-Ordered)

### P0 — Must Fix Before Production

1. **Add `:focus-visible` styles** to all interactive elements — buttons, nav items, inputs, toggles.
2. **Add `<h1>`–`<h6>` heading hierarchy** alongside or replacing `.page-hdr-title`, `.widget-hdr-title`, etc.
3. **Add `prefers-reduced-motion` media query** to disable pulse animations and page transitions.

### P1 — Should Fix

4. **Extract repeated inline styles** into CSS utility classes (mono labels, uppercase headers, stat values).
5. **Unify priority badge rendering** — use `.prio.p0`/`.p1`/`.p2` classes consistently, not inline styles.
6. **Replace hardcoded `#fff`** with a semantic token (e.g., `--white: #ffffff` or `--paper-inverse`).

### P2 — Nice to Have

7. **Define a formal typographic modular scale** (e.g., based on 14px base with 1.25 ratio).
8. **Add print stylesheet** — `@media print` to collapse nav and optimize for paper output.
9. **Add `aria-live` regions** for dynamic content (badge updates, auto-save indicators).
10. **Centralize page height calculations** into a CSS variable or utility class.

---

## 9. Final Verdict

**This is a remarkably well-constructed single-file dashboard.** The design system is 90% there — strong token architecture, consistent component patterns, beautiful dark mode, and fully populated mock data across all 8 pages. The "paper + forest green" metaphor is consistently applied through every component.

The main gaps are in **accessibility** (focus styles, heading hierarchy, reduced motion) and **CSS purity** (a handful of hardcoded values, extensive inline styles). These are all fixable without architectural changes.

For a single-file SPA created as a design mock, the fidelity is exceptional. The gap between this and a production design system is approximately 2-3 days of hardening work.
