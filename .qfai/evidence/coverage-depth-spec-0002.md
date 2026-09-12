# Coverage Depth Matrix — spec-0002

## Scope

This matrix scores the five active test cases `06_Test-Cases.md` declares — `TC-0002-0001`,
`-0008`, `-0009`, `-0010` and `-0011`, all at `Level: L3` — against the tests that actually
discharge them in `packages/qfai/tests/**`. The obligation set is read from `06_Test-Cases.md` in
full, not from the rows of `.qfai/specs/spec-0002/tdd/test-list.md`. `TC-0002-0002` … `-0007` were
removed from the active table when the `discussionDesignHardening` validator and the
exploration-sidecar family were retired, so they are not scored. The business rule table below
carries all four active `BR-0002-*` of `04_Business-Rules.md`; `BR-0002-0002` … `-0007` were removed
in the same retirement, and none of the four remaining rows carries a status retiring it, so all
four own a row.

**The ledger is not a coverage source for this pack, and the matrix does not read it.** Three of its
six `done` rows name a `Selector` that appears in no file in the repository, and a fourth names one
that resolves to a test about a different behaviour. A `Status` column that says `done` over a
selector nothing can run is a claim, not a measurement. Every score below comes from a test that was
located in the tree and executed.

**Two obligations name a behaviour that no longer has an implementation.** `TC-0002-0008` and
`TC-0002-0009` describe a planner-first pass and a planner-first violation. The validator that
produced them, `discussionDesignHardening`, does not appear anywhere in `packages/qfai/src/**`; the
pack's own notes record that it was retired together with the exploration-sidecar family. Those two
rows carry seventeen of the matrix's twenty-eight `❌` depth cells between them, and the reason is
not thin testing — it is an obligation with no subject left to test.

Committed, because it is a governance record. Section "Every `❌` cell, named" enumerates all 34 of
them so that "one justification per `❌`" is checkable rather than asserted, and section "Every `⚠️`
cell, named" does the same for all 20 partial scores, which the PASS criterion also requires a
rationale for.

## What was measured, and how

Every score rests on a test run. Six files were located by reading the tests themselves rather than
the ledger's `Test file` column, and all six were executed:

| File                                                | Result                                                 |
| --------------------------------------------------- | ------------------------------------------------------ |
| `tests/core/sddPreflight.test.ts`                   | 26 passed                                              |
| `tests/validators/uix/threeLayer.test.ts`           | 10 passed                                              |
| `tests/assets/sddStage0PrototypingOptional.test.ts` | 12 passed                                              |
| `tests/assets/designDirectionInterview.test.ts`     | 12 passed                                              |
| `tests/e2e/discussionHardeningE2E.test.ts`          | 2 passed                                               |
| `tests/assets/assets.test.ts`                       | 6 passed (`prototyping.yaml`), 2 (`legacy-permissive`) |

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
| TC-0002-0001 | ⚠️                     | ✅          | ✅         | ⚠️         | ⚠️              | ❌             | ❌                | ⚠️            | ⚠️              | ⚠️     |
| TC-0002-0008 | ❌                     | ✅          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0002-0009 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0002-0010 | ⚠️                     | ✅          | ✅         | ❌         | ❌              | ❌             | ❌                | ⚠️            | ✅              | ⚠️     |
| TC-0002-0011 | ⚠️                     | ⚠️          | ❌         | ⚠️         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ❌     |

Totals across the nine depth columns, 45 cells (5 rows × 9): **✅ 6 / ⚠️ 11 / ❌ 28**.

Totals by `Status`, 5 cells: **✅ 0 / ⚠️ 2 / ❌ 3**.

No row reaches `Status = ✅`. The two `⚠️` rows are the two whose obligations are genuinely
exercised in both directions; both are capped by the layer defect described under Findings.

### Business rule coverage

One row per active `BR-0002-*`. All four rows of the Rule Table in `04_Business-Rules.md` are
active, so none is omitted. `Covering TC` is derived from each rule's `AC-Refs` and from the
`BR-Ref` of the examples the test cases cite, not from the rule's number.

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                | Status |
| ------------ | ------------- | ------------- | -------------------- | -------------------------- | ------ |
| BR-0002-0001 | ✅            | ✅            | n/a                  | TC-0002-0001               | ⚠️     |
| BR-0002-0008 | ⚠️            | ❌            | ⚠️                   | TC-0002-0008, TC-0002-0009 | ❌     |
| BR-0002-0009 | ✅            | ✅            | ✅                   | TC-0002-0010               | ⚠️     |
| BR-0002-0010 | ⚠️            | ⚠️            | ⚠️                   | TC-0002-0011               | ❌     |

Totals across the three scored columns, 12 cells: **✅ 5 / ⚠️ 5 / n/a 1 / ❌ 1**.

Totals by `Status`, 4 cells: **✅ 0 / ⚠️ 2 / ❌ 2**.

`n/a` is used once, for `BR-0002-0001`, which states the 15-file requirement unconditionally and so
has no branch to cover. It is not used anywhere an obligation exists and is unmet.

## Every ❌ cell, named

The matrix carries 28 `❌` depth cells plus 3 in `Status`; the business rule table carries 1 in its
scored columns plus 2 in its `Status` column — 34 in all. Each is named below with its own reason.
A row's `Status` is `❌` when the obligation is not discharged at the depth the case describes; that
verdict is stated once per row and is not repeated per cell.

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

### TC-0002-0008 — artifacts omit selected direction, planner-first pass preserved

Addressed only by wording checks over shipped Markdown: `tests/assets/assets.test.ts` requires the
discussion artifact rules to match `/must not choose a single winner|must not choose a single visual winner/`
and the discussion `SKILL.md` to match `/planner-first|exploration-first/`;
`tests/assets/designDirectionInterview.test.ts` requires `SKILL.md` to contain
`carry the screen explorations unranked` and the completion matrix to contain
`no single screen exploration is selected`; `tests/e2e/discussionHardeningE2E.test.ts` requires
`SKILL.md` to match `/planner/i`.

No case feeds a discussion artifact to anything. `Normal path` is `✅` because the case's own
direction — the completion contract leaving the explorations unranked — is addressed by passing
assertions on the shipped guidance. Everything else has nothing to score.

- **Equivalence partitions** — no artifact is read by any check, so the partitions the case names,
  "omits a selected direction" and "declares one", are both unrepresented as inputs.
- **Error path** — no case supplies an artifact that does declare a selected direction and requires
  a result. The case that would is `TC-0002-0009`, and it has no implementation to run against.
- **Edge cases** — a pack with no design artifacts at all, and a pack naming a direction as a
  candidate rather than as final, are both untested.
- **Boundary values** — the obligation has no numeric, date, length or ordered domain, and no count
  of named directions is exercised at any edge, because no count is exercised at all.
- **Special values** — no empty, absent or malformed artifact is supplied.
- **State transitions** — unranked to ranked is the pack's central progression and the clearest
  state obligation in this spec. No case observes any transition.
- **Combinatorial** — the planner-first posture is never crossed with UI-bearing classification or
  with completion state.
- **Oracle strength** — `expect(content).toMatch(/planner/i)` is satisfied by any document that
  contains the word "planner" anywhere, for any reason. The exact-sentence assertions are stronger
  as wording pins but certify no behaviour, and there is no `discussionDesignHardening` left in
  `src/**` for any of them to be sensitive to.
- **Status** — the case names a pass produced by running readiness over artifacts. Nothing runs.

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

**The case names a README and there is no README.** The four artifacts those tests read are the
discussion `SKILL.md`, the SDD execution playbook, `discussion-artifact-rules.md` and
`discussion-completion-matrix.md`. No `README` file exists anywhere under
`.qfai/assistant/skills/qfai-discussion/` or under the shipped `assets/init` copy of it. A case in
`assets.test.ts` titled "discussion README and SKILL.md agree on prototyping.yaml optionality" reads
`SKILL.md` and nothing else, so its title asserts a comparison it does not make. This row has
**five `❌` depth cells** plus `Status`.

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
- **Combinatorial** — the case names an agreement between two artifacts and no test evaluates the
  pair. The two-tree loop repeats each predicate in a second location rather than combining two
  conditions, and the six predicates are never crossed with one another.
- **Status** — half the artifacts the case names do not exist, and the half that does is covered by
  wording checks against a rule with no runtime behind it.

### The ❌ cells of the business rule table

- **BR-0002-0008 × Negative case** — the rule states that discussion must not finalize a selected
  direction, winning direction or design system. Its negative is an artifact that does finalize one,
  run through something that rejects it. Nothing supplies such an artifact, and nothing would reject
  it if something did.
- **BR-0002-0008 × Status** — the rule's covering cases are `TC-0002-0008` and `TC-0002-0009`. The
  first is addressed only in guidance prose; the second names an emission with no emitter. The rule
  is documented and unenforced.
- **BR-0002-0010 × Status** — the rule's own Notes name "README / SKILL canonical wording" as the
  surface it governs. There is no README in either shipped tree, and `src/**` never reads
  `prototyping.yaml`, so neither the artifact set nor the runtime the rule assumes exists.

## Every ⚠️ cell, named

11 depth cells and 2 `Status` cells in the matrix, and 5 scored cells and 2 `Status` cells in the
business rule table, are `⚠️` — 20 in all. The PASS criterion requires a documented rationale for
each, so each is named here.

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
  `non-ui discussion packs typically omit it`. The artifact partition the case names has only one
  of its two members, because the README does not exist.
- **TC-0002-0011 × Normal path** — the SKILL half is covered well: exact-sentence assertions on the
  conditional-emission rule and the optional-artifact rule, repeated across both shipped trees. The
  README half has no case, and no artifact for a case to read. Scored `⚠️` rather than `✅` because
  the case names two surfaces and one of them is absent.
- **TC-0002-0011 × Edge cases** — one edge is guarded, and guarded thoughtfully: the completion
  matrix is sliced to the `## UI-bearing Packs` section and the slice's end is chosen at the next
  `## ` heading rather than at `## Non-UI Packs`, with `expect(uiBearing.length).toBeGreaterThan(0)`
  to stop an empty slice passing vacuously. No other edge is identified or tested.
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

- **BR-0002-0008 × Positive case** — the planner-first posture is asserted as exact sentences
  required to be present in the shipped `SKILL.md`, the artifact rules and the completion matrix.
  No pack is evaluated and found compliant.
- **BR-0002-0008 × Conditional branches** — the rule has two branches and both are named by
  assertions: the screen explorations are governed and must be carried unranked, and the brand
  direction is the stated exception. Neither branch is exercised against a pack; both are addressed
  at the level of the sentence that describes them.
- **BR-0002-0010 × Positive case** — the requiredness wording is asserted present in four artifacts
  across both shipped trees, which is thorough for what it measures. It is `⚠️` because the rule's
  own Notes name README and SKILL, and the README half has no artifact.
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

Six things were found while producing this matrix that the reviewing stage should act on. None is
repaired here; this artifact scores coverage and does not edit tests, ledgers or specs.

1. **`TC-0002-0009` specifies a finding that nothing emits.** The case requires a planner-first
   violation when an artifact claims a single winner is final. `discussionDesignHardening` was
   retired with the exploration-sidecar family and is absent from `packages/qfai/src/**`; no finding
   code replaced it. Its own acceptance criterion, `AC-0002-0008`, asks only that a selected
   direction not be required as a completion condition — it does not ask for an emission. The case
   is stricter than the criterion it refs and stricter than the product. It needs a Change Request,
   not a test.
2. **`TC-0002-0011` names an artifact that does not exist.** The case and `BR-0002-0010` both name
   "README / SKILL canonical wording". There is no README under `qfai-discussion/` in either the
   working tree or the shipped `assets/init` copy. A case in `assets.test.ts` titled "discussion
   README and SKILL.md agree on prototyping.yaml optionality" reads only `SKILL.md`, so the title
   claims an agreement check that is not performed. Either the artifact set in the case is stale, or
   the README is missing.
3. **`it("non-UI skip")` passes under a mutation of the behaviour its title names.** Removing the
   `isUiBearingSpec` guard from `validateThreeLayerModel` leaves all ten cases in
   `tests/validators/uix/threeLayer.test.ts` green, because the fixture has no sidecar files for the
   loop to read. A reader scanning test titles would take it for the safe-skip proof for
   `TC-0002-0010`; it is not evidence of that or of anything else. Either give it a fixture with
   sidecars present, so the guard is the only thing producing the empty result, or retire it.
4. **Three ledger rows name a selector that appears in no file.** `TDD-0008`, `TDD-0009` and
   `TDD-0010` are all at `Status = done` over selectors that a search of `packages/qfai/tests/**`
   does not find. `TDD-0012` names a selector that does resolve — `legacy 4-axis format is error` —
   to a case about legacy heading formats in a UI sidecar, which has nothing to do with the
   `prototyping.yaml` requiredness wording its `TC-0002-0011` describes. A `done` over a selector
   that cannot be run, or that runs something else, records a completion that was never measured.
5. **Every obligation in this pack is reported carrier-only.** All five `TC-0002-*` appear under
   `coveredByCarrierOnly.tc` in `.qfai/report/atdd-traceability/summary.json`, referenced only from
   `tests/integration/qfai-traceability.md`, a file that documents itself as an annotation carrier
   and not a test. The cause is structural: the configured `testsDir` is the repository-root
   `tests/`, whose scan matched two files, both of them carriers. The package's real suite lives at
   `packages/qfai/tests/**` and is not scanned at all. The two annotated files that do carry
   `SPEC-0002` markers, `tests/validators/uix/threeLayer.test.ts` and
   `tests/validators/uix/screenContract.test.ts`, are outside the scanned root, so their annotations
   discharge nothing. Until that is resolved, no amount of testing can move an `L3` obligation in
   this repository out of carrier-only.
6. **Two annotated files carry test-case IDs that no longer exist.**
   `tests/validators/uix/threeLayer.test.ts` declares `TC-0002-0012` and `TC-0002-0026`, and
   `tests/validators/uix/screenContract.test.ts` declares `TC-0002-0020` through `TC-0002-0024`.
   None of those seven appears in `06_Test-Cases.md`, whose active table holds five rows. The
   annotations point at obligations that were removed or never registered.

## Follow-up this matrix does not discharge

`QFAI-ATDD-133` requires the stage evidence to carry a `## Coverage Depth Matrix` section that links
this file and restates the counted totals beside it. Those totals are:

**✅ 11 / ⚠️ 20 / ❌ 34**, with `n/a 1`, across all 66 scored cells — 45 matrix depth cells, 5
matrix `Status` cells, 12 business rule scored cells and 4 business rule `Status` cells.

Four of the pack's six ledger rows carry no evidence, and none of them can until the row is true.
`.qfai/evidence/atdd-spec-0002.md` records which row is blocked by what.
