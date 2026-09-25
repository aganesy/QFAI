# Coverage Depth Matrix — spec-0002

## Scope

This matrix scores the seven active user stories `02_User-stories.md` declares — `US-0002-0001`,
`-0002`, `-0003`, `-0005`, `-0008`, `-0009` and `-0010` — and the five active test cases
`06_Test-Cases.md` declares — `TC-0002-0001`, `-0008`, `-0009`, `-0010` and `-0011`, all at
`Level: L3` — against the tests that actually discharge them in `packages/qfai/tests/**`. The
obligation set is read from those two files in full, and not from the rows of
`.qfai/specs/spec-0002/tdd/test-list.md`. `TC-0002-0002` … `-0007` were removed from the active
table when the `discussionDesignHardening` validator and the exploration-sidecar family were
retired, so they are not scored; `US-0002-0004`, `-0006` and `-0007` were retired with them
and have no `US-*` block left to score. None of the seven remaining stories carries a
`- x-qfai-status: planned` meta line, so all seven are active and all seven own a row. The business
rule table below carries all four active `BR-0002-*` of `04_Business-Rules.md`; `BR-0002-0002` …
`-0007` were removed in the same retirement, and none of the four remaining rows carries a status
retiring it, so all four own a row.

**A `US-*` row is scored against the files that declare the story**, which is what an annotation
does. One file in `packages/qfai/tests/**` carries a `QFAI:SPEC-0002:US-*` annotation:
`tests/e2e/spec0002PlannerFirstE2E.test.ts` declares `US-0002-0005`, and that row is scored against
it. The other six stories are declared by prose alone. Where the behaviour under one of those six
is exercised, that coverage is scored on the `TC-*` row whose obligation it discharges; reading it
a second time into the story would report an obligation owed to the E2E layer as met by a layer
that holds no test for it.

**The ledger is not a coverage source for this pack, and the matrix does not read it.** A `Status`
column that says `done` over a selector nothing can run is a claim, not a measurement, and Finding 4
records four rows that made that claim. Every test-case score below comes from a test that was
located in the tree and executed.

**One obligation names a behaviour that no longer has an implementation.** `TC-0002-0009` describes
a planner-first violation. The validator that produced it, `discussionDesignHardening`, does not
appear anywhere in `packages/qfai/src/**`; the pack's own notes record that it was retired together
with the exploration-sidecar family. That row carries nine of the nineteen `❌` depth cells the five
test-case rows hold, and the reason is not thin testing — it is an obligation with no subject left
to test. `TC-0002-0008` is not in that position: its steps read the shipped completion conditions,
and an annotated test does exactly that.

Committed, because it is a governance record. Section "Every `❌` cell, named" enumerates all 74 of
them so that "one justification per `❌`" is checkable rather than asserted, and section "Every `⚠️`
cell, named" does the same for all 27 partial scores, which the PASS criterion also requires a
rationale for.

## What was measured, and how

Every test-case score rests on a test run. Eight files were located by reading the tests themselves
rather than the ledger's `Test file` column, and all eight were executed:

| File                                                           | Result                                                                      |
| -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `tests/core/sddPreflight.test.ts`                              | 26 passed                                                                   |
| `tests/validators/uix/threeLayer.test.ts`                      | 10 passed                                                                   |
| `tests/assets/sddStage0PrototypingOptional.test.ts`            | 12 passed                                                                   |
| `tests/assets/designDirectionInterview.test.ts`                | 12 passed                                                                   |
| `tests/e2e/discussionHardeningE2E.test.ts`                     | 2 passed                                                                    |
| `tests/assets/assets.test.ts`                                  | 6 passed (`prototyping.yaml`), 2 (`legacy-permissive`)                      |
| `tests/integration/discussionSkillTemplateIntegration.test.ts` | 1 passed (`SKILL.md の UI-bearing completion が brand SSOT を要求している`) |
| `tests/e2e/spec0002PlannerFirstE2E.test.ts`                    | 1 passed                                                                    |

Two negative results are load-bearing and were checked directly rather than inferred:

1. **`discussionDesignHardening` is absent from the whole package.** A search of
   `packages/qfai/**` returns nothing for that identifier, and `packages/qfai/src/**` contains no
   planner-first emission of any kind. The tests that mention planner-first —
   `tests/assets/designDirectionInterview.test.ts` and `tests/assets/assets.test.ts` — assert that
   wording is present in shipped Markdown. A wording check cannot discharge "a violation is
   emitted".
2. **`packages/qfai/src/**` contains zero occurrences of the string `prototyping.yaml`.** The
   requiredness rule `BR-0002-0010` states has no runtime at all:
   `isPrototypingRequiredForDiscussionPack` in `src/core/discussionPack.ts` ignores its
   classification argument and returns a constant `false`, and `inspectLatestDiscussionPack` assigns
   `const prototypingRequired = false`. The rule lives entirely in guidance prose.

Six story rows rest on a search rather than on a run, because there is nothing to run: no file under
`packages/qfai/**` carries a `QFAI:SPEC-0002:US-*` annotation for them. All seven stories are listed
in `tests/e2e/qfai-traceability.md`, whose opening line states that it is an annotation carrier and
not a test. The `US-0002-0005` row rests on a run of `tests/e2e/spec0002PlannerFirstE2E.test.ts`,
which carries that story's annotation.

### One test that names a behaviour it does not exercise

`tests/validators/uix/threeLayer.test.ts` contains `it("non-UI skip")`, whose title reads as the
safe-skip proof for `TC-0002-0010`. It is not, and nothing else in the pack rests on it either.

It calls `validateThreeLayerModel`, which reads each canonical sidecar with `readSafe` and
`continue`s when the file is absent. Its fixture writes only a non-ui `01_Spec.md` and no `uiux/`
directory, so the zero-issue result comes from the sidecars being missing, not from the
`isUiBearingSpec` guard. Removing that guard leaves all ten cases in the file green. The test cannot
tell the safe-skip behaviour from its deletion.

`it("skips non-UI packs")`, in the same file's second describe block, is the case that
discriminates. It calls `validateThreeLayerFamilyCompleteness`, which pushes one issue per absent
required sidecar; removing that function's identical guard fails it with three issues where zero
were expected. `TC-0002-0010` is scored against that case. `non-UI skip` contributes to no cell in
this matrix.

## The matrix

| US/TC ID     | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| ------------ | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| US-0002-0001 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0002-0002 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0002-0003 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0002-0005 | ⚠️                     | ⚠️          | n/a        | ⚠️         | n/a             | ⚠️             | n/a               | ⚠️            | ⚠️              | ⚠️     |
| US-0002-0008 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0002-0009 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0002-0010 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0002-0001 | ⚠️                     | ✅          | ✅         | ⚠️         | ⚠️              | ❌             | ❌                | ⚠️            | ⚠️              | ⚠️     |
| TC-0002-0008 | ⚠️                     | ✅          | n/a        | ⚠️         | n/a             | ⚠️             | n/a               | ⚠️            | ⚠️              | ⚠️     |
| TC-0002-0009 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0002-0010 | ⚠️                     | ✅          | ✅         | ❌         | ❌              | ❌             | ❌                | ⚠️            | ✅              | ⚠️     |
| TC-0002-0011 | ⚠️                     | ⚠️          | ❌         | ⚠️         | ❌              | ❌             | ❌                | ⚠️            | ⚠️              | ❌     |

Totals across the nine depth columns of 12 rows — 7 stories and 5 test cases, 108 cells:
**✅ 6 / ⚠️ 23 / ❌ 73**, with `n/a 6`.

Only the mark cells are scored. `US/TC ID` holds an identifier and `Status` holds the row verdict,
so neither is in that total. Over the same 12 rows the verdicts read **✅ 0 / ⚠️ 4 / ❌ 8**.

No row reaches `Status = ✅`. Four rows are `⚠️`, and all four are capped by the layer defect
described under Findings:

- `TC-0002-0001` and `TC-0002-0010` are exercised in both directions.
- `TC-0002-0008` and `US-0002-0005` are discharged at the level their steps and story name: shipped
  guidance, read as text. Neither owns a failure case. `US-0002-0005` also leaves the first clause
  of its story unasserted.

`n/a` appears on those last two rows only, and each is explained under the row's own heading.

### Business rule coverage

One row per active `BR-0002-*`. All four rows of the Rule Table in `04_Business-Rules.md` are
active, so none is omitted. `Covering TC` is derived from each rule's `AC-Refs` and from the
`BR-Ref` of the examples the test cases cite, not from the rule's number.

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                | Status |
| ------------ | ------------- | ------------- | -------------------- | -------------------------- | ------ |
| BR-0002-0001 | ✅            | ✅            | n/a                  | TC-0002-0001               | ⚠️     |
| BR-0002-0008 | ✅            | ❌            | ⚠️                   | TC-0002-0008, TC-0002-0009 | ❌     |
| BR-0002-0009 | ✅            | ✅            | ✅                   | TC-0002-0010               | ⚠️     |
| BR-0002-0010 | ⚠️            | ⚠️            | ⚠️                   | TC-0002-0011               | ❌     |

Totals across the three scored columns — `Positive case`, `Negative case` and
`Conditional branches` — over 4 rows, 12 cells: **✅ 6 / ⚠️ 4 / n/a 1 / ❌ 1**.

`BR ID`, `Covering TC` and `Status` hold identifiers and the row verdict, so none of them is in that
total. Over the same 4 rows the verdicts read **✅ 0 / ⚠️ 2 / ❌ 2**.

`n/a` is used once, for `BR-0002-0001`, which states the 15-file requirement unconditionally and so
has no branch to cover. It is not used anywhere an obligation exists and is unmet.

## Every ❌ cell, named

The matrix carries 73 `❌` depth cells and the business rule table carries 1 in its scored columns —
74 in all. Each is named below with its own reason.
A row's `Status` is `❌` when the obligation is not discharged at the depth the case describes; that
verdict is the row's own, is stated once per row, and is not one of the 74.

### The six stories — `US-0002-0001`, `-0002`, `-0003`, `-0008`, `-0009` and `-0010`

Each of these six stories is declared by `tests/e2e/qfai-traceability.md` and by nothing else. That
file says of itself that it is an annotation carrier and not a test. A search of `packages/qfai/**`
finds one `QFAI:SPEC-0002:US-*` annotation, and it declares `US-0002-0005`, which is scored under
its own heading in "Every `⚠️` cell, named".

- **Equivalence partitions**, **Normal path**, **Error path**, **Edge cases**, **Boundary values**,
  **Special values**, **State transitions**, **Combinatorial**, **Oracle strength** — nine cells on
  each of the six rows, 54 in all, each `❌` because the row has no case at any depth. A list
  entry supplies no input, takes no path and carries no assertion that can fail, so `⚠️` would
  overstate every one of them.
- **Status** — `❌` on all six: the obligation is undischarged at the layer that owes it.

What stands beside each story, and why it is scored on a `TC-*` row instead:

- `US-0002-0001` — the story asks for the fifteen-file pack to be produced by a discussion run.
  Nothing drives one. Readiness over a hand-seeded pack is `TC-0002-0001`'s obligation.
- `US-0002-0002` — the story asks that discussion stop until `Disposition: open` is zero, and the
  four active `AC-*` name the fifteen-file structure, the planner-first posture, the non-UI skip and
  the `prototyping.yaml` wording. None names open-question completion, so the story has neither an
  acceptance criterion nor a test case of its own. `tests/core/sddPreflight.test.ts` blocks a
  downstream `/qfai-sdd` start on a blocking open question, which gates the next stage rather than
  stopping this one.
- `US-0002-0003` — the exploration-first sidecars whose requiredness the story's detection was to
  control were retired. The classification that survives is exercised under `TC-0002-0010`.
- `US-0002-0008` — like `US-0002-0002`, no active `AC-*` names the handoff. `runSddPreflight` is the
  handoff, and the cases that drive it are read under `TC-0002-0001`.
- `US-0002-0009` — the safe skip is exercised by `it("skips non-UI packs")` and scored under
  `TC-0002-0010`.
- `US-0002-0010` — the sidecar-family completeness cases in `tests/validators/uix/threeLayer.test.ts`
  cover the validator side, and are scored under `TC-0002-0010` as well.

### TC-0002-0001 — 15 files pass readiness

Discharged by `tests/core/sddPreflight.test.ts` in both directions.
`it("returns ready when latest discussion-pack passes readiness checks")` seeds all fifteen required
files and asserts `status: "ready"` with `blockers` empty; the file's `DISCUSSION_PACK_FILES`
constant holds exactly the fifteen names `REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES` declares.
`it("does not report the Mermaid blocker twice for an absent Story Workshop")` removes one of the
fifteen and requires the `必須ファイル不足` blocker to fire. This row has **two `❌` cells** and no
`❌` in `Status`.

- **Special values** — the one special value this check has is a required file that is present but
  below the minimum-content threshold, which `inspectLatestDiscussionPack` reports separately as
  `incompleteFiles` and the preflight surfaces as `最小内容を満たしていないファイル`. No case in the
  file supplies one. The fixtures deliberately avoid it: `defaultDiscussionPackContent` carries a
  comment saying the content is padded to clear the incomplete check. That branch is never taken.
- **State transitions** — required-file readiness is evaluated once per run; there is no
  incomplete-to-ready progression to observe, and no case establishes one. The file's run-ordering
  cases (summary directory, latest pointer, an older run not overwriting a newer one) are a state
  machine over the summary artifact, not over this obligation.

### TC-0002-0009 — artifact claims a single final winner, planner-first violation emitted

Nothing emits a planner-first violation. `discussionDesignHardening` is absent from
`packages/qfai/src/**` entirely, there is no finding code for the behaviour, and no validator entry
reaches it. Every cell is `❌`, and each is named so the count is checkable:

- **Equivalence partitions** — no artifact is classified as compliant or violating by anything,
  because there is nothing to classify it.
- **Normal path** — the case's own direction is the emission, and no case produces one. This is the
  cell where the difference from `TC-0002-0008` matters: there, wording tests address the posture
  the case names; here, the same wording tests establish that a prohibition is written into
  guidance an agent reads, which is not an emission and cannot be mutated into one.
- **Error path** — detection of the violating artifact is the whole subject and is never run.
- **Edge cases** — an artifact naming a winner in a comment, in a candidate list, or as the brand
  direction the rule's own carve-out permits, are all untested.
- **Boundary values** — no numeric, date, length or ordered domain exists in the obligation, and no
  count of declared winners is exercised.
- **Special values** — no empty, absent or near-miss artifact is supplied.
- **State transitions** — no compliant-to-violating progression is observed.
- **Combinatorial** — the violating condition is never crossed with anything.
- **Oracle strength** — there is no production code whose mutation could redden this row. Deleting
  every remaining planner-first sentence from the shipped skill would fail wording tests that belong
  to `TC-0002-0008`, not this case.
- **Status** — the obligation names a finding that nothing in the product emits. This row should be
  retired or rewritten rather than covered; see Findings.

### TC-0002-0010 — non-UI pack without sidecars, no UI-only blocking issue

Discharged by `it("skips non-UI packs")` in `tests/validators/uix/threeLayer.test.ts`, with the
UI-bearing cases in the same describe block as its control. This row has **four `❌` cells** and no
`❌` in `Status`.

- **Edge cases** — the classification helper `isUiBearingSpec` delegates to
  `isDiscussionUiBearingPack`, documented as surface-primary with a content fallback. No case
  supplies a pack with no `01_Spec.md`, a `surface:` value outside the known set, or no `surface:`
  key at all, so the fallback path is never reached. A non-ui pack that nevertheless carries a
  `uiux/` directory is also untested.
- **Boundary values** — the obligation's input is a nominal classification, not an ordered domain.
  There is no numeric, date or length value to exercise at an edge, and no count sits at a limit.
- **Special values** — no empty `01_Spec.md`, absent classification or unreadable file is supplied;
  every fixture writes a well-formed spec file with an explicit surface.
- **State transitions** — classification happens once and the check follows; there is no transition
  to cover, and none is established.

### TC-0002-0011 — README / SKILL canonical wording for `prototyping.yaml` requiredness

Partly addressed by `tests/assets/sddStage0PrototypingOptional.test.ts`, which runs six predicates
across both shipped trees (`packages/qfai/assets/init/.qfai` and `.qfai`), and by the
`prototyping.yaml` cases in `tests/assets/assets.test.ts`.

**Both surfaces the case names are read.** The five artifacts those tests open are
`packages/qfai/README.md`, the discussion `SKILL.md`, the SDD execution playbook,
`discussion-artifact-rules.md` and `discussion-completion-matrix.md`. Two cases in `assets.test.ts`
read the README: `ensures qfai-discussion skill and artifact rules use canonical pack wording`
requires one requiredness sentence in the README, the skill and the artifact rules alike, and
`keeps package README aligned with discussion completion contract` requires the same sentence in
the README on its own. The file that does not exist is a `README` under
`.qfai/assistant/skills/qfai-discussion/`, which is not the README the rule is about.

One nearby case is mis-titled. `assets.test.ts`'s "discussion README and SKILL.md agree on
prototyping.yaml optionality" reads `SKILL.md` and nothing else, so its title asserts a comparison
it does not make. That is a defect in the title, not a gap in this row's coverage.

This row has **four `❌` depth cells** plus `Status`.

- **Error path** — the tests carry absence assertions over the real artifacts: the retired blocking
  sentence must not appear in the playbook, and legacy-permissive wording must not appear in the
  skill. None plants a violating wording in a fixture and requires the same predicate to fire, so
  the predicates' discriminating power is unestablished.
- **Boundary values** — the obligation has no numeric, date, length or ordered domain. A sentence is
  present or it is not, with no edge between.
- **Special values** — no empty, absent or truncated artifact is constructed; the shipped files are
  read as they stand.
- **State transitions** — reading wording has no state machine, and no multi-step process is
  exercised.
- **Status** — both artifacts the case names exist and both are read, so what caps the row is not a
  missing surface. It is that the case's expected result is that requiredness "matches active rule",
  and the rule has no runtime to match: `src/**` never reads `prototyping.yaml`, and
  `isPrototypingRequiredForDiscussionPack` returns a constant `false` whatever it is given. Every
  covering case checks a sentence for presence, and none compares the sentence with the behaviour.

### The ❌ cells of the business rule table

One scored cell, and the two row verdicts that sit outside the count but still owe a reason.

- **BR-0002-0008 × Negative case** — the rule states that discussion must not finalize a selected
  direction, winning direction or design system. Its negative is an artifact that does finalize one,
  run through something that rejects it. Nothing supplies such an artifact, and nothing would reject
  it if something did.
- **BR-0002-0008 × Status** — the rule's covering cases are `TC-0002-0008` and `TC-0002-0009`. The
  first is discharged at the level its steps name: an annotated test reads the shipped completion
  conditions and finds the rule stated in them. The second names an emission with no emitter. The
  positive direction is asserted and the negative is not.
- **BR-0002-0010 × Status** — the rule's own Notes name "README / SKILL canonical wording" as the
  surface it governs. Both halves of that surface exist and are asserted, so the gap is on the other
  side of the rule: `src/**` never reads `prototyping.yaml`, and
  `isPrototypingRequiredForDiscussionPack` returns a constant `false` whatever it is given. Nothing
  at runtime acts on the requiredness the wording states.

## Every ⚠️ cell, named

23 depth cells in the matrix and 4 scored cells in the business rule table are `⚠️` — 27 in all. The
PASS criterion requires a documented rationale for each, so each is named here. Six rows also carry
a `⚠️` verdict. Those are outside the count and are named here too, because a verdict weaker than
the cells beneath it needs a reason of its own.

`US-0002-0005` and `TC-0002-0008` have no `❌` cell, so each is scored in full under its own heading
below, including its `Status` and the reason for each `n/a`.

### US-0002-0005 — planner-first design authoring

`US-0002-0005` is discharged in part by `tests/e2e/spec0002PlannerFirstE2E.test.ts`, which carries
`QFAI:SPEC-0002:US-0002-0005`. Its one case runs `qfai init` into a temporary directory and reads
the discussion `SKILL.md` and `discussion-completion-matrix.md` that init installs. In the matrix's
`UI-bearing Packs` section it requires:

- the line `Completion is blocked until all are true:`;
- the condition that carries the explorations unranked, with no single screen exploration selected;
- the design system left unfinalized;
- the brand direction recorded at `01_Context.md#Design Direction`, with `chosen_by: assumption` on
  a direction taken without the user.

In `SKILL.md` it requires the planner-first sentence and the statement that the published theme is
the user's decision. The case passes. This row has **six `⚠️` cells** and no `❌`.

`US-0002-0005` has three `n/a` cells, each with no obligation behind it:

- **US-0002-0005 × Error path** — `n/a`: the one failure the pack declares for this rule is a pack
  that marks one screen exploration final and is refused completion, in `EX-0002-0009`. Only
  `TC-0002-0009`'s `EX-Ref` reaches it, so that row owns it.
- **US-0002-0005 × Boundary values** — `n/a`: the story has no numeric, date, length or ordered
  domain.
- **US-0002-0005 × State transitions** — `n/a`: the story states what discussion carries. Ranking
  the explorations is prototyping's work, so no transition happens inside this story.

The scored cells:

- **US-0002-0005 × Equivalence partitions** — the UI-bearing pack with a visual prototyping surface
  is represented: the case reads the `UI-bearing Packs` section. A cli-only pack is UI-bearing too,
  and `## CLI Packs` keeps the unranked condition for it while dropping the brand direction. The case
  never reads that section, so the partition in which discussion records no brand direction has no
  representative.
- **US-0002-0005 × Normal path** — the story makes three commitments, and two are asserted: the
  screen explorations are carried unranked, and the only direction recorded is the brand direction
  the user chose. The first commitment, that discussion defines exploration conditions and
  anti-goals, has no assertion.
- **US-0002-0005 × Edge cases** — the edge this layer adds is covered: the case reads the tree
  `qfai init` writes rather than the package source, so a template that failed to install fails it.
  A missing `UI-bearing Packs` heading yields an empty section and fails the first assertion rather
  than passing vacuously. The tree an upgrade rewrites into an existing project is not read.
- **US-0002-0005 × Special values** — the one variation shipped Markdown is exposed to is
  rewrapping. The matrix assertions match `\s+` between words, so a rewrapped condition still
  passes. The two `SKILL.md` assertions match literal spaces, so rewrapping either sentence fails the
  case with no change of meaning.
- **US-0002-0005 × Combinatorial** — two documents are crossed: the case requires the skill and the
  completion matrix to state the same posture. The surface is never crossed with the conditions:
  which of them a cli-only pack keeps is not asserted.
- **US-0002-0005 × Oracle strength** — each assertion has a production mutation that reddens it:
  deleting condition 4 or condition 5 from the shipped completion matrix, or the user's-decision
  sentence from `SKILL.md`. Three weaknesses keep it off `✅`. Only presence is asserted, so a
  condition added beside the others that selects one exploration leaves the case green. Apart from
  the blocking line, the matrix phrases may match anywhere in the section, including the prose after
  the numbered conditions. And `/Discussion is planner-first/` matches two lines of the installed
  `SKILL.md`, so deleting either one changes nothing.
- **US-0002-0005 × Status** — no cell is `❌`. The row is capped at `⚠️` because the story's first
  commitment has no assertion, and because the case sits under `packages/qfai/tests/e2e/`, outside
  the scanned `tests/` root, so its annotation discharges nothing in the traceability report
  (Finding 5).

### TC-0002-0008 — completion conditions leave the explorations unranked

`TC-0002-0008` is discharged by `SKILL.md の UI-bearing completion が brand SSOT を要求している` in
`tests/integration/discussionSkillTemplateIntegration.test.ts`, annotated
`QFAI:SPEC-0002:TC-0002-0008`. The case's steps read the shipped discussion completion conditions,
and that is what the test does. It reads the discussion `SKILL.md` and
`discussion-completion-matrix.md` from the package source and takes the numbered conditions of the
matrix's `UI-bearing Packs` section. Those conditions must:

- carry the explorations unranked, with no single screen exploration selected;
- leave the design system unfinalized;
- record the brand direction at `01_Context.md#Design Direction`, with `chosen_by: assumption` on a
  direction taken without the user.

`SKILL.md` must say the published theme is the user's decision. The case passes. Other tests read
planner-first wording too, in `tests/assets/assets.test.ts`,
`tests/assets/designDirectionInterview.test.ts` and `tests/e2e/discussionHardeningE2E.test.ts`, but
none carries this case's annotation, so none is scored on this row. This row has **five `⚠️`
cells** and no `❌`.

`TC-0002-0008` has three `n/a` cells, each with no obligation behind it:

- **TC-0002-0008 × Error path** — `n/a`: the case's `EX-Ref` is the happy `EX-0002-0008`. The
  failure the rule declares, a pack that marks one screen exploration final and is refused
  completion, is `EX-0002-0009`'s, and `TC-0002-0009` owns it.
- **TC-0002-0008 × Boundary values** — `n/a`: a list of completion conditions has no numeric,
  date, length or ordered domain.
- **TC-0002-0008 × State transitions** — `n/a`: the case reads what the conditions contain.
  Ranking the explorations is prototyping's work, so no transition happens inside this case.

The scored cells:

- **TC-0002-0008 × Equivalence partitions** — the UI-bearing pack with a visual prototyping surface
  is represented. A cli-only pack is UI-bearing too, and `## CLI Packs` keeps the unranked condition
  for it while dropping the brand direction. The case never reads that section, so that partition
  has no representative.
- **TC-0002-0008 × Edge cases** — the matrix assertions are limited to the numbered conditions, so a
  phrase moved into the prose around them fails the case. A missing `UI-bearing Packs` heading, or a
  section with no `1. ` line, yields an empty string that fails every assertion rather than passing
  vacuously. One edge is untested: a blank line between two conditions ends the collected list at
  the break, so the case would fail on a reformatted list whose conditions are unchanged.
- **TC-0002-0008 × Special values** — the matrix assertions match `\s+` between words, so a
  rewrapped condition still passes. The `SKILL.md` assertion matches literal spaces, so rewrapping
  that sentence fails the case with no change of meaning.
- **TC-0002-0008 × Combinatorial** — two documents are crossed: the case requires the completion
  matrix to record the brand direction and `SKILL.md` to make it the user's decision. The surface is
  never crossed with the conditions: which of them a cli-only pack keeps is not asserted.
- **TC-0002-0008 × Oracle strength** — each matrix assertion has a production mutation that reddens
  it: deleting condition 4 or condition 5 from the shipped completion matrix, or rewording
  "unranked". Deleting the user's-decision sentence from `SKILL.md` reddens the last one. Two
  weaknesses keep it off `✅`. Only presence is asserted, so a condition added beside the others that
  selects one exploration leaves this case green. And the `DESIGN.md`, `40_screen_contracts.md` and
  `50_review_input_bundle.md` assertions match anywhere in `SKILL.md` rather than in its
  completion guidance.
- **TC-0002-0008 × Status** — no cell is `❌`. The row is capped at `⚠️` by the unread cli-only
  partition and the presence-only oracle, and because the test sits under
  `packages/qfai/tests/integration/`, outside the scanned `tests/` root, so the obligation is still
  reported carrier-only (Finding 5).

### Matrix depth cells

- **TC-0002-0001 × Equivalence partitions** — two partitions of the required-file input are
  represented: the complete fifteen, and fifteen minus one. A third, a required file present but
  below the minimum-content threshold, is a distinct partition with its own blocker and is never
  supplied.
- **TC-0002-0001 × Edge cases** — two edges of the enclosing input are covered: no discussion pack
  at all, and a pack directory present only under a non-canonical name, which is required to report
  the naming detail. The file set's own edges — a sixteenth file, a required name present as a
  directory, a zero-byte file — are untested.
- **TC-0002-0001 × Boundary values** — the requirement's count is exercised at fifteen and at
  fourteen, which is the boundary that matters. Two gaps keep it off `✅`. Sixteen is never
  supplied, and the test declares its own literal list of fifteen names rather than importing
  `REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES`, so a requirement **added** to the source is caught by
  the seeded pack coming up short while a requirement **removed** from it stays invisible.
- **TC-0002-0001 × Combinatorial** — one combination is constructed deliberately: a missing required
  file crossed with the Story Workshop Mermaid check, with the second finding required **not** to
  fire so that one defect is not reported under two headings. No other pair is crossed — a missing
  file with a blocking open question, with a deferred entry lacking details, or with the REQ intake
  count.
- **TC-0002-0001 × Oracle strength** — the positive case asserts `blockers` is empty, which is a
  whole-result check and would catch any new blocker. Two weaknesses keep it off `✅`. It certifies
  "nothing blocks" rather than "the required-file check passed", so a defect in that specific check
  is only visible through the absence of its message. And the negative case asserts
  `item.includes("必須ファイル不足")` without requiring the blocker to name the file it removed,
  while the emission at `sddPreflight.ts` joins the missing names into the message — a mutation that
  emptied that list would stay green.
- **TC-0002-0010 × Equivalence partitions** — both partitions of the classification input are
  represented, non-UI and UI-bearing, each with its own case and opposite expectation. The invalid
  and special partitions are not: an unrecognised surface value and an absent classification are
  never supplied.
- **TC-0002-0010 × Combinatorial** — the grid of classification against sidecar-family state is well
  covered on the surface-primary path: UI-bearing with the family absent reports three issues,
  UI-bearing with one member missing reports exactly that member, UI-bearing with the family
  complete is silent, and non-UI with the family absent is silent. What is never crossed with
  anything is the content-fallback classification path, and the classification is never combined
  with the forbidden-legacy-file check that shares the same guard.
- **TC-0002-0011 × Equivalence partitions** — the requiredness rule's two classification partitions
  both have a representative: `ui-bearing discussion packs may include prototyping.yaml` and
  `non-ui discussion packs typically omit it`. Both members of the artifact partition are
  represented too, the README as well as the skill. The invalid partition is not: a document whose
  wording states the opposite requiredness is never supplied, so every representative scored here
  belongs to the conforming class.
- **TC-0002-0011 × Normal path** — both named surfaces carry exact-sentence assertions: the
  conditional-emission rule and the optional-artifact rule in the skill, repeated across both
  shipped trees, and the optional-artifact sentence in `packages/qfai/README.md`, required by two
  cases. Scored `⚠️` rather than `✅` because the case's expected result is that requiredness
  "matches active rule", and nothing compares the two: the sentences are checked for presence, never
  against `isPrototypingRequiredForDiscussionPack`, which returns a constant.
- **TC-0002-0011 × Edge cases** — one edge is guarded, and guarded thoughtfully: the completion
  matrix is sliced to the `## UI-bearing Packs` section and the slice's end is chosen at the next
  `## ` heading rather than at `## Non-UI Packs`, with `expect(uiBearing.length).toBeGreaterThan(0)`
  to stop an empty slice passing vacuously. No other edge is identified or tested.
- **TC-0002-0011 × Combinatorial** — the case names an agreement between the README and the skill,
  and one test evaluates it across documents: `ensures qfai-discussion skill and artifact rules use
  canonical pack wording` reads the README, the skill and the artifact rules together and requires
  the same canonical sentence in all three. That is the pair the case names, held in one assertion
  set. Capped at `⚠️` because agreement is established only on that one sentence, and the other
  predicates are never crossed with one another.
- **TC-0002-0011 × Oracle strength** — one assertion is a real oracle over a real artifact: the
  cited schema path is opened from the project root and required to carry the `prototyping.yaml`
  schema heading, so a renamed heading or a dangling citation reddens it. The rest are substring
  and `not.toContain` searches over shipped Markdown, and there is no code for any of them to be
  sensitive to, because `src/**` contains no occurrence of `prototyping.yaml` at all.

### Matrix Status cells

- **TC-0002-0001 × Status** — the obligation is discharged in both directions by passing tests, which
  is more than any other row in this pack can say. It is capped at `⚠️` because no annotation ties
  any of that work to `TC-0002-0001`: the obligation is reported carrier-only, the discharging file
  sits at `tests/core/`, outside the scanned `tests/integration/**` root, and the negative direction
  comes from a case written for a different subject.
- **TC-0002-0010 × Status** — both directions are covered and the oracle is mutation-sensitive,
  which is the strongest position in this pack. Two things cap it at `⚠️`. The obligation is
  reported carrier-only and the discharging file sits at `tests/validators/uix/`, outside the
  scanned root. And the identical guard in `validateThreeLayerModel`, which the file's `non-UI skip`
  case appears to cover, is covered by nothing — the safe-skip property holds for one of the two
  functions that implement it and is unverified for the other.

### Business rule table

- **BR-0002-0008 × Conditional branches** — the rule has two branches, and `TC-0002-0008`'s case
  asserts both in the numbered completion conditions: the screen explorations are carried unranked,
  and the brand direction is the user's choice. The rule speaks of the brand direction discussion
  records, and a cli-only pack records none. That branch is stated in `## CLI Packs` of the
  completion matrix, which the covering case never reads.
- **BR-0002-0010 × Positive case** — the requiredness wording is asserted present in every artifact
  the rule names: the skill in both shipped trees, the artifact rules, and `packages/qfai/README.md`
  under two cases. It is `⚠️` because presence is all that is measured. No pack is classified and
  found to be treated the way the wording says, so the positive direction is established for the
  sentence and not for the rule.
- **BR-0002-0010 × Negative case** — the negative direction is genuinely present in shape: the
  retired blocking sentences must not appear in the Stage 0 playbook, and legacy-permissive wording
  must not appear in the skill. Both are absence assertions over the real tree rather than a planted
  violation required to be caught, so a predicate that matched nothing would pass them.
- **BR-0002-0010 × Conditional branches** — the rule is explicitly conditional: requiredness is
  stated only when the latest pack is UI-bearing. Both branches have an assertion, and neither is
  evaluated against a pack. The condition is also unrepresentable in the runtime, where
  `isPrototypingRequiredForDiscussionPack` discards its classification argument.
- **BR-0002-0001 × Status** — both directions are exercised with real inputs and a real emission,
  and the rule states no condition, so all three scored cells are satisfied. It is capped at `⚠️`
  because the obligation is reported carrier-only, and because the negative assertion pins the
  blocker's heading rather than the file the blocker should name.
- **BR-0002-0009 × Status** — positive, negative and conditional coverage are all genuinely present,
  and the positive case fails when the guard it exists to protect is removed. It is capped at `⚠️`
  because the rule says a non-UI pack must not fail on sidecar absence alone, and that property is
  verified for one of the two functions that guard it; the other's guard is covered only by a case
  that passes without it.

## Findings

Seven things were found while producing this matrix that the reviewing stage should act on. This
artifact scores coverage and edits no test, ledger or spec; where a finding has since been acted on,
it says so and names what carries it now.

1. **`TC-0002-0009` specifies a finding that nothing emits.** The case requires a planner-first
   violation when an artifact claims a single winner is final. `discussionDesignHardening` was
   retired with the exploration-sidecar family and is absent from `packages/qfai/src/**`; no finding
   code replaced it. Its own acceptance criterion, `AC-0002-0008`, asks only that a selected
   direction not be required as a completion condition — it does not ask for an emission. The case
   is stricter than the criterion it refs and stricter than the product. It needs a Change Request,
   not a test.
2. **A test title claims a comparison the test does not perform.** `assets.test.ts`'s "discussion
   README and SKILL.md agree on prototyping.yaml optionality" reads `SKILL.md` and nothing else, so
   nothing in it compares two documents. The comparison the title describes is performed elsewhere,
   by `ensures qfai-discussion skill and artifact rules use canonical pack wording`, which requires
   one sentence in `packages/qfai/README.md`, the skill and the artifact rules alike. A reader
   scanning titles would take the first case for the agreement proof and would be reading a
   single-file presence check. Rename it for what it does.
3. **`it("non-UI skip")` passes under a mutation of the behaviour its title names.** Removing the
   `isUiBearingSpec` guard from `validateThreeLayerModel` leaves all ten cases in
   `tests/validators/uix/threeLayer.test.ts` green, because the fixture has no sidecar files for the
   loop to read. A reader scanning test titles would take it for the safe-skip proof for
   `TC-0002-0010`; it is not evidence of that or of anything else. Either give it a fixture with
   sidecars present, so the guard is the only thing producing the empty result, or retire it. Both
   are edits to the file `TDD-0011`'s recorded observation covers, so either one restarts that
   row's cycle. `CR-20260912-0003` carries `TDD-0011` for that reason — not because its obligation
   is in doubt, but because the repair to this file moves the observation the row rests on. It is
   re-verified there rather than reset: nothing upstream invalidates `TC-0002-0010`, so the row owes
   a fresh observation over the edited file and keeps its `done`.
4. **Four ledger rows recorded a completion that was never measured.** `TDD-0008`, `TDD-0009` and
   `TDD-0010` sat at `Status = done` over selectors that a search of `packages/qfai/tests/**` does
   not find. `TDD-0012` names a selector that does resolve — `legacy 4-axis format is error` — to a
   case about legacy heading formats in a UI sidecar, which has nothing to do with the
   `prototyping.yaml` requiredness wording its `TC-0002-0011` describes. A `done` over a selector
   that cannot be run, or that runs something else, records a completion that was never measured.
   All four are named in the blocked set of `CR-20260912-0003`, which asks whether the two upstream
   statements they rest on survive. That Change Request is now applied, and for `TDD-0008` the
   finding has been acted on: the row is at `todo` and names
   `SKILL.md の UI-bearing completion が brand SSOT を要求している`, the annotated case
   `TC-0002-0008` is scored against above. Repointing a selector
   at a passing test would resolve the cell while discharging nothing, which is the defect rather
   than its repair; and `done` is not a status a row can be blocked at, so the ledger has no edge
   that records the wait. The Change Request and its work-log entry carry it instead.
5. **Every obligation in this pack is reported carrier-only.** All five `TC-0002-*` appear under
   `coveredByCarrierOnly.tc` of the report `qfai validate --profile atdd` writes at
   `.qfai/report/atdd-traceability/summary.json`, generated and not carried here. <!-- qfai:not-a-citation .qfai/report/atdd-traceability/summary.json -->
   They are referenced only from
   `tests/integration/qfai-traceability.md`, a file that documents itself as an annotation carrier
   and not a test. The cause is structural: the configured `testsDir` is the repository-root
   `tests/`, whose scan matched two files, both of them carriers. The package's real suite lives at
   `packages/qfai/tests/**` and is not scanned at all. Every file that carries `QFAI:SPEC-0002:`
   annotations sits there, outside the scanned root — among them
   `tests/validators/uix/threeLayer.test.ts`,
   `tests/integration/discussionSkillTemplateIntegration.test.ts`
   for `TC-0002-0008` and `tests/e2e/spec0002PlannerFirstE2E.test.ts` for `US-0002-0005` — so their
   annotations discharge nothing. Until that is resolved, no amount of testing can move an `L3`
   obligation in this repository out of carrier-only.
6. **An annotated file carries test-case IDs that no longer exist.**
   `tests/validators/uix/threeLayer.test.ts` declares `TC-0002-0012` and `TC-0002-0026`. Neither
   appears in `06_Test-Cases.md`, whose active table holds five rows. The annotations point at
   obligations that were removed or never registered. The third id the file declares beside the
   obligation it reaches is in a different position: **`TC-0002-0011` is live**, an active row of
   `06_Test-Cases.md` that `TDD-0012` still names. That annotation is misplaced rather than
   dangling: the file reads no README and no `SKILL.md`, so it cannot discharge a wording
   obligation, and removing it is a different act from removing an id nothing declares.
   `threeLayer.test.ts` is the file `TDD-0011`'s recorded observation covers, so editing it stales
   that observation and the row owes a fresh one. The route is the shared-artifact
   re-verification `CR-20260912-0003` step 7 sets out, which keeps the row at `done` and needs no
   approval from that Change Request: the row's obligation does not move under any of its
   outcomes, so nothing authorises a reset and nothing needs one.
7. **The ledger was seven rows short of what seeds it.** `qfai-sdd`'s Phase 2b seeds
   `tdd/test-list.md` in four groups, and one of them is "one `Layer = E2E` row per **active**
   `US-*` from `02_User-stories.md` (obligation in `US-Refs`, `TC-Refs` = `-`)"
   (`.qfai/assistant/skills/qfai-sdd/SKILL.md`). The same phase migrates an eight-column ledger by
   adding the `US-Refs` and `CON-API-Refs` columns the E2E and API groups write into. This ledger
   had neither the column nor a single `Layer = E2E` row. The finding has been acted on: the ledger
   now carries the template's fifteen columns and one `Layer = E2E` row per active story,
   `TDD-0013` to `TDD-0019`. `TDD-0016` carries `US-0002-0005`.

## Follow-up this matrix does not discharge

`QFAI-ATDD-133` requires the stage evidence to carry a `## Coverage Depth Matrix` section that links
this file and restates the counted totals beside it. Those totals are:

**✅ 12 / ⚠️ 27 / ❌ 74**, with `n/a 7`, across 120 scored cells — 108 matrix depth cells (12 rows ×
9 columns) and 12 business rule cells (4 rows × 3 columns). The 16 row verdicts are outside them.

Four of the pack's six ledger rows carry no evidence, and none of them can until the row is true.
`.qfai/evidence/atdd-spec-0002.md` records which row is blocked by what.
