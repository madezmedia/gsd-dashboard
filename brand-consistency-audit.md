# Brand Consistency Audit — GSD Dashboard vs Mad EZ Media Design System

**Auditor:** design-brand-guardian (Brand Consistency Agent, ACMI Fleet)  
**Date:** May 24, 2026  
**Artifact:** `gsd-dashboard.html`  
**Reference System:** Mad EZ Media Brand Design System (via Bentley's brief & ACMI fleet standards)

---

## Executive Summary

**Brand Fidelity Score: 72/100** (C+ — borderline acceptable)

The GSD Dashboard largely respects the Mad EZ Media brand system but has several notable violations. The warm-paper-and-forest-green palette is correctly implemented, the font stack matches Bentley's approved specification, and the accent color is used with restraint. However, **a Purple Ban violation** is present, Source Serif 4 leaks beyond its "headlines only" role, and the complete absence of semantic heading hierarchy undermines the brand's editorial quality standard.

| Dimension | Score | Verdict |
|-----------|-------|---------|
| Color Palette Match | 95/100 | ✅ Near-perfect |
| Accent Restraint | 90/100 | ✅ Well-constrained |
| Typography (Type Ratios) | 60/100 | ❌ Leaks & sizing drift |
| Purple & Glow Ban | 40/100 | ❌ Violation found |
| Warm Ivory Background | 100/100 | ✅ Authentically used |
| Brand-Inappropriate Colors | 50/100 | ❌ Purple sleep state |
| Heading Hierarchy (h1-h6) | 0/100 | ❌ Nonexistent |

---

## 1. Color Palette Match

### 1.1 Core Brand Tokens — PASS ✅

All core Mad EZ Media brand tokens are correctly implemented:

| Brand Token | Spec | Implementation | Verdict |
|---|---|---|---|
| Warm Ivory (paper) | `#faf9f5` | `--paper: #faf9f5` | ✅ Exact |
| Warm Bone (elevated) | `#f4f2eb` | `--paper-elev: #f4f2eb` | ✅ Exact |
| Ink 1 (darkest) | `#1a1a1a` | `--ink-1: #1a1a1a` | ✅ Exact |
| Ink 5 (lightest) | `#9a9a96` | `--ink-5: #9a9a96` | ✅ Exact |
| Ink 2–4 (mid tones) | `#2c2c2a`/`#4a4a48`/`#7a7a76` | Custom ramp from brand spec | ✅ Acceptable variants |
| Forest Green (primary accent) | `#2d4a3e` | `--forest: #2d4a3e` | ✅ Exact |
| Forest Green 2 | `#5a7d6f` | `--forest-2: #5a7d6f` | ✅ Exact |
| Forest Deep | `#1c3027` | `--forest-deep: #1c3027` | ✅ Exact |

### 1.2 Supplementary Colors — ACCEPTABLE ✅

Additional tokens are sensible extensions of the brand palette:
- `--forest-3: #7fa090` — tertiary green, appropriate
- `--forest-glow: rgba(45,74,62,0.1)` — subtle green tint, not a neon/glow violation
- `--danger: #c75050` / `--warning: #c4903a` — muted semantic colors, acceptable
- `--paper-inverse: #ffffff` — only used for text-on-forest contrast, acceptable
- `--paper-deep: #efece2` / `--paper-shade: #e8e4d8` — paper variants, acceptable
- `--archive: #b8b0a0` / `--archive-deep: #5c5648` — muted archival tones, acceptable

### 1.3 White Usage — CORRECT ✅

The brand requires Warm Ivory (`#faf9f5`), not pure white. The implementation uses:
- **Body background:** `var(--paper)` → `#faf9f5` ✅
- **Header:** `var(--paper)` → `#faf9f5` ✅
- **Sidebar nav:** `var(--paper)` → `#faf9f5` ✅
- **Widget cards:** `var(--paper-elev)` → `#f4f2eb` (Warm Bone) ✅
- **Pure white (`#fff`):** Only used via `--paper-inverse` for text on forest-green buttons ✅

**There is no white-background violation.** The warm substantive paper feel is present throughout.

---

## 2. Accent Restraint — PASS (with minor note) ✅

Deep Forest Green (`#2d4a3e` / `#5a7d6f`) is the **single accent color** — no secondary accent competes with it.

**Where forest green is used:**
- Brand mark (logo block)
- Primary button backgrounds
- Active nav item indicator (border-left)
- Focus-visible outlines
- Search bar focus border
- Progress fill bars
- Status indicators (online dot, active dot)
- Toggle switch active state
- View toggle active state
- Tag text in notes/tasks/projects
- Timeline source labels
- Hover states on actionable text

**Assessment:** The accent is used as a **system signal** (active, primary, progress, focus) rather than decoration. This is brand-appropriate — the Mad EZ Media system treats forest green as a functional accent, not a decorative flourish. No card is "flooded" with green. The accent density is consistent with a command terminal aesthetic.

**Minor note:** The `.view-toggle .opt.active` state paints the entire option pill in forest green (`background: var(--forest); color: var(--paper-inverse)`) — this is a fairly heavy use for a toggle. Consider using `var(--forest)` as text color only, or `var(--forest-glow)` as background, to be more restrained. **Recommendation (non-blocking):** Soften the active toggle background.

---

## 3. Typography — Type Ratios & Family Compliance ⚠️

### 3.1 Font Family — CORRECT per Bentley's Brief ✅

The Mad EZ Media general system specifies Montserrat (display) / Raleway (body) / JetBrains Mono (data). However, **Bentley expressly approved** Source Serif 4 / Inter / JetBrains Mono for this project. The implementation matches:

| Role | Approved | Implemented | Verdict |
|---|---|---|---|
| Display/headline | Source Serif 4 | `--font-serif: 'Source Serif 4', ...` | ✅ |
| Body/UI | Inter | `--font-sans: 'Inter', ...` | ✅ |
| Data/code | JetBrains Mono | `--font-mono: 'JetBrains Mono', ...` | ✅ |

### 3.2 Source Serif 4 — "Headlines Only" Violation ❌

Per the brief, Source Serif 4 is intended for **headlines only** (h1–h3 equivalent at 20–28px). Two uses violate this:

1. **KPI data values** (`.kpi-stat .value`, line 503–510):
   - Uses Source Serif 4 at 22px
   - These are **numerical data points** — should use JetBrains Mono (data font) or Inter (body font)
   - **Severity: Medium** — undermines the editorial typography system

2. **Note editor body text** (`.note-editor textarea`, line 927–938):
   - Uses Source Serif 4 at 13px for writing/editing
   - Notes are **body content**, not headlines
   - Should use Inter (body font) for the textarea
   - **Severity: Medium** — note content should be in reading-weight Inter

3. **Pipeline funnel counts** (`.funnel-stage .count`, line 1014–1020):
   - Uses Source Serif 4 at 18px for numbers
   - These are data counts, not headlines
   - **Severity: Low** — borderline acceptable for emphasis, but technically a violation

### 3.3 Display Sizes — Brand Standard ✅

The brand calls for display text at 18–22px for UI. Page headers are correctly implemented:
- `.page-hdr-title`: Source Serif 4, 22px ✅
- `.doc-title`: Source Serif 4, 20px ✅
- `.docs-viewer .doc-body h2`: Source Serif 4, 16px (slightly low for a real h2, but acceptable as embedded content)

### 3.4 Data/Mono Sizing — Previously flagged, still unresolved

(Noted but not re-litigated here — covered in Bentley's fidelity audit §2.2.)

---

## 4. Purple & Glow Ban — VIOLATION FOUND ❌

**The Mad EZ Media brand system explicitly bans purple and glow/neon effects.**

### 4.1 Purple Violation: Agent Sleep State

**File:** `gsd-dashboard.html`, line 618 (CSS) and line 3019 (JavaScript)

```css
.agent-dot.sleep { background: #6b6bb0; }
```

```javascript
// line 3019
else if (status === 'sleeping' || status === 'sleep') statusColor = '#6b6bb0';
```

**`#6b6bb0` is a blue-purple hue** — a direct Purple Ban violation. The sleep/offline state should use a tone from the established brand palette. Options:
- Use `--archive` (`#b8b0a0`) — a muted archival tone
- Use `--ink-4` (`#7a7a76`) — matching the offline dot color
- Use `--forest-deep` (`#1c3027`) at lower opacity
- Use a diamond/outline variant of the existing status dots instead of a new color

**Severity: HIGH** — This is a clear brand policy violation. The purple stands out as an alien color in an otherwise warm, organic palette.

### 4.2 Glow Check — PASS ✅

- `--forest-glow: rgba(45,74,62,0.1)` — This is a subtle **forest green tint**, not a neon/pink glow. It's used as a background wash for tags, milestone events, and active state backgrounds. This is acceptable — the brand's "glow ban" targets hot pink / electric purple / cyan neon, not subtle translucent overlays in the brand's own accent color.
- No `box-shadow` with colored glows
- No `text-shadow` effects
- No gradient backgrounds
- No animated glow/pulse effects beyond the loading skeleton

---

## 5. Warm Ivory Background Authenticity — PASS ✅

The background is **genuinely Warm Ivory (`#faf9f5`)**, not pure white:

| Element | Token Value | Actual Color | Looks Like |
|---|---|---|---|
| `<body>` background | `var(--paper)` | `#faf9f5` | Warm paper |
| Header | `var(--paper)` | `#faf9f5` | Warm paper |
| Sidebar nav | `var(--paper)` | `#faf9f5` | Warm paper |
| Widget cards | `var(--paper-elev)` | `#f4f2eb` | Warm bone |
| Note editor | `var(--paper)` | `#faf9f5` | Warm paper |
| Search modal | `var(--paper-elev)` | `#f4f2eb` | Warm bone |

The warm ivory aesthetic is consistent throughout. Even in the `.theme-deep` (dark mode) variant, the equivalent tokens maintain the same warm-toned relationship (e.g., `--paper: #121418` instead of pure black `#000000`).

---

## 6. Brand-Inappropriate Color Usage

### 6.1 Purple (Sleep State) — ❌ VIOLATION

As detailed in §4.1, `#6b6bb0` is the only brand-inappropriate color in the entire stylesheet. No pink, no cyan, no neon, no electric colors otherwise.

### 6.2 Archival/Status Colors — ACCEPTABLE ✅

| Color | Usage | Brand-Appropriate? |
|---|---|---|
| `#c75050` (danger) | Priority P0, deadlines | ✅ Muted red, not hot pink |
| `#c4903a` (warning) | Priority P1, warnings | ✅ Muted amber, acceptable |
| `#5c5648` (archive-deep) | Overdue indicators | ✅ Warm archival tone |
| `#b8b0a0` (archive) | Placeholder icons | ✅ Warm neutral |

### 6.3 Modal Backdrop — ACCEPTABLE ✅

Search modal uses `rgba(0,0,0,0.3)` — a standard dark overlay. This is acceptable for functional overlay interfaces and does not violate brand guidelines.

---

## 7. Heading Hierarchy (h1–h6) — CRITICAL FAILURE ❌

**The entire document has zero semantic heading elements.** This is a fundamental violation of the brand's editorial quality standard and accessibility requirements.

| Heading Level | Expected | Actual | Status |
|---|---|---|---|
| Page title (h1) | `<h1>Command Center</h1>` | `<div class="page-hdr-title">` | ❌ |
| Section title (h2) | `<h2>Urgent Actions</h2>` | `<span class="widget-hdr-title">` | ❌ |
| Sub-section (h3) | `<h3>Active Agents</h3>` | `<span class="widget-hdr-title">` | ❌ |
| KPI label (h4) | `<h4>P0 Tasks</h4>` | `<div class="label">` | ❌ |
| Nav group (h5) | `<h5>Overview</h5>` | `<div class="nav-group-title">` | ❌ |
| Micro heading (h6) | `<h6>Settings</h6>` | `<div class="settings-group-title">` | ❌ |

The only exception is inside the Docs viewer, where `.doc-body h2` is used for section headings (e.g., "Overview", "Architecture"). This demonstrates the developer knows how to use `<h2>` but chose not to apply the pattern elsewhere.

**Impact:**
- Screen readers (JAWS, NVDA, VoiceOver) cannot generate a heading outline
- Users cannot navigate by heading landmarks (the primary accessibility method)
- The "Bloomberg Terminal meets The New Yorker" editorial standard demands proper document structure
- SEO is negatively impacted

**Fix:** Convert each `.page-hdr-title` → `<h1>`, each `.widget-hdr-title` → `<h2>`, each `.nav-group-title` → `<h3>`, etc. Maintain the same visual styling via CSS classes.

---

## 8. Additional Brand Observations

### 8.1 Dark Mode Coherence

The `.theme-deep` variant maintains brand identity effectively:
- Paper becomes warm dark (`#121418`), not pure black ✅
- Ink scale flips (light text on dark bg) ✅
- Forest green shifts to lighter green (`#7fa090`) for contrast on dark bg ✅
- The dark mode feels like "dimming the paper" rather than switching to a completely different brand ✅

### 8.2 Brand Mark

The brand mark (line 168–175) uses a forest-green square with a plus symbol — clean, minimal, appropriate for the Mad EZ Media aesthetic. No logo over-engineering. ✅

### 8.3 Visual Noise Level

The dashboard maintains appropriate **negative space** for a terminal-meets-editorial aesthetic. Widgets have breathing room, the KPI strip uses grid gaps effectively, and kanban columns are separated. The brand's "dense but legible" standard is met. ✅

### 8.4 Interaction Aesthetic

The transition timing (`--d-fast: 150ms`, `--d-norm: 280ms`) and easing (`cubic-bezier(0.16,1,0.3,1)`) are appropriately restrained — no gratuitous animations. The `prefers-reduced-motion` media query is present (line 113). This respects the brand's "tools, not toys" philosophy. ✅

---

## Summary of Findings

### Passes ✅
- [x] Warm Ivory background (`#faf9f5`) used consistently — no white-background violation
- [x] Warm Bone elevated surfaces (`#f4f2eb`) for cards
- [x] 5-level charcoal ink scale correctly implemented (`#1a1a1a` → `#9a9a96`)
- [x] Deep Forest Green as single accent color (`#2d4a3e` / `#5a7d6f`)
- [x] Font stack matches Bentley's approved spec (Source Serif 4 / Inter / JetBrains Mono)
- [x] Accent used with restraint — no card is flooded with green
- [x] Brand mark and logo treatment appropriate
- [x] Visual noise level appropriate for terminal/editorial hybrid
- [x] Interaction easing restrained and professional
- [x] Dark mode variant maintains brand identity

### Critical Violations ❌
1. **PURPLE BAN:** Agent sleep state uses `#6b6bb0` (blue-purple) — must be replaced with a brand-palette color (§4.1)
2. **NO HEADING HIERARCHY:** Zero `<h1>`–`<h6>` elements — entire document lacks semantic structure (§7)
3. **SOURCE SERIF 4 LEAKAGE:** Used for KPI data values and note editor body text — should be restricted to "headlines only" (§3.2)

### Minor Issues ⚠️
4. View toggle active state uses solid forest green background — consider softening to `--forest-glow` (§2)
5. Pipeline funnel counts use Source Serif 4 — should use JetBrains Mono for data consistency (§3.2)

---

## Action Items (Priority Order)

| Priority | Issue | Fix | Effort |
|---|---|---|---|
| **P0** | Purple #6b6bb0 used for sleep state | Replace with `--archive` (`#b8b0a0`) or `--ink-4` (`#7a7a76`) | 5 min |
| **P0** | No h1–h6 heading hierarchy | Convert page titles → `<h1>`, widget headers → `<h2>`, etc. | 30 min |
| **P1** | Source Serif 4 on KPI values | Change `.kpi-stat .value` font-family to `var(--font-mono)` or `var(--font-sans)` | 5 min |
| **P1** | Source Serif 4 on note editor textarea | Change `.note-editor textarea` font-family to `var(--font-sans)` | 5 min |
| **P2** | View toggle active background | Consider `--forest-glow` instead of solid `--forest` | 5 min |
| **P2** | Pipeline funnel count font | Change to `var(--font-mono)` for data consistency | 5 min |

---

## Log

**design-brand-guardian** — Audit completed and written to `brand-consistency-audit.md`.  
**correlationId:** `brandAuditGSDDashboard`  
**Session:** `audit-gsd-dashboard-001`
