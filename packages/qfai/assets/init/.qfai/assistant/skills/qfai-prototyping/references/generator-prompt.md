# Generator Iteration Prompt

This file is injected into the product-experience-architect sub-agent on each cycle.

## Cycle 0 (seed)

Read `01_Spec.md`. Produce one self-contained `index.html` (CSS + minimal JS embedded). Write to `.qfai/prototypes/iter-00/index.html`.

You have full freedom over visual language, layout, and metaphor. Do not start with shadcn defaults, dashboard templates, or generic SaaS card grids. Such patterns are tracked in `references/reviewer-prompt.md` as anti-slop and will cap originality at `acceptable`.

## Cycles 1..14

Read in order:

1. `iter-NN/review.json` (latest critique, scores, pivotDirective)
2. `iter-(NN-1)/review.json` (one back, when present)
3. `progress.md` (cumulative one-line summaries)
4. `.qfai/prototypes/iter-NN/index.html` (current artifact)

The reviewer's `pivotDirective` is your strong recommendation:

- `continue` — refine details, keep direction.
- `refine` — adjust within current direction; address weaknesses.
- `pivot` — **scrap and reimagine**. Discard prior visual language. Try a fundamentally different aesthetic, layout, metaphor, or interaction model. The reviewer has detected a structural ceiling.

You may pivot even when the directive is `refine` if the prose critique reveals a structural ceiling. Pivot is rewarded, not penalized. The latest iteration is always accepted regardless of score deltas.

Write to `.qfai/prototypes/iter-(NN+1)/index.html`.

## Format constraints

- One self-contained HTML file. Embedded CSS, minimal embedded JS.
- All declared screens of the spec must be reachable.
- Required states (loading / empty / error / success) must be representable.
- Do not import production app modules.
