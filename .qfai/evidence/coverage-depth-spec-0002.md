# Coverage Depth Matrix — spec-0002

## Scope

This matrix scores the spec-0002 pack as option 1 of `CR-20260912-0003` leaves it. That option
narrows two rules to the product: discussion ranks no screen exploration and finalizes no design
system, and the brand direction it records is the user's choice; `prototyping.yaml` is optional for a
pack with a visual prototyping surface, a cli-only pack carries none, and readiness requires it of no
pack.

The obligation set is read in full from `02_User-stories.md` and `06_Test-Cases.md`:

- seven active user stories — `US-0002-0001`, `-0002`, `-0003`, `-0005`, `-0008`, `-0009` and
  `-0010`. None carries a `- x-qfai-status: planned` meta line, so each owes an E2E acceptance test
  and owns a row;
- five active test cases — `TC-0002-0001`, `-0008`, `-0009`, `-0010` and `-0011`, all at `Level: L3`,
  none declaring a `Type`, so each owes the normal path;
- four active business rules in `04_Business-Rules.md` — `BR-0002-0001`, `-0008`, `-0009` and `-0010`.
  None carries a retiring status, so each owns a row of the business rule table.

`US-0002-0004`, `-0006` and `-0007`, and `TC-0002-0002` … `-0007` with their rules and examples,
are retired and have no row. The pack references no `CON-API-*` or `CON-DB-*` contract, so no
contract-derived failure is scored.

**A `US-*` row is scored against the tests that declare the story.** Where behaviour under a story
is exercised at another layer, that coverage is scored on the `TC-*` row whose obligation it
discharges, and the story row says so. Reading it into the story as well would report an E2E
obligation as met by a layer that holds no test for it.

**Failure-side cells follow the kept-failure scope** of
`.qfai/assistant/skills/qfai-atdd/references/test-case-depth-checklist.md`. The pack declares two
kept failures, and one is observed:

| Kept failure                                                                            | Declared or observed by                                           | Owning row     |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------- |
| A pack missing a required file is reported                                              | `BR-0002-0001`, whose Notes name `QFAI-DPACK-002`; `AC-0002-0001` | `TC-0002-0001` |
| A UI-bearing pack that marks one screen exploration final is refused completion         | `EX-0002-0009`                                                    | `TC-0002-0009` |
| A UI-bearing pack missing a canonical sidecar raises `UIX-VAL-3LAYER-INCOMPLETE-FAMILY` | observed by the cases of the file annotated with `TC-0002-0010`   | `TC-0002-0010` |

No `AC-*` in this pack carries a story reference, so no chain reaches a `US-*` row. Every story's
`Error path` is therefore `n/a`, and each names the failure it does not own below.

Committed, because it is a governance record. "Every `❌` cell, named" enumerates all 41 `❌` cells so
that "one justification per `❌`" is checkable, and "Every `⚠️` cell, named" does the same for all 19
partial scores.

## What was measured, and how

Every test-case score rests on a test that was located in the tree by reading the tests, not the
ledger's `Test file` column, and then executed. Each file was run on its own from `packages/qfai`
with `NO_COLOR=1 node node_modules/vitest/vitest.mjs run <file> --reporter=dot`:

| File                                                                         | Result    |
| ---------------------------------------------------------------------------- | --------- |
| `packages/qfai/tests/core/sddPreflight.test.ts`                              | 23 passed |
| `packages/qfai/tests/validators/uix/threeLayer.test.ts`                      | 10 passed |
| `packages/qfai/tests/integration/validatorConvergenceIntegration.test.ts`    | 7 passed  |
| `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts` | 24 passed |
| `packages/qfai/tests/e2e/discussionHardeningE2E.test.ts`                     | 2 passed  |
| `packages/qfai/tests/e2e/spec0002PlannerFirstE2E.test.ts`                    | 1 passed  |
| `packages/qfai/tests/assets/assets.test.ts`                                  | 94 passed |
| `packages/qfai/tests/assets/sddStage0PrototypingOptional.test.ts`            | 12 passed |
| `packages/qfai/tests/assets/designDirectionInterview.test.ts`                | 12 passed |
| `packages/qfai/tests/integration/sddOptionalArtifactPreflight.test.ts`       | 3 passed  |

The last file holds `spec-0013` cases. It is read here only for the readiness clause of
`BR-0002-0010`, and it discharges no spec-0002 row.

This command exits 1:

```sh
node packages/qfai/dist/cli/index.cjs validate --profile atdd --fail-on error --spec spec-0002 --format text
```

All nine errors are `QFAI-TEST-003` findings in spec-0004 and spec-0006 test
files. The spec-0002 finding is `QFAI-ATDD-119`, which reports nine obligations as covered by an
annotation carrier only:

- `US-0002-0001`, `-0002`, `-0003`, `-0008`, `-0009` and `-0010`;
- `TC-0002-0001`, `-0009` and `-0011`.

`US-0002-0005`, `TC-0002-0008` and `TC-0002-0010` are not in that list. The configured scan now
reaches `packages/*/tests/**`, so what keeps the other nine carrier-only is where their tests sit and
whether they carry an annotation, not the scan root (see Findings).

**Mutation statements rest on reading.** No source or asset file was edited in this pass. Every
statement below that a case "fails when X is removed", or "passes with X removed", comes from reading
the code path the case calls, not from a mutation run.

## The matrix

`Status` is the row verdict:

- `✅` — every scored cell is `✅` or `n/a`, and the obligation is not reported carrier-only;
- `⚠️` — a passing test discharges the obligation's expected result, but a cell is `⚠️` or `❌`, or
  the obligation is reported carrier-only;
- `❌` — no test discharges the obligation's expected result.

| US/TC ID     | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| ------------ | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| US-0002-0001 | ❌                     | ❌          | n/a        | ❌         | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| US-0002-0002 | ❌                     | ❌          | n/a        | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0002-0003 | ❌                     | ❌          | n/a        | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |
| US-0002-0005 | ⚠️                     | ✅          | n/a        | ⚠️         | n/a             | n/a            | n/a               | ⚠️            | ⚠️              | ⚠️     |
| US-0002-0008 | ❌                     | ❌          | n/a        | ❌         | n/a             | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0002-0009 | ❌                     | ❌          | n/a        | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |
| US-0002-0010 | ❌                     | ❌          | n/a        | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |
| TC-0002-0001 | ⚠️                     | ✅          | ✅         | ⚠️         | ⚠️              | ❌             | n/a               | ⚠️            | ✅              | ⚠️     |
| TC-0002-0008 | ✅                     | ✅          | n/a        | ✅         | n/a             | n/a            | n/a               | ✅            | ⚠️              | ⚠️     |
| TC-0002-0009 | ⚠️                     | ⚠️          | ✅         | ⚠️         | n/a             | n/a            | n/a               | ❌            | ✅              | ⚠️     |
| TC-0002-0010 | ⚠️                     | ✅          | ✅         | ❌         | n/a             | ❌             | n/a               | ⚠️            | ⚠️              | ⚠️     |
| TC-0002-0011 | ✅                     | ✅          | n/a        | ✅         | n/a             | n/a            | n/a               | ✅            | ⚠️              | ⚠️     |

Totals across the nine depth columns of 12 rows — 7 stories and 5 test cases, 108 cells:
**✅ 16 / ⚠️ 16 / ❌ 41**, with **n/a 35**.

Only the mark cells are scored. `US/TC ID` holds an identifier and `Status` holds the row verdict, so
neither is in that total. Over the same 12 rows the verdicts read **✅ 0 / ⚠️ 6 / ❌ 6**.

Where `n/a` stands, the category's own obligation is absent for that row:

- `Error path` on every story — no chain reaches a story (see Scope). On `TC-0002-0008` and
  `TC-0002-0011`, the row's example is a happy case and its acceptance criterion names no failure.
- `Boundary values` — no row but `TC-0002-0001` and `US-0002-0002` has a numeric, date, length or
  ordered domain. The first has a file count; the second has a count of open questions that must
  reach zero.
- `Special values` — the wording rows read fixed shipped documents, and `US-0002-0001` and
  `US-0002-0005` take no input that admits one.
- `State transitions` — only `US-0002-0002` (open questions resolved before completion) and
  `US-0002-0008` (a completed discussion handed to SDD) name a progression. Ranking the screen
  explorations happens in prototyping, which another spec owns, so discussion holds one state.
- `Combinatorial` on `US-0002-0001` — the story names one condition.

### Business rule coverage

One row per active `BR-0002-*`. All four rows of the Rule Table in `04_Business-Rules.md` are active,
so none is omitted. `Covering TC` is derived from each rule's `AC-Refs` and from the `BR-Ref` of the
examples the test cases cite.

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                | Status |
| ------------ | ------------- | ------------- | -------------------- | -------------------------- | ------ |
| BR-0002-0001 | ✅            | ⚠️            | n/a                  | TC-0002-0001               | ⚠️     |
| BR-0002-0008 | ✅            | ✅            | ✅                   | TC-0002-0008, TC-0002-0009 | ⚠️     |
| BR-0002-0009 | ✅            | ✅            | ⚠️                   | TC-0002-0010               | ⚠️     |
| BR-0002-0010 | ✅            | n/a           | ⚠️                   | TC-0002-0011               | ⚠️     |

Totals across the three scored columns over 4 rows, 12 cells: **✅ 7 / ⚠️ 3 / ❌ 0**, with **n/a 2**.
Over the same 4 rows the verdicts read **✅ 0 / ⚠️ 4 / ❌ 0**.

`n/a` is used twice, each where the obligation is absent:

- `BR-0002-0001 × Conditional branches` — the rule requires fifteen files unconditionally.
- `BR-0002-0010 × Negative case` — the rule declares no failure. The retired blocking sentence
  appears only in `09_delta.md`'s record of what was rejected, which is history and not a
  declaration.

## Every ❌ cell, named

The matrix carries 41 `❌` depth cells, and the business rule table carries none. Each is named below
with its reason. No Decision Record or Change Request accepts any of them: each is an open gap, and
the ledger row that owes it is named. A row's `❌` verdict is outside the count and is stated once per
row.

### The six stories without an acceptance test

`US-0002-0001`, `-0002`, `-0003`, `-0008`, `-0009` and `-0010` are declared by
`tests/e2e/qfai-traceability.md` and by nothing else. That file is an annotation carrier, not a test,
and `QFAI-ATDD-119` reports all six. Their E2E rows are open at `todo` with no test file:

| Story          | Ledger row |
| -------------- | ---------- |
| `US-0002-0001` | `TDD-0013` |
| `US-0002-0002` | `TDD-0014` |
| `US-0002-0003` | `TDD-0015` |
| `US-0002-0008` | `TDD-0017` |
| `US-0002-0009` | `TDD-0018` |
| `US-0002-0010` | `TDD-0019` |

On each of these rows `Normal path` and `Oracle strength` are `❌` for the same reason: no journey
runs the story, so there is no path taken and no assertion that can fail. The `Status` verdict is
`❌` on all six. The remaining `❌` cells are named per story.

**US-0002-0001 — the fifteen-file pack.** Four `❌`: `Equivalence partitions`, `Normal path`,
`Edge cases`, `Oracle strength`.

- **Equivalence partitions** — a UI-bearing, a cli-only and a non-UI discussion run all owe the same
  fifteen files. None is run.
- **Edge cases** — a run in a project that already holds an earlier pack, where the newest pack is the
  one selected, is untested.
- `Error path` is `n/a`: the missing-file failure `BR-0002-0001` names is owned by `TC-0002-0001`.
- Nearest coverage: readiness over a hand-seeded pack, scored under `TC-0002-0001`. It does not run
  discussion.

**US-0002-0002 — completion waits for zero open questions.** Eight `❌`: every column but
`Error path`.

- **Equivalence partitions** — `open`, `deferred` and resolved dispositions are three partitions of
  the register. None is supplied.
- **Edge cases** — a register with no questions, and a deferred question with no entry in
  `13_Deferred.md`, are untested at this layer.
- **Boundary values** — the story turns on a count reaching zero. One open question against none is
  the boundary, and neither side is exercised.
- **Special values** — a question with no `Disposition:` line, or disposition text outside a
  question block, is not supplied.
- **State transitions** — open, then resolved, then complete is the story's progression. No case
  observes it.
- **Combinatorial** — an open question beside a deferred one is not constructed.
- `Error path` is `n/a`: no active `AC-*`, `BR-*`, `EX-*` or `TC-*` names this story's stop, so the
  stop is the story's own normal path.
- Nearest coverage: `packages/qfai/tests/core/sddPreflight.test.ts` continues SDD on a pack carrying
  a blocking question and lists it. That is the next stage continuing, not discussion stopping.

**US-0002-0003 — UI-bearing detection.** Six `❌`: `Equivalence partitions`, `Normal path`,
`Edge cases`, `Special values`, `Combinatorial`, `Oracle strength`.

- **Equivalence partitions** — UI-bearing visual, cli-only and non-UI classifications are not run
  through a discussion.
- **Edge cases** — a pack with no `surface:` declaration, which `detectSurfaceType` classifies from a
  `uiux/` directory or the Story Workshop, is untested at this layer.
- **Special values** — an absent or malformed classification block is not supplied.
- **Combinatorial** — classification crossed with the state of the sidecar family is not run
  end to end.
- `Error path` is `n/a`: the sidecar-family failure is owned by `TC-0002-0010`.
- Nearest coverage: the classification guard is exercised by the validator cases scored under
  `TC-0002-0010`.

**US-0002-0008 — the handoff to `/qfai-sdd`.** Seven `❌`: every column but `Error path` and
`Boundary values`.

- **Equivalence partitions** — a discussion-pack source against an import-lite source, and a
  complete pack against one with gaps, are not run from a finished discussion.
- **Edge cases** — an older pack pinned with `qfai discussion use`, and a project with no pack, are
  untested at this layer.
- **Special values** — a required file present but below the minimum content is not supplied.
- **State transitions** — a completed discussion becoming a ready SDD input is the story's
  transition. No case runs both stages.
- **Combinatorial** — a missing file, a blocking question and a malformed optional artifact are
  separate gaps that combine in one summary. No journey combines them.
- `Error path` is `n/a`: no active declaration names a handoff failure. No `AC-*` names the handoff
  at all.
- Nearest coverage: `runSddPreflight` is the handoff, and its cases are read under `TC-0002-0001`.

**US-0002-0009 — non-UI safe skip.** Six `❌`: `Equivalence partitions`, `Normal path`,
`Edge cases`, `Special values`, `Combinatorial`, `Oracle strength`.

- **Equivalence partitions** — a non-UI run beside a UI-bearing control is not run end to end.
- **Edge cases** — a non-UI pack that nevertheless carries a `uiux/` directory is untested.
- **Special values** — a pack with no classification, which falls back to content detection, is not
  supplied.
- **Combinatorial** — non-UI crossed with present or absent sidecars, and with present or absent
  `prototyping.yaml`, is not run through `qfai validate`.
- `Error path` is `n/a`: the failure a UI-bearing pack raises is owned by `TC-0002-0010`.
- Nearest coverage: `skips non-UI packs`, scored under `TC-0002-0010`.

**US-0002-0010 — validators aligned with the shipped template.** Six `❌`: `Equivalence partitions`,
`Normal path`, `Edge cases`, `Special values`, `Combinatorial`, `Oracle strength`.

- **Equivalence partitions** — a pack generated from the shipped template, one with legacy headings
  and one with a missing family member are not run through `qfai validate`.
- **Edge cases** — a sidecar mixing current and legacy headings is untested at this layer.
- **Special values** — an empty sidecar file, which the completeness check treats as missing, is not
  supplied.
- **Combinatorial** — family completeness crossed with heading format is not constructed end to end.
- `Error path` is `n/a`: no active `AC-*` covers this story, so no chain reaches it.
- Nearest coverage: `packages/qfai/tests/validators/uix/threeLayer.test.ts` calls the validators
  directly for the legacy, mixed and completeness findings, and
  `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts` ties the skill's family
  list to `CANONICAL_REQUIRED_SIDECAR_FILES`. Neither runs a generated pack through the command.

### TC-0002-0001 — one `❌`

Owed by `TDD-0001`, at `done`.

- **Special values** — a required file that is present but empty, or below the minimum content, is a
  valid special value: the required-file check still counts it present. No case supplies one. The
  fixture helper pads every file so the incomplete-content check never fires.

### TC-0002-0009 — one `❌`

Owed by `TDD-0009`, at `exception` under `DR-0298`.

- **Combinatorial** — the violation crossed with a cli-only pack. The `## CLI Packs` section of
  `discussion-completion-matrix.md` says the unranked-exploration condition applies to a cli-only pack
  unchanged. No test reads that section's condition list, and the list names a condition 7 the
  UI-bearing list does not have (Finding 8).

### TC-0002-0010 — two `❌`

Owed by `TDD-0011`, at `done`.

- **Edge cases** — the classification helper falls back to content detection. No case supplies a
  pack with no `01_Spec.md`, with a `surface:` value outside the known set, or with no `surface:` key.
  A non-UI pack that carries a `uiux/` directory is untested, and so is a non-UI pack carrying a
  forbidden legacy file, which `validateForbiddenLegacyFiles` must skip.
- **Special values** — an empty `01_Spec.md` or an absent classification is not supplied. Every
  fixture writes a well-formed spec file with an explicit surface.

## Every ⚠️ cell, named

16 depth cells in the matrix and 3 scored cells in the business rule table are `⚠️` — 19 in all.
Each is named here with its rationale. The ten `⚠️` verdicts are outside the count and are named too.

### Matrix depth cells

- **US-0002-0005 × Equivalence partitions** — `packages/qfai/tests/e2e/spec0002PlannerFirstE2E.test.ts`
  runs `qfai init` into a temporary directory and reads the installed skill and completion matrix. It
  asserts the UI-bearing partition, and both choosers of the direction: the user, and an assumption
  recorded as `chosen_by: assumption`. The cli-only partition, where no direction is asked, is not
  read by the journey.
- **US-0002-0005 × Edge cases** — the unattended run is an edge and is asserted. The cli-only pack,
  which is UI-bearing and asked no direction, is not.
- **US-0002-0005 × Combinatorial** — unranked explorations and the user's brand direction are read in
  one run of the installed tree. They are not crossed with the surface.
- **US-0002-0005 × Oracle strength** — each regex fails when its sentence is reworded or removed from
  the shipped matrix or skill. The journey checks that the unranked condition is present, not that no
  other condition selects an exploration: a matrix that added "one screen exploration is selected as
  final" would still pass it.
- **TC-0002-0001 × Equivalence partitions** — the complete fifteen and fifteen minus one are
  represented. A required file present but below the minimum content is a partition that should also
  report no missing file, and it is never supplied.
- **TC-0002-0001 × Edge cases** — no pack at all and a non-canonical pack name are covered. A required
  name present as a directory, and an extra file beside the fifteen, are not.
- **TC-0002-0001 × Boundary values** — fifteen and fourteen are exercised. The case declares its own
  list of fifteen names instead of importing `REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES`. A name removed
  from the source list other than `03_Story-Workshop.md`, the one the negative case deletes, would go
  unnoticed.
- **TC-0002-0001 × Combinatorial** — a missing file is crossed with the Story Workshop Mermaid check,
  and the second gap is required not to fire. A missing file with a blocking question, or with a
  deferred entry lacking details, is not crossed.
- **TC-0002-0008 × Oracle strength** — the annotated case checks that the unranked, design-system
  and direction conditions are present, and fails when any of them is reworded. Its title is:
  - `SKILL.md の UI-bearing completion が brand SSOT を要求している`

  It does not check that no other condition selects an exploration. That check runs in the same
  file, in a spec-0010 case that requires every condition naming a direction to name the user's
  brand direction. Its title is:
  - `TC-0010-0006: the completion conditions keep explorations unranked and finalize no design system`

- **TC-0002-0009 × Equivalence partitions** — the violating partition is represented by the blocking
  condition. The compliant partition is asserted in full only by `TC-0002-0008`'s case, and the
  design-system half of the same condition is not asserted here.
- **TC-0002-0009 × Normal path** — the row declares no `Type`, so it owes the normal path. Its case
  reads the condition a compliant pack satisfies, but asserts only that it blocks. The explicit
  normal-path assertions are in `TC-0002-0008`'s case.
- **TC-0002-0009 × Edge cases** — the refusal must not reach a pack whose only recorded choice is the
  brand direction. This case asserts `never pick a single visual winner` but not the brand exception.
  The exception is asserted by `TC-0002-0008`'s case and by
  `packages/qfai/tests/assets/designDirectionInterview.test.ts`, so the two sentences are never read
  together. A near miss, such as an exploration marked preferred rather than final, is not considered.
- **TC-0002-0010 × Equivalence partitions** — non-UI and UI-bearing each have a case with the opposite
  expectation. An unrecognised surface and an absent classification are not supplied.
- **TC-0002-0010 × Combinatorial** — on the surface-declared path the grid is covered: UI-bearing with
  the family absent reports three issues, one member missing reports that member, a complete family
  is silent, and non-UI with the family absent is silent. The content-fallback classification is
  never crossed with anything.
- **TC-0002-0010 × Oracle strength** — `skips non-UI packs` calls
  `validateThreeLayerFamilyCompleteness`. Removing its non-UI guard makes it report three issues, so
  the case fails. The other two cases carrying this obligation's annotation call
  `validateThreeLayerModel` on a non-UI pack with no sidecars. That function skips absent files, so
  both pass with its guard removed (Finding 3). One of them is the case the validator counts from the
  L3 home.
- **TC-0002-0011 × Oracle strength** — the case below requires the exact narrowed sentence in
  `packages/qfai/README.md`, the skill and the artifact rules, and rewording any of the three fails
  it. It cannot see a second, contradicting sentence in the same document.
  - `ensures qfai-discussion skill and artifact rules use canonical pack wording`

  The other annotated case accepts the replaced wording for the artifact rules (Finding 5):
  - `artifact rules and SKILL.md share namespaced-only semantics for prototyping.yaml`

### Business rule table

- **BR-0002-0001 × Negative case** — the missing-file branch is exercised through the preflight, which
  lists `必須ファイル不足` and names the file in its summary. The finding the rule's Notes name,
  `QFAI-DPACK-002`, is asserted by no test (Finding 7).
- **BR-0002-0009 × Conditional branches** — the rule branches on classification, and three functions
  in `threeLayer.ts` carry the guard. Both branches are exercised for
  `validateThreeLayerFamilyCompleteness`. For `validateThreeLayerModel` the non-UI branch has only
  cases that pass without the guard, and `validateForbiddenLegacyFiles` has no non-UI case.
- **BR-0002-0010 × Conditional branches** — the wording branches are asserted: a visual-surface pack
  may include the file, a cli-only pack emits none, and a non-UI pack typically omits it. The
  readiness branch, a pack without the file reaching `ready`, is exercised in
  `packages/qfai/tests/core/sddPreflight.test.ts` on three classifications:
  - a non-UI pack (`does not block when latest non-ui discussion pack omits prototyping.yaml`);
  - a contradictory pack, `ui_bearing: false` and `primary_surface: non-ui` with `web` listed in
    `secondary_surfaces` (`does not block when contradictory non-ui classification omits prototyping.yaml`);
  - a pack with no classification block (`does not block when classification is missing and prototyping.yaml is absent`).

  spec-0013's `packages/qfai/tests/integration/sddOptionalArtifactPreflight.test.ts` adds an
  unclassified pack. No case exercises the branch on a consistent visual-surface classification
  (`ui_bearing: true` with a visual primary surface) or on a cli-only pack, which are the two cases
  the rule's predicate separates (Finding 6).

### Row verdicts

- **US-0002-0005** — the journey passes and discharges the story. Four cells are `⚠️`.
- **TC-0002-0001** — discharged in both directions, with a mutation-sensitive oracle. It is reported
  carrier-only: `packages/qfai/tests/core/sddPreflight.test.ts` carries no annotation and is not in an
  L3 home. One cell is `❌`.
- **TC-0002-0008** — discharged from the L3 home and not carrier-only. It is capped by its oracle cell.
- **TC-0002-0009** — its expected result is asserted, but it is reported carrier-only (Finding 2), and
  one cell is `❌`.
- **TC-0002-0010** — discharged in both directions. It is capped by the oracle split and two `❌` cells.
- **TC-0002-0011** — discharged by the exact sentence in all three documents. It is reported
  carrier-only (Finding 2) and capped by its oracle cell.
- **BR-0002-0001** — positive and negative are exercised with real inputs. The covering case is
  carrier-only, and the named finding is unasserted.
- **BR-0002-0008** — all three scored cells are `✅`. One covering case, `TC-0002-0009`, is
  carrier-only.
- **BR-0002-0009** — positive and negative are covered, and the positive case fails without its guard.
  The conditional cell is `⚠️`.
- **BR-0002-0010** — the wording is held in every document the rule names. The covering case is
  carrier-only, and the conditional cell is `⚠️`.

## Findings

This artifact scores coverage and edits no test, ledger or spec.

1. **Six stories have no acceptance test.** `TDD-0013`, `-0014`, `-0015`, `-0017`, `-0018` and
   `-0019` are at `todo` with no test file. `US-0002-0002` and `US-0002-0008` also have no acceptance
   criterion or test case, so an E2E test is the only coverage either can have.
2. **Three test-case obligations are carrier-only, and the scan root is not the cause.**
   `testFileGlobs` now reaches `packages/*/tests/**`. What remains is placement and annotation:
   - `TC-0002-0001` — `packages/qfai/tests/core/sddPreflight.test.ts` carries no annotation, and
     `tests/core/` is not an L3 home.
   - `TC-0002-0009` — `packages/qfai/tests/e2e/discussionHardeningE2E.test.ts` carries no annotation.
     An L3 test-case annotation there would be a forbidden reference, because the file is under
     `tests/e2e/`. `TDD-0009` records `Layer = integration` against that path.
   - `TC-0002-0011` — `packages/qfai/tests/assets/assets.test.ts` carries the annotation, but
     `tests/assets/` is not an L3 home.
3. **The case that makes `TC-0002-0010` covered cannot fail on the behaviour it covers.** The L3-home
   annotation is in `packages/qfai/tests/integration/validatorConvergenceIntegration.test.ts`. Its
   case `non-UI pack produces zero UIX-VAL issues from threeLayer` calls `validateThreeLayerModel` on a
   pack with no sidecars, which returns nothing with or without the non-UI guard.
   `non-UI skip` in `packages/qfai/tests/validators/uix/threeLayer.test.ts` has the same shape. The
   discriminating case, `skips non-UI packs`, is outside the L3 home. `validateForbiddenLegacyFiles`
   carries the same guard and has no non-UI case.
4. **A test title claims a comparison the test does not make.** The case below, in
   `packages/qfai/tests/assets/assets.test.ts`, reads `SKILL.md` and nothing else:
   - `discussion README and SKILL.md agree on prototyping.yaml optionality`

   The three-document comparison is this case:
   - `ensures qfai-discussion skill and artifact rules use canonical pack wording`

5. **One annotated case accepts the wording the narrowed rule replaced.** The case below checks the
   artifact rules with `/ui-bearing.*may include.*prototyping\.yaml|optional recommendation artifact/i`:
   - `artifact rules and SKILL.md share namespaced-only semantics for prototyping.yaml`

   The sentence that
   offered the file to every UI-bearing pack also matches it. The obligation is still discharged by
   the exact-sentence case, but this case cannot tell the two rules apart.

6. **The ledger names a retained case that does not exist.** The `TDD-0010` reservation in
   `.qfai/specs/spec-0002/tdd/test-list.md`, and the `## Resolution` of `CR-20260912-0003`, say
   `does not block when latest UI-bearing discussion pack is missing prototyping.yaml` stays in
   `packages/qfai/tests/core/sddPreflight.test.ts`. No case with that title exists in the tree. The
   nearest is spec-0013's `does not block when a usable discussion pack is missing prototyping.yaml`,
   on an unclassified pack. `sddPreflight.test.ts` exercises readiness without the file on a non-UI,
   a contradictory and an unclassified pack. No test exercises it on a consistent visual-surface
   classification or on a cli-only pack.
7. **`QFAI-DPACK-002` is asserted by no test.** `BR-0002-0001` names it in its Notes. The same
   missing-file list feeds the preflight gap, which is tested, but the validator finding is not.
8. **The completion matrix cites a condition that does not exist.** The `## CLI Packs` section of
   `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/references/discussion-completion-matrix.md`
   says "Conditions 2, 3, 4, 6 and 7 apply unchanged". The UI-bearing list has six conditions. No test
   reads that section's condition numbers, which is also why the cli-only combination is `❌` under
   `TC-0002-0009`.
9. **Four rows closed under `DR-0298` record no failing run.** `TDD-0008`, `-0009`, `-0012` and
   `-0016` are at `exception` with `RED:n-a`, and their evidence entries say the case passed on its
   first run. `DR-0298` waives the reviewer turns and keeps the requirement that the test fails on an
   assertion first. The oracle cells above name the mutation that would fail each case, from reading;
   none was observed.

## Follow-up this matrix does not discharge

`QFAI-ATDD-133` requires the stage evidence to carry a `## Coverage Depth Matrix` section that links
this file and restates its counted totals. Those totals are:

**✅ 23 / ⚠️ 19 / ❌ 41**, with `n/a 37`, across 120 scored cells — 108 matrix depth cells (12 rows ×
9 columns) and 12 business rule cells (4 rows × 3 columns). The 16 row verdicts are outside them:
✅ 0 / ⚠️ 10 / ❌ 6.

`.qfai/evidence/atdd-spec-0002.md` restates these totals in its `## Coverage Depth Matrix` section.
