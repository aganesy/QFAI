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

The compliance gate scans rendered HTML — `<style>` blocks, inline
`style="..."` attributes, AND Tailwind `class="..."` attributes — for
four categories of forbidden literals. Findings are **advisory-failing**:
the gate blocks convergence by default, but a Reviewer can override
when a finding is a known false positive.

### 1. color literal ban

No raw color literals outside `DESIGN.md.visual.colors`. The scanner
catches every authoring path:

- `#hex` (3 / 4 / 6 / 8 nibbles): e.g. `color: #ff0000`,
  `bg-[#ff0000]`.
- `rgb(...)` / `rgba(...)`: e.g. `background: rgb(255 0 0)`,
  `bg-[rgb(255_0_0)]`.
- `hsl(...)` / `hsla(...)`: e.g. `color: hsl(0 100% 50%)`.
- CSS named-color keywords (`red`, `white`, `blue`, …) when placed
  on a color-bearing property (`color`, `background`, `border`,
  `outline`, `fill`, `stroke`, `caret-color`, `text-decoration`,
  `column-rule`, and their `-color` longhands / shorthand variants).
- Tailwind palette utilities (`bg-blue-500`, `text-slate-900`,
  `border-red-400`, etc.) — the CDN cannot read `DESIGN.md`, so
  every palette class is by definition drift.

### 2. font-family literal ban

No `font-family:` whose first family token is outside
`DESIGN.md.visual.typography.family_sans` / `family_display` /
`family_mono`. Authored forms caught:

- Inline `font-family: Inter, sans-serif` (quoted or unquoted).
- Tailwind arbitrary `font-[Inter]`. Numeric / named font-weight
  arbitraries (`font-[600]`, `font-[medium]`) are weight tokens —
  not font-family drift — and pass through.

### 3. border-radius literal ban

No `border-radius:` value outside `DESIGN.md.visual.radius`. Authored
forms caught:

- Inline `border-radius: 12px` / `border-radius: 0.5rem`.
- Tailwind arbitrary `rounded-[13px]`, `rounded-[0.5rem]`.
- Tailwind scale aliases (`rounded`, `rounded-sm`, `rounded-md`,
  `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`,
  `rounded-full`, `rounded-none`) — all resolve to Tailwind defaults,
  not `DESIGN.md` tokens.

### 4. box-shadow literal ban (including rgba color slot)

No `box-shadow:` declaration outside `DESIGN.md.visual.shadow`. The
shadow value's embedded `rgba(...)` color slot is also covered.
Authored forms caught:

- Inline `box-shadow: 0 1px 2px rgba(15,23,42,0.05)`.
- Tailwind arbitrary `shadow-[0_4px_6px_rgba(0,0,0,0.1)]`.
- Tailwind scale aliases (`shadow`, `shadow-sm`, `shadow-md`,
  `shadow-lg`, `shadow-xl`, `shadow-2xl`, `shadow-inner`,
  `shadow-none`, `drop-shadow-*`).

### Safelisted CSS-wide keywords

The following values are **not** treated as drift by any of the four
scanners above — they are CSS inheritance / system keywords with no
visual identity:

- `inherit`
- `initial`
- `unset`
- `revert`
- `currentColor` (case-insensitive)
- `transparent`
- `none`
- `0` (dimensionless)

Authoring `font-family: inherit`, `border-radius: 0`, or
`box-shadow: none` passes the gate even when not present in
`DESIGN.md`.

### Allowed expression forms

The generator MUST express every styled surface as one of:

- A Tailwind utility class whose token resolves through the
  `tailwind.config.theme.extend.*` injection above (e.g. `bg-primary`,
  `text-text`, `rounded-md`, `shadow-lg`, `font-display`). These
  utilities reference `DESIGN.md` tokens by name and never carry a
  literal in the rendered DOM.
- A CSS custom-property reference via `var(--token-name)` where the
  `--token-name` is declared in a `:root { ... }` block inside the
  iter's `<style>` head. The scanner resolves the `var()` against
  the `:root` map and re-validates the resolved value against
  `DESIGN.md`.
- A `theme(...)` reference to the injected Tailwind theme.

### Other envelope constraints

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
