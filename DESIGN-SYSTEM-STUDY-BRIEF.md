# Design System Study Brief

## Purpose
Have the design team study the visual language from:
- `ez-influencer-360`
- `v0-ai-music-influencer-platform`

Use this as the shared reference before any new UI or polish pass.

## Source 1: EZ Influencer 360
**Core vibe:** high-tech underground lab / cyber-luxury / creator cockpit

### Key traits
- Background: deep black / near-black
- Accents: neon pink, gold, electric purple, lime
- Typography: bold display + clean sans body + mono support
- UI feel: glossy glass cards, glowing gradients, premium dark surfaces
- Motion: subtle shimmer, hover lift, active-state glow
- Layout: dense but controlled, dashboard-first, strong hierarchy

### Useful tokens/patterns
- `#0A0A0A` / `#050505` backgrounds
- `#FF1493`, `#FFD700`, `#9D00FF` accents
- `glass-card`, `gradient-border`, `text-gradient`
- dark-first global shell

## Source 2: EZ Music Influencer Platform
**Core vibe:** professional AI product / Linear + Figma + Runway / keyboard-first cockpit

### Key traits
- Dark-first with oklch token system
- Clean, information-dense layouts
- Command-palette thinking everywhere
- Glassmorphism used sparingly and deliberately
- Real-time status, queues, loading states, skeletons
- Mobile-first responsiveness with strong spacing discipline
- Polished micro-interactions, not noisy decoration

### Useful patterns
- Collapsible sidebar
- Persistent queue / activity feed
- Tabbed detail pages
- Hover quick-actions
- Empty states + skeletons
- Clear status badges and progress indicators

## Combined design direction
If we merge the two systems, the target is:
- **dark premium cockpit** + **creator energy**
- **neon accents** + **professional restraint**
- **glass surfaces** + **hard hierarchy**
- **motion with purpose**
- **mobile-safe, responsive shell**

## What to emulate
- Neon pink/gold/purple accent language
- Dark backgrounds with layered surfaces
- Serif/mono contrast for editorial + technical balance
- Clear active states and live feedback
- Fast, keyboard-friendly interactions

## What to avoid
- Generic blue SaaS styling
- Flat gray-only interfaces
- Overusing gradients everywhere
- Decorative motion that doesn’t communicate state
- Low-contrast text on dark surfaces

## Design-team instruction
Before building anything new:
1. Read the source docs and CSS.
2. Extract tokens, component patterns, and motion cues.
3. Reuse the strongest existing patterns rather than inventing a third visual language.
4. Keep the result consistent across cockpit, dashboard, and detail screens.

## Sources
- `/Users/michaelshaw/dyad-apps/ez-influencer-360/app/globals.css`
- `/Users/michaelshaw/dyad-apps/v0-ai-music-influencer-platform/.docs/DESIGN_SYSTEM.md`
- `/Users/michaelshaw/dyad-apps/v0-ai-music-influencer-platform/.planning/PROJECT.md`
- `/Users/michaelshaw/dyad-apps/v0-ai-music-influencer-platform/.docs/PLAYBOOK.md`
