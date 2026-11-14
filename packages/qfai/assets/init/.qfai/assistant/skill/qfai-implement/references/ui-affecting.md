# UI Affecting Examples

## Inputs

Read the UI surface paths `uiux.surfacePaths` declares in qfai.config.yaml, and resolve paths.contractsDir from the same file. Read every UI contract under its ui/ directory, and the root DESIGN.md if present for the brand tokens.
When a prototyping loop ran in this checkout, read its handoff at .qfai/prototype/final/handoff.json: the final prototype, its procurement and the implementation notes, or, for a restyle, its live routes, its stylesheet and motion entry points and the implementation notes.
When `.qfai/prototype/progress.md` records `iterationKind` `restyle` with `restyleLevel` `none` and no handoff was written, the restyle stopped with nothing to fix: implement makes no change to the screens it covered.
Read the flow, story, acceptance criterion, and example that the implementation changes.

## Plain text in UI source

`npx qfai validate` reads `.qfai/prototype/final/index.html`, the `index.html` of the latest `iter-NN/`, and the
`.html`, `.tsx`, `.jsx`, `.vue` and `.svelte` files `uiux.surfacePaths` selects, except test, spec and story
files. A plain text there is a literal text node, non-empty after trimming and sample data included, outside
`h1`-`h6`, `label`, `button`, `a`, a component whose name ends in the word `Link` or `Button` (such as `Link`,
`ButtonLink`, `router-link` or `SubmitButton`), `legend`, `th`, `caption`, `option`,
`summary`, `title`, `script`, `style` and an element with `role="alert"` or `role="status"`. Attribute values
and expressions are never plain text; a string literal that is a whole JSX child is.

Each plain text needs a reason comment directly before it, or before its parent element, with only whitespace
between. A missing reason is `QFAI-UITEXT-001` and a malformed one `QFAI-UITEXT-002`; `QFAI-UITEXT-003` means a `.tsx` or `.jsx` file is selected but `typescript` cannot be resolved from the project root. All three are errors and cannot be waived.

This section is the one copy of the procedure for a plain text; other documents point here. For each plain
text, ask first whether the user needs it at that point:

- A text that tells the user a result, a cost, a condition, a consequence, a destination, a recovery step or
  what to do next on an empty screen is needed. Keep it and write its reason.
- For any other text, try these in order:
  1. Delete it.
  2. Replace it with another component: an icon with an accessible name, a disabled state, a badge.
  3. Move its job to an element already there: a label, a heading, the button wording, the empty state.
  4. If none of these works without losing what the user needs, the text is needed after all: keep it and
     write its reason.

```html
<!-- qfai-text: why=the fee is charged only on this step; without=users pay a fee they never saw -->
<p>A 2% fee applies to card payments.</p>
```

```tsx
<section>
  {/* qfai-text: why=the fee is charged only on this step; without=users pay a fee they never saw */}
  <p>A 2% fee applies to card payments.</p>
</section>
```

Vue and Svelte use the HTML form. Both keys are required and non-empty, no other key is allowed, and `why` and `without` must say different things. The reason names the specific failure the text prevents; "helps the user" is not a reason.

## Routing

An example is UI affecting when its observed behavior includes a rendered surface, it changes a UI contract, its
production or test change implements behavior described by a UI contract, or a changed path matches a declared UI
surface path. Follow imports, component use, and contract references to check a changed path. A change to a shared
component is UI affecting when a rendered surface consumes it.

If `uiux.surfacePaths` is absent or the path relationship is uncertain, use the observed
behavior and UI contracts; route an unresolved case as UI affecting and record the uncertainty for
product-surface-reviewer. Do not infer that a change has no UI effect from its directory name alone.

## Evidence

For a UI affecting example, report the screen state, action, expected and observed result, and a capture or rendered artifact. The artifact must identify the source revision. In the review that reads the change, product-surface-reviewer judges each UI affecting example, its UI contracts, and its captured state. The review verdict refers to that revision.

A fix made for a finding of that review refreshes the capture it changes, and a fix that changes behaviour gets its one focused re-review (`.qfai/assistant/rule/review-convergence.md#one-review`). A passing code test cannot substitute for the visual and interaction evidence that the acceptance criterion requires.

Capture each declared task at a desktop width and a narrow width, in the normal state and in every declared empty, error, loading and success state the screen has.
