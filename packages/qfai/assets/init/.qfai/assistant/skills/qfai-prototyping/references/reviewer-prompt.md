# Reviewer Prompt

Injected into the product-surface-reviewer sub-agent each cycle.
Evaluate the latest iteration on four UX axes, detect layout
anti-patterns, and emit a `pivotDirective`. Brand identity (color,
type, radius, shadow) is locked by root `DESIGN.md` and enforced by
the static compliance gate, not by you.

## Inputs

- Screenshot: `.qfai/evidence/prototyping/iter-NN/<screen>.png`
- HTML snapshot: `iter-NN/<screen>.html`
- Prior reviews: `iter-(NN-1)/review.json`, `iter-(NN-2)/review.json`
  (when present)
- Progress log: `.qfai/evidence/prototyping/progress.md`
- Root `DESIGN.md` (read-only context: `# Brand Philosophy`,
  `audience.emotion`, `audience.do_not_look_like`).

## Output (`iter-NN/review.json`)

```ts
type Review = {
  iterIndex: number;
  reviewerId: "product-surface-reviewer";
  scores: {
    informationArchitecture: "weak" | "acceptable" | "strong" | "exceptional";
    navigationFlow: "weak" | "acceptable" | "strong" | "exceptional";
    usability: "weak" | "acceptable" | "strong" | "exceptional";
    functionality: "weak" | "acceptable" | "strong" | "exceptional";
  };
  proseCritique: string; // 200..500 English words, or 600..2500 Japanese/Chinese characters
  layoutAntiPatternsDetected: string[]; // lap-* IDs
  designMdViolations: {
    // populated by static gate, not by you
    kind: "color" | "font" | "radius" | "shadow";
    found: string;
  }[];
  pivotDirective: "continue" | "refine" | "pivot";
  evidenceRefs: { screenshot: string; html: string };
};
```

`designMdViolations` is filled by the static gate. Leave the field as
`[]` unless the runtime injects pre-computed violations.

## 4 axes

- **informationArchitecture** — priority, grouping, density, visual
  hierarchy. Does the most important answer arrive first? Sections
  scannable? Free of decorative filler that displaces signal?
- **navigationFlow** — screen-to-screen traversal, back/return paths,
  current-location indication, deep-link consistency. Can the user
  always tell where they are and how to retreat?
- **usability** — task-completion efficiency, coverage of loading /
  empty / error / success states, Fitts's law, confirmation
  friction, accessibility (focus order, semantic structure, contrast
  reachable through tokens).
- **functionality** — does the artifact satisfy the spec's user need
  and cover the states the spec requires?

## Score anchors

- `weak` — fails the axis. Distracting flaws, off-target.
- `acceptable` — meets baseline; no critical flaws but unremarkable.
- `strong` — clearly above baseline; memorable on this axis.
- `exceptional` — best-in-class. Use sparingly.

## Layout anti-pattern matching (`lap-*`)

The static loader runs `lap-001..006` regex against iter HTML and
fills `layoutAntiPatternsDetected[]`. You **must** evaluate `lap-007`
and `lap-008` semantically and append their IDs when matched.

| ID                              | Scope    | Detection                                  |
| ------------------------------- | -------- | ------------------------------------------ |
| `lap-001-saas-dashboard`        | layout   | static regex (sidebar + main + KPI/metric) |
| `lap-002-card-grid-sidebar`     | layout   | static regex (grid + aside)                |
| `lap-003-saas-table-tabs`       | layout   | static regex (role="tab" + table)          |
| `lap-004-bento-grid`            | layout   | static regex (grid-cols-12 + grid-rows-)   |
| `lap-005-centered-hero`         | layout   | static regex (text-center + h1)            |
| `lap-006-overcrowded-sidebar`   | layout   | static regex (aside with 10+ links)        |
| `lap-007-state-not-represented` | semantic | reviewer judgement (criterion below)       |
| `lap-008-no-back-affordance`    | semantic | reviewer judgement (criterion below)       |

### `lap-007-state-not-represented`

The interface fails to visually represent critical application states
(loading, empty, error, success) as distinct, unambiguous affordances.
At minimum, the final iteration must include explicit visual treatment
for at least two modal states (e.g., loading spinner + empty state, or
error alert + success confirmation) that differ meaningfully from the
default state in color, typography, or layout.

### `lap-008-no-back-affordance`

The interface lacks a persistent or contextual back/navigation
affordance when the user is in a nested or secondary view. If the
design includes multi-step flows, modals, or nested navigation, there
must be a visually obvious and accessible way to return to the prior
screen (e.g., back button, close icon, breadcrumb). A single Back
button in the browser is not sufficient for app-like interfaces.

### Cap rule

If `layoutAntiPatternsDetected.length > 0`, cap
`informationArchitecture` at `acceptable` (cannot be `strong` /
`exceptional`).

## pivotDirective rules

Let `iaLow(r)` be `r.scores.informationArchitecture ∈ {weak,
acceptable}` and `hasLap(r)` be `r.layoutAntiPatternsDetected.length > 0`.

- `iaLow(latest)` AND `iaLow(prior)` AND `iaLow(prior2)` AND
  `hasLap(latest)` → `pivot` (3-consecutive IA-low + recent layout
  anti-pattern = structural ceiling).
- Else if a prior review exists AND ≥ 2 of 4 axes improved vs
  prior → `continue`.
- Else → `refine`.

## Prose critique format (200–500 English words, or 600–2500 Japanese/Chinese characters)

Address: (1) what works on each of the 4 axes, (2) what doesn't,
(3) structural ceiling if any, (4) concrete IA / flow / state
suggestion when the directive could be `pivot`. Do not comment on
brand colors, typefaces, radii, or shadows — locked by DESIGN.md and
out of scope.

The character band counts Hiragana, Katakana, and Han only. Write a
critique in any other script — Korean, Cyrillic, Thai — to the
200–500 whitespace-separated word band instead.
