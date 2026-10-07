# Generator Iteration Prompt

Injected into the product-experience-architect sub-agent each iteration.
Brand identity is locked by root `DESIGN.md`. Iterate on **information
architecture**, **navigation flow**, and **usability** — not visual
identity.

## Contents

- Read order
- HTML envelope (mandatory on every iter)
- Hard constraints
- Output layout
- The first iteration (seed)
- Later iterations
- Pivot guidance (what changes vs what does not)

## Read order

1. Root `DESIGN.md` (front-matter tokens + `# Brand Philosophy` body).
2. The relevant business flows, user stories, and acceptance criteria in the story tree.
3. `<contractsDir>/ui/**/*.{yaml,yml}`.
4. `.qfai/prototype/grilling.md` — what this prototype is for, what
   would count as better, and what is out of bounds. Every iteration, not only the
   first: the contracts say what the screens are, and this says which of the
   shapes satisfying them the user asked for.
   **Read the rows whose `Scope` is this lineage — `<ui-contract-id>/<screen>` or
   `<ui-contract-id>` — plus the `global` ones, and no others.** One invocation runs a
   lineage per UI contract and screen, so an unfiltered read lets another screen's
   answer constrain this one.
   **`## Session` rows are constraints; `## Escalated` rows are not.** An
   escalated row is a question nobody has answered yet. Build something that
   makes it answerable and leave it open — treating it as a settled constraint
   decides on the user's behalf the one kind of question this loop exists to
   return to them.
5. From the second iteration on: the user's last answer,
   `iter-(NN-1)/review.json` (critique, scores,
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

## Hard constraints

The reviewer checks the rendered HTML — `<style>` blocks, inline
`style="..."` attributes, AND Tailwind `class="..."` attributes — for
four categories of forbidden literals, and records each one in
`designMdViolations[]`. The user sees every entry before confirming the
prototype.

Within a run the only way past a finding is to change the HTML: use a
token already declared in `DESIGN.md`, or drop the literal. Do **not**
edit `DESIGN.md` to widen the allowlist mid-loop. A genuine brand change
is a separate decision: the user edits `DESIGN.md`, and the next iteration
is built against it.

### 1. color literal ban

No raw color literals outside `DESIGN.md.visual.colors`. The reviewer
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
- Tailwind scale aliases with **no** `DESIGN.md.visual.radius` key of
  the same name: bare `rounded` (Tailwind's `DEFAULT`), `rounded-xl`,
  `rounded-2xl`, `rounded-3xl`, `rounded-none`. These resolve to
  Tailwind defaults, not `DESIGN.md` tokens.
- `rounded-sm` / `rounded-md` / `rounded-lg` / `rounded-full` are
  **allowed only in an iter whose own envelope re-binds that name**.
  The schema's `visual.radius` keys are exactly `sm|md|lg|full`, and
  the mandatory `theme.extend.borderRadius` injection re-binds those
  four names to the `DESIGN.md` tokens — but the reviewer verifies that in
  the iter's html rather than assuming it. An iter that omits the
  envelope, drops a key from the `borderRadius` map, or binds it to a
  different value renders Tailwind's default, and the alias is flagged
  exactly as before. Same for the side/corner prefixes
  (`rounded-t-md`, `rounded-tl-lg`, …).

### 4. box-shadow literal ban (including rgba color slot)

No `box-shadow:` declaration outside `DESIGN.md.visual.shadow`. The
shadow value's embedded `rgba(...)` color slot is also covered.
Authored forms caught:

- Inline `box-shadow: 0 1px 2px rgba(15,23,42,0.05)`.
- Tailwind arbitrary `shadow-[0_4px_6px_rgba(0,0,0,0.1)]`.
- Tailwind scale aliases with **no** `DESIGN.md.visual.shadow` key of
  the same name: bare `shadow` (Tailwind's `DEFAULT`), `shadow-xl`,
  `shadow-2xl`, `shadow-inner`, `shadow-none`.
- Every `drop-shadow-<alias>` form, including `drop-shadow-sm|md|lg` —
  the alias resolves through `theme.dropShadow`, which the mandatory
  envelope does not inject, so it renders a Tailwind default no matter
  what `visual.shadow` declares. The arbitrary form
  `drop-shadow-[...]` carries its own literal and is judged like any
  other arbitrary value: compliant when the literal is one of the
  `visual.shadow` tokens, drift otherwise.
- `shadow-sm` / `shadow-md` / `shadow-lg` are **allowed only in an iter
  whose own envelope re-binds that name**. The schema's `visual.shadow`
  keys are exactly `sm|md|lg`, and the mandatory
  `theme.extend.boxShadow` injection re-binds those three names to the
  `DESIGN.md` tokens — but the reviewer verifies that in the iter's html
  rather than assuming it, so an iter with a missing, incomplete, or
  overwritten `boxShadow` map still has its aliases flagged.
- Tailwind's own runtime custom properties (`--tw-ring-offset-width`,
  `--tw-shadow`, …) never count as drift on their own — the reviewer
  ignores them. A literal `box-shadow:` value or an
  `rgba(...)` slot next to one of them is still caught.

### 5. contrast floor

Text must meet `DESIGN.md.accessibility.contrast_ratio_min` against the
background it sits on, or WCAG AA where the pack declares no floor.

The reviewer reads a pair from any declaration block that states both a text
colour and a background — a rule body inside `<style>`, or one inline
`style="..."` attribute — resolving `:root` tokens first. So a block
setting `color:` without a `background-color:` is judged against
nothing, which is not permission: the colour it inherits still has to
carry the ratio, and the reviewer walks it.

- Pair every foreground with the background it is actually drawn on,
  in the same block, so the ratio is checkable.
- Pick both from `DESIGN.md.visual.colors`. A pair of tokens that fails
  the declared floor is a defect in the palette, not a licence to write
  a literal.
- A pair the reviewer cannot read is not judged: a named colour, `hsl()`,
  the space-separated `rgb(r g b)` form, a value carrying alpha, or a
  shorthand with more than a colour in it. Prefer `#rrggbb` and
  `rgb(r, g, b)` so the check binds.

### Markup shown as sample text

A class the page **shows** reads the same as one it **uses**. A screen
that displays markup as sample text —
`<code>&lt;div class="bg-[#abcdef]"&gt;</code>` in a tutorial or a
documentation panel — has that class read as if it were live, and the
literal inside it is reported as drift.

Escape the sample, or keep it out of the rendered HTML. A finding on a
sample cannot be waived, and rewriting the sample to satisfy the reviewer
would leave the screen showing markup nobody writes.

### Safelisted CSS-wide keywords

The following values are **not** treated as drift in any of the four
categories above — they are CSS inheritance / system keywords with no
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
`box-shadow: none` passes the reviewer even when not present in
`DESIGN.md`.

### Allowed expression forms

The generator must express every styled surface as one of:

- A Tailwind utility class whose token resolves through the
  `tailwind.config.theme.extend.*` injection above (e.g. `bg-primary`,
  `text-text`, `rounded-md`, `shadow-lg`, `font-display`). These
  utilities reference `DESIGN.md` tokens by name and never carry a
  literal in the rendered DOM.
- A CSS custom-property reference via `var(--token-name)` where the
  `--token-name` is declared in a `:root { ... }` block inside the
  iter's `<style>` head. The reviewer resolves the `var()` against
  the `:root` map and re-validates the resolved value against
  `DESIGN.md`.
- A `theme(...)` reference to the injected Tailwind theme.

### Other envelope constraints

- No runtime dependency beyond the Tailwind and Lucide tags the
  envelope declares: no package install, no `<link rel="stylesheet">`,
  no further script tag. A single file loaded from a CDN has no package
  manager to run an install with, and CSS behind a `<link>` is not
  part of the reviewed file, so a literal there is drift nobody sees.
- Markup is not a dependency. Transposing a block from a component
  catalogue and re-binding its palette classes to `DESIGN.md` tokens is
  the expected way to build a screen. The reviewer reads the values a class
  carries, not where the markup came from, so a transposed block passes
  once `bg-blue-500` becomes `bg-primary` and `rounded-xl` becomes
  `rounded-md`. Take the structure; re-bind the palette.
- One self-contained HTML file; embedded CSS / JS minimal.
- All declared UI contract screens reachable; loading / empty / error /
  success states representable.
- The reviewer reports **one finding per distinct offending value**, not
  one per occurrence: a single drifting token repeated across N screens is one
  entry in `designMdViolations[]`. Fix the value once and the finding clears —
  do not expect the count to track the number of places it appears.

## Output layout

Write `.qfai/prototype/iter-NN/index.html` and nothing else. The reviewer
opens it in a browser; `prototyping-handoff` copies the confirmed one to
`.qfai/prototype/final/index.html`, which `/qfai-implement` reads.

A UI contract declaring N screens is satisfied by **one** `index.html`
containing N client-side routes — not N files. Each declared screen must
be reachable at its own contract `route`, so the reviewer can open it on
its own. Keep the contract `route` values as the product needs them, and
match the routing shape to what the server in use does with an unknown
path: a path route needs a server that falls back to `index.html`, and a
hash route (`/#/settings`) works on any static server.

## The first iteration (seed)

Produce one self-contained `iter-00/index.html` that satisfies the spec
under the DESIGN.md tokens. Lead with the user's primary task;
respect `audience.do_not_look_like`.

## Later iterations

The user's answer comes first. The reviewer's `pivotDirective` is your
strong recommendation for everything the answer leaves open:

- `continue` — refine details, keep direction.
- `refine` — adjust within current direction; address
  `proseCritique`, `layoutAntiPatternsDetected`, or
  `designMdViolations` weaknesses.
- `pivot` — rethink IA and navigation flow. Discard prior screen
  layout, grouping, and traversal model; try a fundamentally
  different IA or flow. **Brand tokens stay locked.** Pivot is
  rewarded, not penalized.

Write to `.qfai/prototype/iter-(NN+1)/index.html`.

## Pivot guidance (what changes vs what does not)

| Locked (do not change)            | Mutable (iterate freely)                |
| --------------------------------- | --------------------------------------- |
| Color tokens (12 keys)            | Component selection and grouping        |
| Font families (sans/display/mono) | Screen layout and density               |
| Radii (4 keys), shadows (3 keys)  | Navigation pattern and back affordances |
| Voice, do/don't from DESIGN.md    | State coverage (loading/empty/error/ok) |
