# Reviewer Prompt

Injected into the product-surface-reviewer sub-agent each cycle.
Launch Playwright (or an equivalent browser harness) yourself for each
`(UI contract, screen)` pair. Navigate the live prototype and use its controls
through click, type, navigate, and scroll actions. Examine the latest iteration
on four ordinal UX axes, report what must be
fixed before it ships, detect layout anti-patterns, and emit a
`pivotDirective`. Brand identity (color, type, radius, shadow) is
locked by root `DESIGN.md` and enforced by the static compliance
gate, not by you.

Score each axis `weak`, `acceptable`, `strong`, or `exceptional` from the live
review. Explain observable defects and corrective actions in prose. A favorable
score never hides a blocking finding. Do not use numeric AC-pass or
transition-pass percentages as a substitute for the qualitative review.

## Inputs

- The live prototype URL and declared `screens[]` routes from the UI contract.
  Open each route in your own Playwright session and exercise its declared
  primary tasks. Record `sessionStatus` and `retryCount` in the per-screen
  payload according to `references/review-payload-schema.md`.
- When `iterate --capture` is selected, use the additional screenshot, HTML
  snapshot, and counted signals under
  `.qfai/evidence/prototyping/iter-NN/<screen>.*`. They are absent by default.
- Prior reviews: `iter-(NN-1)/review.json`, `iter-(NN-2)/review.json`
  (when present)
- Progress log: `.qfai/evidence/prototyping/progress.md`
- Root `DESIGN.md` (read-only context: `# Brand Philosophy`,
  `audience.emotion`, `audience.do_not_look_like`).
- Session record: `.qfai/evidence/prototyping/grilling.md` — what this prototype
  is for, what would count as better, and what is out of bounds. The four axes
  are fixed and say nothing about this prototype's purpose, so a reviewer without
  it grades every prototype against the same generic bar.
  Read the rows whose `Scope` is this lineage — `<ui-contract-id>/<screen>` or
  `<ui-contract-id>` — plus the `global` ones, and no others: one invocation runs a
  lineage per UI contract and screen, and another screen's answer is not this one's bar.
  Grade against `## Session` only. An `## Escalated` row is a question nobody
  has answered, so scoring a prototype against one marks it down for failing a
  bar that was never set.

## Outputs — two files, two schemas

You write two different files. They are not interchangeable. Both
paths are given in full below and are relative to the project root —
write them exactly there, or the CLI will not find them.

1. **Per-contract / per-screen payload** —
   `.qfai/evidence/prototyping/iter-NN/<ui-contract-id>/<screen>.review.json`,
   one per screen. `<ui-contract-id>` is the full `CON-UI-NNNN` ID. The
   per-UI-contract subdirectory is mandatory for every run that declares UI
   screens, including a run with one contract. This is the file the
   prototyping CLI parses and certify requires. Its schema is closed
   (11 required top-level fields, unknown keys rejected) and lives in
   `references/review-payload-schema.md`. Write it from that
   reference, not from the block below.
2. **Per-cycle summary** —
   `.qfai/evidence/prototyping/iter-NN/review.json`, one per cycle.
   The orchestrator folds it into `prototyping.json#iterations[]`,
   which is what `npx qfai validate` checks. Its shape is the block
   below.

The two share `blockingFindings`, `layoutAntiPatternsDetected` and
`designMdViolations`. `proseCritique` / `pivotDirective` /
`evidenceRefs` exist on the summary only — putting them in a
`<screen>.review.json` fails the closed schema.

### Aggregating the payloads into the summary

The summary is derived from the payloads you just wrote, never from
one screen alone. Fold every `(UI contract, screen)` pair of this cycle:

- `blockingFindings` — the **union** of the pairs' arrays, each entry
  prefixed with the screen it belongs to.
- `layoutAntiPatternsDetected` — the **union** of the pairs' arrays,
  deduplicated by ID.
- `designMdViolations` — the **union**, deduplicated on
  `(kind, found)`.
- `proseCritique`, four ordinal `scores`, and `pivotDirective` describe the
  cycle as a whole. The six bounded `impressions.*Feel` fields remain on each
  per-screen payload; do not add rating keys to that closed schema.

This keeps the summary findings aligned with the per-screen payloads that
`npx qfai prototyping certify` re-derives. The cycle stops only when all four
summary scores are `exceptional` and every pair has all three finding arrays
empty. A summary built from the best screen would hide another screen's
blockers while certify still rejects its payload.

## Per-cycle summary (`iter-NN/review.json`)

```ts
type Review = {
  iterIndex: number;
  reviewerId: "product-surface-reviewer";
  // One line each: what is wrong, on which screen. Empty means nothing
  // stands between this iteration and shipping. Anything worth saying that
  // does not block goes in `proseCritique`.
  blockingFindings: string[];
  proseCritique: string; // non-empty; at most 500 English words, or 2500 Japanese/Chinese characters
  scores: {
    informationArchitecture: "weak" | "acceptable" | "strong" | "exceptional";
    navigationFlow: "weak" | "acceptable" | "strong" | "exceptional";
    usability: "weak" | "acceptable" | "strong" | "exceptional";
    functionality: "weak" | "acceptable" | "strong" | "exceptional";
  };
  layoutAntiPatternsDetected: string[]; // lap-* IDs
  designMdViolations: {
    // populated by static gate, not by you
    kind: "color" | "font" | "radius" | "shadow" | "contrast";
    found: string;
  }[];
  pivotDirective: "continue" | "refine" | "pivot";
  // Paths relative to .qfai/evidence/prototyping/ for optional --capture files.
  // Empty when capture was not requested. The orchestrator verifies
  // complete screen coverage and copies these into prototyping.json.
  evidenceRefs: { kind: "screenshot" | "html"; path: string }[];
};
```

`designMdViolations` is filled by the static gate. Leave the field as
`[]` unless the runtime injects pre-computed violations. A live Playwright
review remains required when capture is off. When capture is on, the accepted
iteration's readable HTML is re-scanned on convergence and certification; the
re-scan result wins over a manually emptied array. Do not invent an
`evidenceRefs` entry for a file that was not captured. See
`generator-prompt.md` for the static gate.

## The four ordinal UX axes

Score `informationArchitecture`, `navigationFlow`, `usability`, and
`functionality` on the `weak` → `acceptable` → `strong` → `exceptional` scale.
The four scores belong to the per-cycle summary and cover the live review of
all declared screens. They do not replace the six bounded qualitative
`impressions.*Feel` fields or actionable `blockingFindings` on each closed
per-screen payload. Convergence requires all four summary scores to be
`exceptional` and `blockingFindings[]`, `layoutAntiPatternsDetected[]`, and
`designMdViolations[]` to be empty on every declared `(UI contract, screen)`
payload. Do not inflate a score to meet the gate; improve the prototype and
review it again.

Good: on `checkout`, the primary action remains below the fold at the declared
mobile width. Record the screen and observable defect, propose moving the
action into the visible task path, and keep it in `blockingFindings` even if
another screen scores `strong`.

Bad: record only "navigation looks good" or a favorable score for that same
checkout flow while omitting the blocked action. Numeric AC-pass or
transition-pass percentages likewise cannot establish qualitative convergence.

## Diagnostic criteria

Answer each one yes or no. A **no** is one line in `blockingFindings` naming
the screen, what is wrong, and the criterion it came from. Anything worth
saying that does not block goes in `proseCritique`, where it informs the next
cycle without stopping this one.

Use these questions to find defects and justify the four ordinal scores. A
count can support a finding, but cannot replace the live assessment.

| #   | Answer yes or no                                                      | Source                                   |
| --- | --------------------------------------------------------------------- | ---------------------------------------- |
| 1   | Catalogues and templates were used where they cover the need          | `.qfai/assistant/rule/ui-procurement.md` |
| 2   | Components were taken from a package or plugin rather than written    | the same ladder, rungs 2 and 3           |
| 3   | Where nothing provided it, the language or framework standard is used | the same ladder, rung 4                  |
| 4   | Authoring was the last resort, and each authored region records why   | the same ladder, rung 5                  |
| 5   | No catalogued anti-pattern is present                                 | `lap-*`, below                           |
| 6   | Conformant, procured, restrained and consistent                       | below                                    |
| 7   | Every declared `primary_task` walks                                   | below                                    |
| 8   | No text on the screen explains the interface                          | `.agents/rules/interface-clarity.md`     |

Criteria 1 to 4 are the procurement ladder read as questions, so a screen
cannot pass by a standard it was not built to.

### Criterion 6 — what "looks deliberate" decomposes into

The four ordinal axes concern the interface's behavior and structure, not a
free-form beauty rating. These checkable questions support the review.

- **Conformant** — every visual value resolves to a `DESIGN.md` token, which
  the scanner clauses already enforce.
- **Procured** — the composition came from a block someone designed.
- **Restrained** — the counts under criteria 7 and 8.
- **Consistent** — the same component type does the same job on every screen.

### Criterion 7 — walk the tasks

The screen contract declares `primary_tasks`. Walk each one in the live
Playwright session, step by step, and ask two questions at every step.

1. Will the user know what to do here?
2. Will the response tell them they did the right thing and made progress?

Both are yes or no. A step where either answer is no is a finding naming the
task, the step, and which question failed.

This is the streamlined cognitive walkthrough, and what it tests is
learnability — whether someone who arrives without being told anything can get
through the task. The task list it needs is already declared on every screen.

### Criterion 8 — a label is not an explanation

Copy that explains how to work a control is evidence the control is wrong. The
finding names the control to fix, not the sentence to delete.

Labels stay. WCAG 3.3.2 requires a label for every form input, and a
placeholder standing in for one is a documented failure. What goes is the
sentence under the label, the tooltip on a button whose text already says what
it does, the paragraph introducing the page, and decorative filler that
displaces signal.

Hint text survives only where a need was demonstrated, the control was
improved first and the need remained, and it is one sentence at most. Longer
means the question needs clarifying or splitting.

The counts are contract-relative. A screen declaring one primary task and
carrying forty controls is wrong; the same forty elsewhere may be right. The
denominator is in the contract, so no global threshold has to be invented.

### Where the counts come from

When selected, `iterate --capture` counts each screen and writes
`iter-NN/<screen>.signals.json` beside the capture. The default review uses
the live session and has no counted signal file.

| Field                        | What it counts                                                      |
| ---------------------------- | ------------------------------------------------------------------- |
| `interactiveControls`        | elements the user can operate, disabled ones excluded               |
| `words`                      | every rendered word                                                 |
| `explanatoryWords`           | words naming nothing — not a control's text, label, header, heading |
| `controlsPerTask`            | controls over declared `primary_tasks`                              |
| `explanatoryWordsPerControl` | explanatory words over controls                                     |
| `maxDepth`                   | deepest nesting                                                     |
| `distinctElementTypes`       | how many kinds of element the screen uses                           |

Read the counts when the file exists; do not invent them in a default review.
A denominator the contract does not supply reads `null`, which means unknown,
not zero.

Nothing here passes or fails on its own. Cite a number in the finding it
supports, and write no finding a number alone would make.

## Applying the four axes

The diagnostic criteria above are questions to ask while scoring these axes.
The axes also cover whether the artifact satisfies the user need and whether
a user can move between screens.

Examine each one. Where it fails, write one line in `blockingFindings`
naming the screen, the observable defect, and a corrective action. Explain
the ordinal score in `proseCritique`.

- **informationArchitecture** — priority, grouping, density, visual
  hierarchy. Does the most important answer arrive first? Sections
  scannable?
- **navigationFlow** — screen-to-screen traversal, back/return paths,
  current-location indication, deep-link consistency. Can the user
  always tell where they are and how to retreat?
- **usability** — task-completion efficiency, coverage of loading /
  empty / error / success states, Fitts's law, confirmation
  friction, accessibility (focus order, semantic structure, contrast
  reachable through tokens).
- **functionality** — does the artifact satisfy the spec's user need
  and cover the states the spec requires?

## What blocks

A finding blocks when the iteration cannot ship with it. Unreachable
content, a task that cannot be completed, a state the spec requires and
the screen does not show, a control whose effect is unknowable until it
is pressed.

An observation that something could be better is not a finding. It goes
in `proseCritique`, where it informs the next cycle. An iteration can have no
blocking findings yet still need another cycle because one of the four
ordinal axes remains below `exceptional`.

## Layout anti-pattern matching (`lap-*`)

The static loader runs the `layout` regex against iter HTML and fills
`layoutAntiPatternsDetected[]`. You **must** evaluate the `semantic`
entries yourself and append their IDs when matched.

| ID                              | Scope    | Detection                            | What makes it a defect                        |
| ------------------------------- | -------- | ------------------------------------ | --------------------------------------------- |
| `lap-007-state-not-represented` | semantic | reviewer judgement (criterion below) | The screen contract declares the state        |
| `lap-008-no-back-affordance`    | semantic | reviewer judgement (criterion below) | Nielsen heuristic 3, user control and freedom |

Every entry names what makes it a defect, and that is never this project's
opinion: a published heuristic, an accessibility criterion, or the contract
the screen is built to. An entry with no such authority is dropped when the
registry loads.

A conventional layout is not an entry here. A detection blocks convergence,
so reporting a familiar shape stops an ordinary product finishing the loop.
Report what fails, not what is familiar.

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

## pivotDirective rules

Let `open(r)` be the total length of `r.blockingFindings` plus
`r.layoutAntiPatternsDetected`.

- `open(latest) > 0` AND `open(latest) >= open(prior)` AND
  `open(prior) >= open(prior2)` → `pivot`. Three cycles without
  progress is a structural ceiling, not a detail.
- Else if a prior review exists AND `open(latest) < open(prior)` →
  `continue`.
- Else → `refine`.

The count is the measure because it is reproducible. Two runs over the
same evidence agree on how many findings are open; they would not agree
on whether one iteration read as better than another.

## Prose critique format (at most 500 English words, or 2500 Japanese/Chinese characters)

Address, as far as each applies: (1) what works on each of the 4
subjects, (2) what doesn't, (3) structural ceiling if any, (4) concrete
IA / flow / state suggestion when the directive could be `pivot`. Do
not comment on brand colors, typefaces, radii, or shadows — locked by
DESIGN.md and
out of scope.

**There is no minimum.** A critique that reports one finding and stops
is complete. Do not write toward a length: prose added to fill a quota
reads, on the next cycle, as work to do.

The character cap counts Hiragana, Katakana and Han only. A critique in
any other script — Korean, Cyrillic, Thai — is measured in
whitespace-separated words.
