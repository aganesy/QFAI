# Generator Iteration Prompt

Injected into the product-experience-architect sub-agent each cycle.
Brand identity is locked by root `DESIGN.md`. Iterate on **information
architecture**, **navigation flow**, and **usability** — not visual
identity.

## Read order

1. Root `DESIGN.md` (front-matter tokens + `# Brand Philosophy` body).
2. `.qfai/specs/spec-*/01_Spec.md` and `03_Acceptance-Criteria.md`.
3. `.qfai/contracts/ui/*.yaml`.
4. Cycles 1..14: `iter-(NN-1)/review.json` (critique, scores,
   `layoutAntiPatternsDetected`, `designMdViolations`,
   `pivotDirective`), `iter-(NN-2)/review.json` when present, and
   `progress.md`.

## HTML envelope (mandatory on every iter)

Every `iter-NN/index.html` must start with the head below; replace
`{{...}}` with literal values read from DESIGN.md front-matter:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <script>
      tailwind.config = { theme: { extend: {
        colors: {{visual.colors}},
        fontFamily: {
          sans:    [{{visual.typography.family_sans}}],
          display: [{{visual.typography.family_display}}],
          mono:    [{{visual.typography.family_mono}}]
        },
        borderRadius: {{visual.radius}},
        boxShadow:    {{visual.shadow}}
      } } };
    </script>
  </head>
</html>
```

Body markup uses Tailwind utilities that resolve through the injected
tokens (e.g. `bg-primary`, `text-text`, `rounded-md`, `shadow-lg`,
`font-display`).

## Hard constraints (enforced by the compliance gate)

- No `#hex`, `rgb(...)`, `rgba(...)`, `hsl(...)`, `hsla(...)` value
  outside `DESIGN.md.visual.colors`.
- No `font-family:` whose first token is outside
  `DESIGN.md.visual.typography.family_*`.
- No `border-radius:` outside `DESIGN.md.visual.radius`.
- No `box-shadow:` outside `DESIGN.md.visual.shadow`.
- No component library beyond Tailwind + Lucide. No external CSS, no
  design-system imports.
- One self-contained HTML file; embedded CSS / JS minimal.
- All declared spec screens reachable; loading / empty / error /
  success states representable.

## Cycle 0 (seed)

Produce one self-contained `iter-00/index.html` that satisfies the spec
under locked DESIGN.md tokens. Lead with the user's primary task;
respect `audience.do_not_look_like`.

## Cycles 1..14

The reviewer's `pivotDirective` is your strong recommendation:

- `continue` — refine details, keep direction.
- `refine` — adjust within current direction; address
  `proseCritique`, `layoutAntiPatternsDetected`, or
  `designMdViolations` weaknesses.
- `pivot` — rethink IA and navigation flow. Discard prior screen
  layout, grouping, and traversal model; try a fundamentally
  different IA or flow. **Brand tokens stay locked.** Pivot is
  rewarded, not penalized.

Write to `.qfai/prototypes/iter-(NN+1)/index.html`.

## Pivot guidance (what changes vs what does not)

| Locked (do not change)            | Mutable (iterate freely)                |
| --------------------------------- | --------------------------------------- |
| Color tokens (12 keys)            | Component selection and grouping        |
| Font families (sans/display/mono) | Screen layout and density               |
| Radii (4 keys), shadows (3 keys)  | Navigation pattern and back affordances |
| Voice, do/don't from DESIGN.md    | State coverage (loading/empty/error/ok) |
