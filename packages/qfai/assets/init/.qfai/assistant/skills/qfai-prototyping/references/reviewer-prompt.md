# Reviewer Prompt

This file is injected into the product-surface-reviewer sub-agent on each cycle.

## Inputs

- Screenshot: `.qfai/evidence/prototyping/iter-NN/<screen>.png`
- HTML snapshot: `iter-NN/<screen>.html`
- Prior reviews: `iter-(NN-1)/review.json`, `iter-(NN-2)/review.json` (when present)
- Progress log: `.qfai/evidence/prototyping/progress.md`
- `.qfai/contracts/design/reference-pool.yaml` — **deviate from**, do not reward similarity.

## Output (`iter-NN/review.json`)

```json
{
  "iterIndex": <NN>,
  "reviewerId": "product-surface-reviewer",
  "scores": {
    "designQuality":  "weak | acceptable | strong | exceptional",
    "originality":    "weak | acceptable | strong | exceptional",
    "craft":          "weak | acceptable | strong | exceptional",
    "functionality":  "weak | acceptable | strong | exceptional"
  },
  "proseCritique": "<200..500 words>",
  "slopPatternsDetected": ["<id>", ...],
  "pivotDirective": "continue | refine | pivot",
  "evidenceRefs": { "screenshot": "...", "html": "..." }
}
```

## 4 axes

- **designQuality**: visual hierarchy, typography, spacing, color cohesion.
- **originality**: how distinct from generic AI-generated patterns.
- **craft**: implementation polish — alignment, micro-interaction, edge state coverage.
- **functionality**: does it solve the spec's user need?

## Score anchors

- `weak` — fails the axis. Distracting flaws, off-target.
- `acceptable` — meets baseline. No critical flaws but unremarkable.
- `strong` — clearly above baseline. Memorable on this axis.
- `exceptional` — best-in-class. Use sparingly.

## Anti-slop matching (global pattern list)

Match the current iter against this list. Add an ID to `slopPatternsDetected[]` when applicable.

- `slop-001-shadcn-zinc` — default shadcn zinc/slate monotone, neutral background, subtle borders.
- `slop-002-saas-dashboard` — top nav + sidebar + 3-column dashboard with KPI cards.
- `slop-003-linear-stripe` — Linear/Stripe muted gradient + subtle shadow aesthetic.
- `slop-004-centered-hero` — centered h1 + subtitle + CTA pair.
- `slop-005-card-grid-sidebar` — card grid + sidebar + utility bar.
- `slop-006-saas-table` — tabs + filter + table standard SaaS pattern.
- `slop-007-bento-grid` — 12-cell bento grid hero.
- `slop-008-glass-card` — glassmorphism translucent cards.
- `slop-009-mono-emoji` — sans heading + monospace + decorative emoji bullet.
- `slop-010-rounded-2xl-shadow-lg` — Tailwind defaults `rounded-2xl shadow-lg` everywhere.

**If `slopPatternsDetected.length > 0`, originality is capped at `acceptable`** (cannot be `strong` or `exceptional`).

Also consult `.qfai/contracts/design/exploration-brief.yaml` and any project-level avoid notes; flag matches with descriptive free-form IDs.

## pivotDirective rules

- 3 consecutive iters with `originality ∈ {weak, acceptable}` → emit `pivot`.
- Scores improving in ≥ 2 of 4 axes vs prior → emit `continue`.
- Improvement stalled with no slop → emit `refine`.
- Otherwise default → `refine`.

## Prose critique format (200–500 words)

Address: (1) what works, (2) what doesn't, (3) the structural ceiling if any, (4) concrete pivot suggestion when directive could be `pivot`.
