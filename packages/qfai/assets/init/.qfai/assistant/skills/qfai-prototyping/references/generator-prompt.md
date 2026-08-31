# Generator Iteration Prompt

Injected into the product-experience-architect sub-agent each cycle.
Brand identity is locked by root `DESIGN.md`. Iterate on **information
architecture**, **navigation flow**, and **usability** — not visual
identity.

## Read order

1. Root `DESIGN.md` (front-matter tokens + `# Brand Philosophy` body).
2. `.qfai/specs/spec-*/01_Spec.md` and `03_Acceptance-Criteria.md`.
3. `.qfai/contracts/ui/*.yaml`.
4. Cycles 1..9: `iter-(NN-1)/review.json` (critique, scores,
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
four categories of forbidden literals. The gate is **hard and
non-waivable**: any finding blocks convergence, and there is no
Reviewer override. Ordinary cycles carry no scanner output —
`designMdViolations` stays `[]` in every Reviewer report — because the
scan runs at the two checkpoints below, not once per cycle. A
**convergence** stop takes more than the four scores: it needs all
four axes `exceptional` **and both finding arrays empty** —
`layoutAntiPatternsDetected` and `designMdViolations` alike — so one
surviving `lap-*` keeps the loop running on four exceptional scores,
and clearing it is the next cycle's work. On that stop the accepted
iteration's HTML is re-scanned before the stop is honoured, so a
hand-written `[]` in the Reviewer report is discarded and the loop
keeps iterating (the re-scan drives that decision only; it is not
written back into the review). The re-scan reaches the captured HTML
that is **present and readable**: a missing `iter-NN/` directory, or a
file it cannot stat or read, yields no findings and therefore does not
block the stop — a clean re-scan is not proof the evidence was
inspected. Certify is the backstop there as well; it refuses to seal
at all when the accepted iteration has no readable HTML under it. A
**max-iterations** stop skips that re-scan —
it reports an exhausted budget, not a clean bill of health — but
`npx qfai prototyping certify` re-scans every captured HTML file of
the accepted iteration unconditionally and exits 2 on any finding, so
no certificate is **issued** over a violation **the capture evidence
shows**. That is the whole guarantee: certify reads
`.qfai/evidence/prototyping/iter-NN/` only and never opens the
authoring tree (see _Output layout_), so a literal that survives in
`.qfai/prototypes/iter-NN/index.html` but is not rendered into the
capture — a stale `--target-url` build, a branch CAPTURE never
exercised — is outside it. Keep the two trees in step. One carve-out:
`npx qfai prototyping certify --upgrade-scope full` is not an issuing
path — it re-gates an already-sealed scope-limited certificate against
the validate-side gate signal and rewrites the scope marker without
re-scanning HTML. If the final HTML moved after the seal, re-run
`npx qfai prototyping certify --check`, which recomputes the evidence
digests and reports the mismatch.

Within a frozen run the only way past a finding is to change the HTML:
use a token already declared in `DESIGN.md`, or drop the literal. Do
**not** edit `DESIGN.md` to widen the allowlist mid-loop — every cycle
≥ 1 compares live `DESIGN.md`, `DESIGN.md.lock.yaml` and the cycle-0
cached sha256 before anything else, so the next iterate exits 2 with a
hash mismatch. A genuine brand change is a separate operation:
refreeze the lock via `/qfai-sdd`, then restart the loop with
`npx qfai prototyping iterate --cycle 0 --target-url <url> --force`.
`--force` is not optional here — the prior loop's `iter-00` is still on
disk and cycle 0 refuses to overwrite it without one; with it,
`.qfai/evidence/prototyping/iter-00` is renamed to
`iter-00.backup-<ISO>` before the reset. Only the **evidence** tree is
backed up: `.qfai/prototypes/iter-00/` is left in place and your next
cycle-0 `index.html` overwrites it with no backup, so copy that
directory aside yourself first if the prior loop's authoring artifact
still matters.

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
- Tailwind scale aliases with **no** `DESIGN.md.visual.radius` key of
  the same name: bare `rounded` (Tailwind's `DEFAULT`), `rounded-xl`,
  `rounded-2xl`, `rounded-3xl`, `rounded-none`. These resolve to
  Tailwind defaults, not `DESIGN.md` tokens.
- `rounded-sm` / `rounded-md` / `rounded-lg` / `rounded-full` are
  **allowed only in an iter whose own envelope re-binds that name**.
  The schema's `visual.radius` keys are exactly `sm|md|lg|full`, and
  the mandatory `theme.extend.borderRadius` injection re-binds those
  four names to the `DESIGN.md` tokens — but the gate verifies that in
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
  `DESIGN.md` tokens — but the gate verifies that in the iter's html
  rather than assuming it, so an iter with a missing, incomplete, or
  overwritten `boxShadow` map still has its aliases flagged.

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
- The compliance gate reports **one finding per distinct offending value**, not
  one per occurrence: a single drifting token repeated across N screens is one
  entry in `designMdViolations[]`. Fix the value once and the finding clears —
  do not expect the count to track the number of places it appears.

## Output layout — two trees, two shapes

There are two directory trees and they are NOT interchangeable. The
generator writes to exactly one of them.

| Tree                                  | Shape                                                    | Written by                               | Read by                                         |
| ------------------------------------- | -------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------- |
| `.qfai/prototypes/iter-NN/`           | one `index.html`                                         | **the generator** (you)                  | `--auto-serve`, the operator, `/qfai-implement` |
| `.qfai/evidence/prototyping/iter-NN/` | `<screenId>.html` + `.png`, one pair per declared screen | `npx qfai prototyping iterate --capture` | `npx qfai prototyping certify`, the reviewer    |

**The generator never writes the evidence tree.** The `--capture` step
performs the fan-out: it drives a browser to each declared screen's
contract `route`, and writes one HTML snapshot plus one screenshot per
screen into `.qfai/evidence/prototyping/iter-NN/`. `certify` reads only
that tree and hard-fails with "missing HTML for N declared screen(s)"
when a declared screen has no snapshot there.

### N declared screens, one file

A spec declaring N screens is satisfied by **one** `index.html`
containing N client-side routes — not N files. Each declared screen
must be reachable at its own contract `route`, so the capture step can
navigate to it and snapshot it independently. This is what "all
declared spec screens reachable" above means operationally.

**Which routing shapes the capture step can actually reach.** Capture
navigates to `new URL(<contract route>, <target url>)` and treats any
HTTP status >= 400 as a failed screen, writing no evidence. What the
target server does with that URL therefore decides the routing shape:

- `--auto-serve` starts the built-in static file server, and its
  routing is SPA-style: a document request (GET/HEAD whose `Accept`
  includes `text/html`) that matches no file under the served directory
  is served that directory's `index.html` instead of 404 — when the
  directory holds one, which the single-file envelope below guarantees
  and a skeleton-only tree does not. So **path routes**
  (`/settings`), a `history.pushState` shell and parameterized contract
  routes (`/pairs/:instrument`, `/reports/:reportId`) all resolve —
  declare the contract `route` values the product needs and let the
  shell route client-side.
- **Hash routes** (`/#/settings`) still work, since the browser never
  sends the fragment, but they are no longer needed to reach a screen
  under `--auto-serve`. Do not reshape a contract `route` into one.
- The fallback covers documents only. Sub-resource requests (`.css`,
  `.png`, `fetch()`) carry no `text/html` in `Accept`, so a genuinely
  missing asset still 404s instead of receiving an HTML body, and the
  path-traversal 403 guard runs ahead of the fallback.
- The fallback needs an `index.html` to fall back _to_. Per-screen files
  (`--emit-skeletons`, below) write `<screenId>.html` and no
  `index.html`, and the static server resolves a URL to a literal path
  before it falls back — it does not append `.html`. So in a
  skeleton-only cycle-0 tree `/settings.html` serves that screen's
  skeleton while `/settings` still **404s** and loses that screen's
  evidence; `/settings` only reaches the fallback once you author an
  `index.html` alongside the skeletons. `htmlSourceCopy` changes nothing
  here: it runs after the capture has already navigated successfully.

Keep the contract `route` values as the product needs them. Against a
server other than `--auto-serve`, match the routing shape to what that
server does with an unknown path.

Opt-in **seed aid**, not an alternative output shape:
`npx qfai prototyping iterate --emit-skeletons` (cycle 0 only) writes one
placeholder `.qfai/prototypes/iter-00/<screenId>.html` per declared
screen, and the `htmlSourceCopy` capture option likewise operates on
per-screen files. Neither writes an `index.html`.

An accepted iteration must still carry `iter-NN/index.html`: Handoff
below copies it to `.qfai/prototypes/final/index.html`, and without it
`/qfai-implement` has nothing to read. So consolidate the skeletons into
the single-file envelope before the loop converges — including when a
cycle-0 skeleton set scores well enough that cycle 1 would otherwise
accept it as it stands. If you keep the per-screen files because your
capture routing needs them, author `index.html` alongside them so the
accepted iteration carries both.

### Handoff

`.qfai/prototypes/final/index.html` is a copy of the accepted
`iter-NN/index.html` and is the deliverable `/qfai-implement` reads.
It is not a certify input; certify never opens the `prototypes/` tree.

## Cycle 0 (seed)

Produce one self-contained `iter-00/index.html` that satisfies the spec
under locked DESIGN.md tokens. Lead with the user's primary task;
respect `audience.do_not_look_like`.

## Cycles 1..9

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
