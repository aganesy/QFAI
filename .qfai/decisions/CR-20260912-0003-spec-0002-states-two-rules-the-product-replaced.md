# Change Request

- ID: `CR-20260912-0003`
- Title: `spec-0002 states two rules the product replaced: discussion fixes no direction, and prototyping.yaml is required`
- Raised by: `/qfai-implement orchestrator, repairing the spec-0002 execution ledger`
- Raised at: `2026-09-12T12:40:00Z`
- Class: `intent`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

Two statements in spec-0002 are contradicted by the product that is supposed to
satisfy them. Both were recorded on 2026-04-23, and neither was revisited when
the behaviour behind it changed.

### A. Discussion chooses no direction

`01_Spec.md` REQ-0012 says discussion performs no single-winner, selected
direction or design-system finalization. `03_Acceptance-Criteria.md`
AC-0002-0008 states it as a scenario: given a UI-bearing pack, a selected
direction or finalized design system is never a discussion completion
condition. `07_Decisions.md` DR-0002-0001 and DR-0002-0003 carry the same rule,
the second placing `selected-direction.yaml` and `design-system.yaml`
downstream of prototyping winner selection.

The product states a narrower rule. The user chooses the brand direction during
discussion; it is recorded at `01_Context.md#Design Direction`; `/qfai-sdd`
Phase 0 reads that field and stops without it; and planner-first now binds only
the screen explorations.
`packages/qfai/tests/assets/designDirectionInterview.test.ts` states the
narrowing in as many words — the rule used to forbid selecting any visual
winner, and it still holds for the screen explorations, which the prototype
loop ranks by iterating.

Nothing under `packages/qfai/src/` contains `planner-first`, and no validator
emits a violation for a pack that asserts a single final winner. The
`discussionDesignHardening` validator that would have was retired in v1.8.9
together with the exploration-sidecar family, which this spec's own ledger
notes record.

### B. `prototyping.yaml` is required of a UI-bearing pack

`01_Spec.md` REQ-0005 says UI-bearing discussion packs require
`prototyping.yaml` and non-ui packs do not. AC-0002-0010 states the scenario,
and TC-0002-0011 asks that README and skill wording match the active rule.

The shipped wording says the opposite, in one sentence three documents are
required to carry verbatim: UI-bearing discussion packs **may** include
`prototyping.yaml` as an optional recommendation artifact. The preflight agrees
— `tests/core/sddPreflight.test.ts` requires a UI-bearing pack missing the file
not to block, and requires a malformed one not to block either.

So a test that checks the wording against the product passes while
contradicting the acceptance criterion, and a test that enforced the criterion
would have to fail against the product.

## Proposed change

Reconcile each statement with the behaviour, in the direction the user chooses
from the options below, and sweep the ledger rows that rest on them.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                              | Cost                                                                                                                                                                                                                                                          | Risk                                                                                                                                                                                                              | Recommended |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Narrow the spec to the product: REQ-0012 and AC-0002-0008 bind the screen explorations only; REQ-0005 and AC-0002-0010 say the artifact is optional | Edit four upstream statements. Reset `TDD-0008`, `-0009`, `-0012`; **retire `TDD-0010`**; re-verify `TDD-0011` in place. **Plus the `spec-0010` owner re-derivation**, both chains and its ledger, which every statement-A outcome owes                       | Records today's behaviour as intended. If either narrowing was a regression, it becomes the specification. One row is removed rather than re-pointed                                                              | ✅          |
| 2   | Restore the product to the spec: reinstate a winner check, and make `prototyping.yaml` a readiness blocker for UI-bearing packs                     | New validator work, a breaking change for adopters, and — for the requiredness half — a `spec-0013` owner re-derivation it cannot be approved without                                                                                                         | Reverses a deliberate design move without the record of why it was made. `2B` reverses `spec-0013` REQ-0015 outright, so approving it alone would leave two active packs prescribing opposite preflight behaviour |             |
| 3   | Retire the four obligations: withdraw REQ-0012, AC-0002-0008, REQ-0005's requiredness half and AC-0002-0010, and delete the rows resting on them    | Smallest edit **to `spec-0002`**, and the `spec-0010` re-derivation beside it like every other statement-A outcome. Retiring the direction rule here leaves `spec-0010`'s own copy of it to be withdrawn or restated, which is an edit rather than an absence | Loses the record that the question was ever settled, so the next reader re-derives it                                                                                                                             |             |

**Every outcome owes `spec-0010` a re-derivation, this one included.** That pack
requires `/qfai-discussion` to author root `DESIGN.md` **and** owns the direction
rule itself; this Change Request records `/qfai-sdd` as the producer, and
statement A changes or retires the rule. Options 1 and 3 settle statement A
without touching either disagreement, so they leave both standing rather than
resolving them. Both chains are listed in `## Impact scope` and first in the
rerun plan.

Option 1 is recommended because the narrowing is documented in the tree and was
made on purpose: the direction interview asks the user rather than letting an
assistant invent a brand, and the optional artifact is stated identically in
three shipped documents and enforced by the preflight. What is missing is the
spec catching up, not the product going back.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                                                                      |
| -------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- |
| `spec-0002/TDD-0008` | `ledger-row` | `TC-0002-0008` asks that discussion completion not require a direction                                              |
| `spec-0002/TDD-0009` | `ledger-row` | `TC-0002-0009` asks that a pack asserting a single final winner be refused                                          |
| `spec-0002/TDD-0010` | `ledger-row` | second row on `TC-0002-0009`                                                                                        |
| `spec-0002/TDD-0012` | `ledger-row` | `TC-0002-0011` asks that the wording match the active requiredness rule                                             |
| `spec-0010/TDD-0011` | `ledger-row` | `TC-0010-0007` asks that discussion author root `DESIGN.md`, the producer every statement-A outcome re-derives      |
| `spec-0013/TDD-0016` | `ledger-row` | `TC-0013-0022` asks that `/qfai-sdd` Phase 0 write `DESIGN.md.lock.yaml`, which `2a` moves into `/qfai-prototyping` |

**`spec-0010/TDD-0011` and `spec-0013/TDD-0016` are other packs' rows, and they
belong here anyway.** Both are at `todo`, so nothing has been observed against
either yet, and each obligation is one a re-derivation above moves. Left out of this set the open-CR
preflight does not suppress it, and `/qfai-implement` may advance it against a
requirement already known to change — producing a RED, a GREEN and a reviewer
verdict on a producer nobody has settled.

**`spec-0002/TDD-0011` is not in this set.** Its obligation is sound, its test
discharges it, and no A/B outcome moves either. The two repairs the matrix asks
for — giving `non-UI skip` a fixture that makes the guard load-bearing, and
removing the three annotations `threeLayer.test.ts` declares that this spec's
table does not hold — do edit the file its recorded observation covers, so the
row owes a fresh observation. That is the shared-artifact re-verification of step
6, which needs no approval from this Change Request and no reset.

Listing it here would have blocked it: the open-CR preflight suppresses every
row in this set until the user settles two product decisions the row has nothing
to do with. A row whose obligation is unchanged waits on nobody.

- Not blocked by this CR under options 1 and 3: `spec-0002/TDD-0001`. Its
  obligation, pack readiness, is untouched by either statement, and its test
  discharges it. **Under `2B` it is reached**: making a missing
  `prototyping.yaml` a readiness blocker edits
  `packages/qfai/tests/core/sddPreflight.test.ts`, which is the file this row's
  recorded observation covers, so its evidence goes stale the moment the change
  lands. It takes the same in-place repair the other rows take under that
  option, not a reset: its obligation does not move either.
- Overlapping open CRs: `none`

## Impact scope

**Four other packs specify this surface, and none is reconciled by re-running a
test.** Each belongs in the owner rerun rather than in the cross-spec sweep,
because what disagrees is a requirement and not an observation.

| Pack        | What it requires                                                                                                   | Reached by                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `spec-0010` | `/qfai-discussion` authors root `DESIGN.md` before downstream use, **and** winner selection stays in prototyping   | Every statement-A outcome                  |
| `spec-0013` | The SDD preflight does not block on a missing optional side artifact, **and** Phase 0 writes `DESIGN.md.lock.yaml` | The first half by `2B`, the second by `2a` |
| `spec-0004` | A missing or unparseable root `DESIGN.md` emits `QFAI-DCON-030` at error                                           | `2a`                                       |
| `spec-0012` | SDD Phase 0 freezes the `DESIGN.md` digest into `.qfai/contracts/design/DESIGN.md.lock.yaml`                       | `2a`                                       |

`spec-0010` is the one no option escapes, and it owns **two** chains rather than
one. `US-0010-0009` → `AC-0010-0007` → `BR-0010-0007` is the producer, and this
Change Request records `/qfai-sdd` as the producer today — so whichever way
statement A is settled, one of the two packs specifies a producer the product
does not have. `US-0010-0008` → `AC-0010-0006` → `BR-0010-0006` → `EX-0010-0006`
→ `TC-0010-0006` is the direction rule itself, which statement A changes or
retires outright. Options 1 and 3 settle neither, so they owe the re-derivation
as much as option 2 does.

`spec-0013` is reached by both sub-branches, for different obligations.
`REQ-0015` and the side-artifact `AC-0013-0009` say the preflight does not block
on a missing or old-format optional side artifact, which `2B` reverses — that
pack's own `09_delta.md` records the blocker being removed, so it is a reversal
rather than a coincidence. Separately `US-0013-0009` → `AC-0013-0015` →
`BR-0013-0012` → `EX-0013-0012` → `TC-0013-0022` assign the `DESIGN.md.lock.yaml`
write to `/qfai-sdd` Phase 0, which `2a` moves into `/qfai-prototyping`. The
second chain has a `todo` ledger row, `spec-0013/TDD-0016`, which is parked with
this Change Request.

`spec-0004` and `spec-0012` are reached only by `2a`, and by the same edit: that
sub-option authorises the design-contract gate to exempt a pack which has not
reached prototyping, and those two packs are where the gate's current behaviour
is specified. Four `done` rows name the test file that edit touches —
`spec-0004/TDD-0008`, `-0009`, `-0010` and `spec-0012/TDD-0355`, all on
`packages/qfai/tests/core/validators/designContractReadiness.test.ts` — so the
cross-spec sweep reaches them as well.

**Each re-derivation carries its pack's whole chain, not the statements this
document happens to name.** A pack whose story and acceptance criterion move
while its business rule, example and test case do not is internally
contradictory, and the rerun that produced it would have to edit files the
authorisation below does not name. The `Specs` entry therefore enumerates every
layer of every reached pack, and its ledger.

**`2B` waits on a repair that is not this Change Request's.**
`.qfai/specs/spec-0013/03_Acceptance-Criteria.md` declares `AC-0013-0009` twice —
"Delta Rejected Guardrails" and "Optional Side Artifact Does Not Block
Preflight" — and `TC-0013-0009` cites the ambiguous id for the first. A rerun
keyed to that id sweeps whichever the reader finds. The duplicate predates both
statements and is independent of them, so renumbering it is a separate record
with its own approval; `2B` cannot be approved until it has landed.

- Specs: `spec-0002` — `.qfai/specs/spec-0002/01_Spec.md`,
  `.qfai/specs/spec-0002/02_User-stories.md`,
  `.qfai/specs/spec-0002/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0002/04_Business-Rules.md`,
  `.qfai/specs/spec-0002/05_Examples.md`,
  `.qfai/specs/spec-0002/06_Test-Cases.md`,
  `.qfai/specs/spec-0002/07_Decisions.md`

  **Under every statement-A outcome, `spec-0010` as well** — the owner
  re-derivation below writes it, and `QFAI-DRIFT-001` reads this list rather
  than the prose. Both of that pack's chains, so every layer:
  `.qfai/specs/spec-0010/01_Spec.md`,
  `.qfai/specs/spec-0010/02_User-stories.md`,
  `.qfai/specs/spec-0010/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0010/04_Business-Rules.md`,
  `.qfai/specs/spec-0010/05_Examples.md`,
  `.qfai/specs/spec-0010/06_Test-Cases.md`,
  `.qfai/specs/spec-0010/07_Decisions.md`,
  `.qfai/specs/spec-0010/09_delta.md`,
  `.qfai/specs/spec-0010/10_Plan.md`,
  `.qfai/specs/spec-0010/tdd/test-list.md`.

  **Under `2B`, `spec-0013`'s side-artifact chain**:
  `.qfai/specs/spec-0013/01_Spec.md`,
  `.qfai/specs/spec-0013/02_User-stories.md`,
  `.qfai/specs/spec-0013/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0013/04_Business-Rules.md`,
  `.qfai/specs/spec-0013/05_Examples.md`,
  `.qfai/specs/spec-0013/06_Test-Cases.md`,
  `.qfai/specs/spec-0013/09_delta.md`,
  `.qfai/specs/spec-0013/10_Plan.md`,
  `.qfai/specs/spec-0013/tdd/test-list.md`. The story layer is in that list
  because `02_User-stories.md` still asks the preflight to ignore optional side
  artifacts, and `05_Examples.md` because the criterion has no example today and
  the rerun writes one.

  **Under `2a`, the same `spec-0013` paths again** — a different chain in the
  same pack, `US-0013-0009` through `TC-0013-0022`, which assigns the lock write
  to Phase 0 — **plus `spec-0004` and `spec-0012`** whose obligations the
  design-gate change moves:
  `.qfai/specs/spec-0004/01_Spec.md`,
  `.qfai/specs/spec-0004/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0004/04_Business-Rules.md`,
  `.qfai/specs/spec-0004/05_Examples.md`,
  `.qfai/specs/spec-0004/06_Test-Cases.md`,
  `.qfai/specs/spec-0004/09_delta.md`,
  `.qfai/specs/spec-0004/tdd/test-list.md`,
  `.qfai/specs/spec-0012/01_Spec.md`,
  `.qfai/specs/spec-0012/07_Decisions.md`,
  `.qfai/specs/spec-0012/09_delta.md`,
  `.qfai/specs/spec-0012/10_Plan.md`,
  `.qfai/specs/spec-0012/tdd/test-list.md`.

  **And `.qfai/specs/spec-0002/10_Plan.md` under options 2 and 3**, for the two
  notes below.

  **`spec-0002/10_Plan.md` is here under options 2 and 3 only.** That plan
  records the behaviour these options change: it says the winner validator was
  retired in v1.8.9, and that side-artifact requiredness was removed from
  `discussionPack.ts`. `2A` restores a validator the plan calls absent, `2B`
  reverses the note about the optional artifact, and option 3 leaves its ranges
  naming test cases that no longer exist. Under option 1 the plan is already
  accurate and the file stays out.

  **Its `TC-0002-0026` repair is not authorised either way.** `QFAI-DRIFT-001`
  reads a path rather than a reason, so where the plan is in scope the approved
  action names the lines it may edit — the retirement note and the
  requiredness note — and that repair, which belongs to a Change Request nobody
  has written, is not among them. The other packs' plans are in the list because their
  re-derivations edit them: `spec-0012/10_Plan.md` assigns the freeze to SDD
  Phase 0, and a plan left saying that contradicts the producer `2a` selects.

- Tests: `spec-0002/TDD-0008`, `spec-0002/TDD-0009`, `spec-0002/TDD-0010`,
  `spec-0002/TDD-0011`, `spec-0002/TDD-0012`, and `spec-0002/TDD-0001` under
  option 2 only —
  `packages/qfai/tests/validators/uix/threeLayer.test.ts`,
  `packages/qfai/tests/validators/uix/screenContract.test.ts`,
  and under option 2 `packages/qfai/tests/core/sddPreflight.test.ts`
- Product files, option 2 only — the option is implementation work, and the
  scope has to authorise what it edits:
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/**` and its
  root mirror, which carry the direction interview;
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/**` and its mirror,
  whose Phase 0 reads the recorded direction;
  `packages/qfai/src/core/preflight/sddPreflight.ts`, which must block on a
  missing `prototyping.yaml`, **and `packages/qfai/src/core/discussionPack.ts`,
  which is what would give it something to report**:
  `isPrototypingRequiredForDiscussionPack` returns a constant `false` and the
  artifact never enters `missingSideArtifacts`, so the preflight branch receives
  nothing however it is written and requiredness has to be derived from the
  validated UI-bearing classification instead; a new validator source for the single-winner
  violation **and every path that makes it run** —
  `packages/qfai/src/core/validators/uix/canonical.ts`, whose
  `CANONICAL_UIX_VALIDATORS` list is the only way `qfai validate` reaches a UIX
  validator, the export that puts the new module on that surface, the emitted
  finding-code registry, and the regression tests that pin both —
  **and `packages/qfai/src/core/prototyping/mode.ts` with
  `packages/qfai/tests/unit/cli/commands/prototypingIterate.modeDiscriminator.test.ts`**,
  because an error-severity code on that surface has to be classified as
  relaxable or hard in exploration mode and that test holds the two lists equal
  to the reachable set: a new code classified in neither fails it by
  construction, and leaves exploration behaviour undefined. `spec-0012/TDD-0522`
  owns that test and takes the in-place re-verification; and the three
  shipped documents carrying the optional-artifact sentence, of which
  `packages/qfai/README.md` is one and is outside both skill-directory
  wildcards — two cases in `assets.test.ts` require that sentence there, so a
  rerun following the enumerated paths alone would leave the public README
  asserting optionality and those cases failing. The tests that pin the behaviour being removed move with it:
  `packages/qfai/tests/assets/designDirectionInterview.test.ts`,
  `packages/qfai/tests/assets/sddStage0PrototypingOptional.test.ts`,
  `packages/qfai/tests/assets/assets.test.ts` and
  `packages/qfai/tests/core/sddPreflight.test.ts`.
  **Two further files are edited and another spec owns them.**
  `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`
  is named by `spec-0010/TDD-0006` and `TDD-0007`, and
  `packages/qfai/tests/e2e/discussionHardeningE2E.test.ts` by
  `spec-0010/TDD-0008` — three `done` rows whose recorded observations this
  option's edits invalidate. **Five more are reached through the asset rather
  than the test.** `packages/qfai/tests/assets/uiuxSidecar.test.ts` reads the
  shipped `qfai-discussion/SKILL.md` this option rewrites, and
  `spec-0010/TDD-0001` … `TDD-0005` are `done` rows naming that file. The
  procedure matches a reverse-dependent path, not only a file edited directly,
  so the sweep covers all eight.

  **Under `2a`, nine more.** That sub-option rewrites the shipped
  `qfai-prototyping/SKILL.md`, and two test files read it. Seven `done` rows
  name `packages/qfai/tests/skill/prototypingSkill.test.ts` — `spec-0004/TDD-0006`
  and `spec-0012/TDD-0294`, `-0295`, `-0345`, `-0346`, `-0360` and `-0396`. Two
  more name `packages/qfai/tests/validators/prototyping/delegationMap.test.ts`,
  which reads that asset's `## Delegation Scope Table` and validates the
  categories it finds there: `spec-0012/TDD-0286` and `TDD-0293`. A
  direction-selection step adds a category, so the rows a sub-option invalidates
  are not only the ones whose test file has the skill's name in it. The same
  procedure reaches all nine, and they owe fresh verification in the same
  change. The cross-spec ownership procedure
  (`.qfai/assistant/skills/qfai-implement/references/cross-spec-ownership.md`)
  runs before either file is written, and **every row enumerated above** owes
  fresh verification in the same change.

  **Two more sets, from the product edits rather than the assets.** Under
  statement A option 2 the winner validator joins `CANONICAL_UIX_VALIDATORS` in
  `packages/qfai/src/core/validators/uix/canonical.ts`, which
  `packages/qfai/tests/integration/verifySemanticsSpec0014.test.ts` imports and
  runs — `spec-0014/TDD-0009`, `TDD-0018` and `TDD-0019` are `done` rows naming
  that file. Under `2B` the requiredness derivation edits
  `packages/qfai/src/core/discussionPack.ts`, which
  `packages/qfai/tests/core/activeDiscussionPack.test.ts` imports —
  `spec-0013/TDD-0023` and `TDD-0024` name that one. Neither set's obligation
  moves, so both take the in-place re-verification rather than a reset. Without it option 2 finishes with another
  spec's rows attesting to behaviour the product no longer has.

**This section is reduced to the approved outcome before `Status: approved` is
written.** `QFAI-DRIFT-001` reads every path that appears here as
authorisation, and it neither evaluates the "under `2a`" qualifiers nor compares
them with `Approved option` — so a document left whole would have option 1
authorising every edit `2a` and `2B` list. The conditions above are what the
user chooses from; once they have chosen, the paths belonging to the outcomes
they did not choose are struck from this section, and the record of what was
offered stays in `## Options` and in `## Decision needed from user`.

- Contracts: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/references/design-md-spec.md`
  and its root mirror, **under `2a` only**. That document has Phase 0 author
  `DESIGN.md` and prototyping read it as read-only context, and `2a` moves the
  authoring into prototyping — so the contract it would then contradict is the
  one that has to move with it. Under `2b` and under options 1 and 3 this is
  `none`.
- Product paths under `2b`:
  `packages/qfai/src/core/validators/designContractReadiness.ts` with
  `packages/qfai/tests/core/validators/designContractReadiness.test.ts`. That
  sub-option removes the discussion direction, and `QFAI-DCON-034`'s remediation
  tells the user `/qfai-sdd` authors `DESIGN.md` "from the design direction the
  discussion pack recorded" — an input `2b` deletes. A message naming a step the
  selected workflow no longer has is the defect `interface-clarity.md` calls a
  report against the control.
- Product paths under `2a`:
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/**` and its
  root mirror, for the direction-selection step and the authoring it performs,
  with the tests that pin both; `packages/qfai/src/cli/commands/prototypingIterate.ts`
  with its tests, whose hash-mismatch recovery tells the user to "re-run
  `/qfai-sdd` Phase 0 to refreeze" — a stage that under this sub-option no longer
  owns the write, so following the diagnostic repeats something that cannot
  repair the mismatch, and the completed `spec-0012` rows naming that command
  take the in-place re-verification with it; **and
  `packages/qfai/src/core/validators/designContractReadiness.ts` with
  `packages/qfai/tests/core/validators/designContractReadiness.test.ts`**.

  Without the second the sub-option does not work at all. `/qfai-sdd` ends on
  `npx qfai validate --profile sdd --fail-on error`, that profile runs
  `validateSddDesignContractReadiness`, and it reports `QFAI-DCON-030` for a
  missing root `DESIGN.md` and `QFAI-DCON-031` for a missing
  `.qfai/contracts/design/DESIGN.md.lock.yaml`. `2a` moves both writes to a
  stage that runs after `/qfai-sdd`, so a new UI project fails the gate on two
  artifacts nothing has yet been allowed to write, and the workflow is circular
  in the other direction from the one this Change Request opened with. The gate
  has to learn that a pack which has not reached prototyping owes neither
  artifact yet — which is a product change, and an option that does not name it
  authorises a rerun that cannot finish.

- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0002/01_Spec.md`,
  `.qfai/specs/spec-0002/02_User-stories.md`,
  `.qfai/specs/spec-0002/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0002/04_Business-Rules.md`,
  `.qfai/specs/spec-0002/05_Examples.md`,
  `.qfai/specs/spec-0002/06_Test-Cases.md`,
  `.qfai/specs/spec-0002/07_Decisions.md`,
  `.qfai/specs/spec-0002/09_delta.md`,
  `.qfai/specs/spec-0002/tdd/test-list.md`

  `10_Plan.md` is **not** here. `QFAI-DRIFT-001` reads this list as the
  authorisation, so naming the file would waive any change to it — including the
  `TC-0002-0026` repair the approved actions exclude by name and send to a
  Change Request of its own. No approved action edits the plan, so the path has
  nothing to authorise and its presence would grant exactly what the exclusion
  denies.

  A layered pack states one rule at every layer, so the story, the business rule
  and the example that carry these two rules move with the requirement and the
  acceptance criterion. Leaving them behind is how a pack ends up saying
  prototyping selects the direction on one page and the user does on another.

## Decision needed from user

Which of the three options settles each statement? They may be settled
differently: option 1 for the direction rule and option 3 for the requiredness
rule is a coherent answer, since the second is a sentence the product already
states in three places and the first is a rule the product still partly keeps.

`Approved option` takes one value, so a split answer is written as one —
`1A/3bB` means option 1 for statement A, the direction rule, and option 3 with
disposition `b` for statement B, the requiredness rule. A single token means the
same option for both. The combinations are not listed as separate options,
because the two statements are independent and a table of every pairing would
ask the user to read every row to make two choices.

**Option 2 carries a letter on statement A.** `2a` and `2b` name the stage that
authors `DESIGN.md` once the direction interview is withdrawn, and that
withdrawal is statement A's. `2B` takes no letter: restoring the requiredness
rule removes no producer.

**Option 3 carries its letter when it settles statement B.** `3a` and `3b` are
the two dispositions of the legacy-format test, and one of them deletes an
assertion. That test's obligation is `TC-0002-0011`, which belongs to statement
B, so `3bB` is complete and `3B` alone authorises neither disposition and cannot
be applied.

`3A` takes no letter. Statement A's retirement leaves that test owned by whatever
settles B, so a letter there would authorise an action on the other statement —
and refusing `3A/1B` for want of one would make a valid split unrecordable.

## Approved actions (owner skill rerun plan)

**Three owner re-derivations come first, and their scope is the requirement
rather than the test. Each carries its pack's whole chain**, because a pack
whose story moves while its business rule, example and test case do not is
internally contradictory.

1. **`spec-0010`, under every statement-A outcome.** `/qfai-sdd` re-derives both
   chains that pack owns — the producer (`US-0010-0009` → `AC-0010-0007` →
   `BR-0010-0007`) against whichever producer statement A settles on, and the
   direction rule (`US-0010-0008` → `AC-0010-0006` → `BR-0010-0006` →
   `EX-0010-0006` → `TC-0010-0006`) against whatever statement A leaves of it.
   The downstream sweep runs from that pack, its ledger included. Mode
   `re-derive`: the rows change identity, so `confirm-only` — which writes
   nothing but this Change Request's reference — cannot carry it.

   **Its ledger dispositions are approved here rather than left to the sweep**,
   because the sweep re-verifies and these rows do not survive re-verification:

   | Outcome | `spec-0010` rows                                                                                                                       |
   | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
   | `1A`    | `TDD-0006`, `TDD-0007`, `TDD-0008` reset to `todo` with this `CR-*` in `DR-ID` — `TC-0010-0006` changes under them                     |
   | `3A`    | The same three retired with `TDD-0010`, their evidence entries closed and their ids reserved in that ledger's `## TDD-ID reservations` |
   | `2A`    | Reset as under `1A`: the test case moves rather than going away                                                                        |

   `TDD-0011` is not in that table. It is parked in `## Blocked downstream items`
   and its disposition is whatever the re-derivation leaves it needing.

2. **`spec-0013`, under `2B` only, and not before the duplicate id is
   repaired.** `/qfai-sdd` re-derives `REQ-0015` and the side-artifact
   `AC-0013-0009` — with the story, business rule, example and test case beneath
   them — to say that a UI-bearing pack owes `prototyping.yaml`. **`2B` is not
   approved without it**: approving the option alone would leave two active
   packs prescribing opposite preflight behaviour, with the product free to
   satisfy either. And it is not approved before the duplicate id lands either:
   that repair is a separate record (`## Impact scope`), and a rerun keyed to
   `AC-0013-0009` before it sweeps whichever criterion the reader finds.

   **The re-derived rule is not "UI-bearing".** A cli-only pack is
   `ui_bearing: true` and the discussion playbook forbids `prototyping.yaml` for
   it, because `cli` is not a valid prototyping execution surface and a
   recommendation naming it cannot be executed. Deriving requiredness from the
   classification alone makes every cli-only pack fail SDD readiness for an
   artifact it cannot validly produce. The blocker is the presence of a visual
   prototyping surface — `web`, `mobile`, `desktop` or `mixed` — and the
   cli-only exception survives in the re-derived obligations.

3. **`spec-0004`, `spec-0012` and `spec-0013`'s lock chain, under `2a` only.**
   `/qfai-sdd` re-derives `spec-0004`'s `REQ-0025` and `AC-0004-0008` with the
   business rule, example and test case beneath them; `spec-0012`'s
   `DR-0012-0020` and the `01_Spec.md` requirement and `10_Plan.md` phase that
   carry it; and `spec-0013`'s `US-0013-0009` → `AC-0013-0015` → `BR-0013-0012`
   → `EX-0013-0012` → `TC-0013-0022`, which assigns the lock write to Phase 0.
   **`BR-0013-0012`, not `-0013`**: that neighbour governs the removal of the
   legacy design contracts and has nothing to do with the freeze.
   All three say afterwards that the design-contract gate exempts a pack which
   has not reached prototyping, and that the write belongs to the producer `2a`
   selects. The downstream sweep then reaches `spec-0004/TDD-0008`, `-0009`,
   `-0010` and `spec-0012/TDD-0355`, the four `done` rows naming
   `packages/qfai/tests/core/validators/designContractReadiness.test.ts` — **but
   not on the same terms.** `TDD-0008` carries `TC-0004-0008`, which this
   re-derivation changes from an unconditional `QFAI-DCON-030` to one a
   pre-prototyping pack is exempt from, so it is **reset to `todo` with this
   `CR-*` in `DR-ID`** rather than re-verified: its recorded observation is of a
   rule that no longer holds. The other three keep their obligations and take the
   in-place re-verification.
   **`2a` is not approved without this**: the gate is where `QFAI-DCON-030` is
   specified, and changing it while those packs still require the old behaviour
   leaves the product satisfying neither.

4. `/qfai-sdd` rerun scope: the statements the chosen option names, plus the
   `06_Test-Cases.md` rows that read them.

   The seven ledger rows the seeding contract requires and this pack does not
   have are **not** in this Change Request either. That gap predates both
   statements and is independent of them: Phase 2b would seed the rows and
   migrate the column on any rerun this CR triggers, so a recovering session
   would perform an unapproved repair under an approval that covers A and B. It
   is recorded in `.qfai/evidence/coverage-depth-spec-0002.md` finding 7 and
   needs its own record; a rerun under this one leaves the ledger as it found
   it.

   The `10_Plan.md` row citing `TC-0002-0026`, which this spec's table does not
   declare, is **not** in this Change Request. It is independent of both
   statements, the approval record here covers only A and B, and folding an
   unrelated repair into an intent CR means approving one thing and authorising
   two. It is recorded in `.qfai/evidence/coverage-depth-spec-0002.md` and needs
   its own.

5. Downstream ledger sweep. The two statements are settled independently, so the
   plan is read per statement and not per bundle, so every dependent identifier
   is assigned to one of them here rather than left in the combined option
   bodies — a split cannot be applied from a list that names only part of a
   layer.

   | Layer                       | Statement A — the direction rule   | Statement B — the requiredness rule |
   | --------------------------- | ---------------------------------- | ----------------------------------- |
   | `01_Spec.md`                | `REQ-0012`                         | `REQ-0005` (requiredness half)      |
   | `02_User-stories.md`        | `US-0002-0005`                     | —                                   |
   | `03_Acceptance-Criteria.md` | `AC-0002-0008`                     | `AC-0002-0010`                      |
   | `04_Business-Rules.md`      | `BR-0002-0008`                     | `BR-0002-0010`                      |
   | `05_Examples.md`            | `EX-0002-0008`, `EX-0002-0009`     | `EX-0002-0011`                      |
   | `06_Test-Cases.md`          | `TC-0002-0008`, `TC-0002-0009`     | `TC-0002-0011`                      |
   | `07_Decisions.md`           | `DR-0002-0001`, `DR-0002-0003`     | —                                   |
   | `tdd/test-list.md`          | `TDD-0008`, `TDD-0009`, `TDD-0010` | `TDD-0012`                          |

   `US-0002-0005` is statement A's: it is the planner-first story — discussion
   defines conditions and anti-goals **without selecting a visual winner**, so
   prototyping remains where the direction is chosen — which is the direction
   rule stated as a story. `AC-0002-0008` scenarios it. The requiredness rule has
   no story of its own, so statement B's cell is empty rather than shared.
   Nothing in statement A's list touches statement B's rows or the reverse, so
   `1A/2B` is option 1 applied to A's rows and option 2 applied to B's, with no
   overlap to resolve. `TDD-0011` is re-verified under every combination —
   not reset — for a reason belonging to neither statement, given at step 6.

   The three option bodies below each describe **both** statements, because that
   is how they are compared. Applying one to a single statement means taking only
   the rows and files that statement's list names.

   **Option 1 — narrow the spec to the product.** `/qfai-sdd` re-derives every
   layer that carries the two rules, the same set option 3 withdraws them from:
   `01_Spec.md` (`REQ-0012`, `REQ-0005`), `02_User-stories.md` (`US-0002-0005`),
   `03_Acceptance-Criteria.md` (`AC-0002-0008`, `AC-0002-0010`),
   `04_Business-Rules.md` (`BR-0002-0008`, `BR-0002-0010`), `05_Examples.md`
   (`EX-0002-0008`, `EX-0002-0009`, `EX-0002-0011`), `06_Test-Cases.md`
   (`TC-0002-0008`, `-0009`, `-0011`) and `07_Decisions.md` (`DR-0002-0001`,
   `DR-0002-0003`). Narrowing a rule at the requirement and leaving the story,
   the business rule and the example stating the old one is the same failure as
   withdrawing it at the requirement alone.
   - Reset to `todo`, recording this CR's ID in `DR-ID`:
     `spec-0002/TDD-0008`, `spec-0002/TDD-0009`, `spec-0002/TDD-0012`
   - Re-scope `spec-0002/TDD-0012` in the same `/qfai-sdd` rerun, before the
     reset is any use. **That rerun's mode is `re-derive`, not `confirm-only`**:
     the drift protocol admits those two and no others, and `confirm-only`
     writes nothing but the CR reference, so it cannot rewrite a row's identity.
     Under option 2 the statements come back from a re-derive unchanged — that
     is what the option means by leaving them alone — and the mode is named for
     what the rerun is allowed to write, not for what must differ. The rerun
     re-derives the row's identity, or retires it and seeds a new one for the
     narrowed rule. Without the lift `2B` produces no evidence for
     `TC-0002-0011` at all — the row keeps a selector that resolves, so
     `/qfai-implement` may not rewrite it, and the only thing it can re-run is
     an assertion about the legacy-format finding. Its `Test file` exists and its `Selector`,
     `legacy 4-axis format is error`, resolves in it, so the ledger whitelist
     permits changing neither: a reset alone returns the row to `todo` still
     pointing at a case about `UIX-VAL-3LAYER-LEGACY-FORMAT`, and the only thing
     it can then re-run is an assertion unrelated to `TC-0002-0011`. Row
     identity is Phase 2b's to write, so the rerun either re-points the row at a
     case that discharges the narrowed requiredness rule, or retires it and
     seeds a new row for that rule. The same applies under option 2, where the
     in-place repair path cannot touch identity either.
   - Retire: `spec-0002/TDD-0010` — `current preflight unit test pass`

   **Option 2 — restore the product to the spec.** No upstream statement
   changes, and `/qfai-sdd`'s mode is nonetheless `re-derive`: the statements
   come back unchanged, and the rerun is there for the ledger row whose identity
   `confirm-only` could not touch. The work is implementation, and it is larger
   than a new validator. `REQ-0012` says discussion performs no selected-direction
   finalization, so restoring it means withdrawing the direction interview as well
   as adding the check: the shipped discussion skill asks the user to choose a
   brand direction, `01_Context.md#Design Direction` records it, and `/qfai-sdd`
   Phase 0 reads that field and stops without it. All three go, or the product
   still selects a direction during discussion and the requirement is still
   contradicted.

   **Removing all three leaves nothing that authors `DESIGN.md`.** The shipped
   `qfai-prototyping/references/design-md-spec.md` has Phase 0 author that file
   and prototyping read it as read-only context, so a new UI project under this
   option reaches prototyping with no brand contract and no stage that can
   produce one. Which stage replaces it is a decision rather than a detail, so
   option 2 is offered as two, the same way option 3 is:

   | Option | Who authors `DESIGN.md`                                                                                                                                                                                                                                                                                                                                                                                                                               |
   | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `2a`   | `/qfai-prototyping` gains a direction-selection step and authors the file **and `.qfai/contracts/design/DESIGN.md.lock.yaml`**, with its tests. The prototyping contract requires both before execution and `prototyping iterate` rejects a run without the lock, so assigning the authoring alone leaves a new UI project unable to start. Discussion still chooses nothing, and the contract that has prototyping read it read-only changes with it |
   | `2b`   | `/qfai-sdd` Phase 0 authors it from the spec, with no interview anywhere. The requirement is met with no user-facing choice, and whatever a brand needs that a spec does not carry is lost. **It narrows `US-0002-0005` with the rest of statement A**: that story requires prototyping to remain where the direction is chosen, and `2b` moves the authoring to `/qfai-sdd`, so leaving the story as written would contradict the option settling it |

   `2A` with no letter authorises neither, and withdrawing every producer
   without naming a replacement leaves a new UI project unable to enter
   prototyping at all. Beside that: a validator that emits the single-winner violation
   `TC-0002-0009` names, a preflight that blocks a UI-bearing pack missing
   `prototyping.yaml`, and the three shipped documents rewritten to say the
   artifact is required. This is the option with the largest blast radius, and
   the direction interview it removes was itself added to stop an assistant
   inventing a brand.
   - **No row is reset.** No upstream statement moves under this option — the
     mode is `re-derive` so the rerun can rewrite `TDD-0012`'s identity, and the
     statements come back unchanged — and
     `.qfai/assistant/skills/qfai-implement/references/checkpoint-verification.md`
     admits the approved reset only for a row an approved **upstream** change has
     invalidated. `TDD-0008`, `TDD-0009` and `TDD-0012` keep the obligations they
     already had; what changes is the product beneath them and the assertions
     that were written against the old behaviour. That is the in-place repair
     path: the shared-artifact re-verification, plus falsifiability evidence for
     each corrected assertion — break the production predicate the new assertion
     names, run the row's `Selector`, confirm an admissible failure, revert and
     re-run for the restored GREEN — recorded on the row's own line at the
     mutated tree's `Falsifiability revision`.

     **`TDD-0008` and `TDD-0009` need their selectors replaced before any of
     that.** Both name a test title that occurs nowhere in the file they point
     at, so every command above selects no test: no mutation failure, no
     restored GREEN, nothing to record. Use the unresolved-selector carve-out to
     write the corrected assertion names into both rows first, then begin the
     re-verification. Routing them to a reset would
     demand an authorization this record cannot legitimately give, and would
     leave each row holding a gate it can never clear.

   - **`spec-0002/TDD-0001`, under statement B alone, takes the same path.** It
     is in neither statement's obligation list — its `TC-Refs` is `TC-0002-0001`
     — and is here because the restored preflight check edits
     `sddPreflight.test.ts`, the file its observation covers. That check is the
     requiredness rule, so `1A/2B` reaches the row and `2A/1B` leaves it alone.
   - Retire: `spec-0002/TDD-0010` — `current preflight unit test pass`, as under
     option 1. Restoring a winner validator gives `TC-0002-0009` no second
     boundary: the test case defines one violation, and this row points at a
     preflight selector about a missing `prototyping.yaml` that the restored
     check does not touch. Keeping it would preserve the duplicate row this CR
     exists to clear.

   **Option 3 — retire the four obligations.** `/qfai-sdd` re-derives every layer
   that carries them, not only the three that name them most visibly:
   `01_Spec.md` (`REQ-0012`, `REQ-0005`'s requiredness half),
   `02_User-stories.md` (`US-0002-0005`), `03_Acceptance-Criteria.md`
   (`AC-0002-0008`, `AC-0002-0010`), `04_Business-Rules.md` (`BR-0002-0008`,
   `BR-0002-0010`), `05_Examples.md` (`EX-0002-0008`, `EX-0002-0009`,
   `EX-0002-0011`), `06_Test-Cases.md` (`TC-0002-0008`, `TC-0002-0009`,
   `TC-0002-0011`) and `07_Decisions.md` (`DR-0002-0001`, `DR-0002-0003`). A
   withdrawal that stops at the requirement leaves the story, the rule and the
   example asserting what was withdrawn, which is the state this Change Request
   exists to end rather than to reproduce one layer down. The decision records
   are the last layer and the easiest to leave behind: naming `07_Decisions.md`
   in the impact scope authorises the edit and does not ask for one, so a pack
   can retire the requirement and keep the two decisions that state it.
   - Reset to `todo`: none.
   - Retire, each with its `Evidence` cell verbatim:
     `spec-0002/TDD-0008` — `current template integration test pass`;
     `spec-0002/TDD-0009` — `current e2e guidance test pass`;
     `spec-0002/TDD-0010` — `current preflight unit test pass`;
     `spec-0002/TDD-0012` — `current three-layer validator pass`.
     No test is deleted with any of them, and each retired row's test needs a
     disposition rather than a file that merely survives. `TDD-0012`'s selector,
     `legacy 4-axis format is error`, names a case that asserts
     `validateThreeLayerModel` emits `UIX-VAL-3LAYER-LEGACY-FORMAT`. That is a
     real behaviour of a live validator, and withdrawing `TC-0002-0011` takes
     away its obligation rather than its subject. The retirement procedure
     requires each surviving test to be deleted or re-pointed, and "left
     unowned" is neither. That disposition is a decision rather than a step, so
     option 3 is offered as two and the approval says which:

     | Option | The legacy-format case                                                                                      |
     | ------ | ----------------------------------------------------------------------------------------------------------- |
     | `3a`   | Re-pointed. A new obligation is written for the legacy-format finding and the case is registered against it |
     | `3b`   | Deleted, and with it the only assertion that the finding is emitted                                         |

     Neither is free, which is why it is put rather than settled here. `3a` owes
     an obligation this Change Request does not draft: the rule is live
     behaviour of a live validator, and withdrawing `TC-0002-0011` takes away
     its obligation rather than its subject. `3b` leaves
     `UIX-VAL-3LAYER-LEGACY-FORMAT` asserted nowhere. Under either, the case may
     not be re-pointed at `TDD-0011`: that row's selector is a different case in
     the same file.
     `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`,
     `packages/qfai/tests/e2e/discussionHardeningE2E.test.ts` and
     `packages/qfai/tests/core/sddPreflight.test.ts` all carry coverage for
     other rows; `packages/qfai/tests/validators/uix/threeLayer.test.ts` stays
     with `spec-0002/TDD-0011`.

6. `spec-0002/TDD-0011` is **re-verified, not reset**, under every option. Its
   obligation `TC-0002-0010` does not move and its case `skips non-UI packs` is
   not edited; what changes is the file around it — the annotations, and the
   sibling case's fixture. A `CR-*` reset is for a row whose obligation an
   upstream change invalidated, and nothing here invalidates this one, so
   resetting it would claim a drift that did not happen. What the row needs is a
   fresh observation over the edited file, and the full procedure rather than a
   re-run and a new hash: the shared-artifact re-verify block
   `.qfai/assistant/skills/qfai-implement/references/checkpoint-verification.md`
   defines, recorded where that contract puts it, with the selector re-run, the
   `RED test hash` its manifest now computes to, and `Status` left at `done`.
   Recording only the hash would leave the row asserting a verification nobody
   performed, which is the shape of defect this Change Request exists to clear.

7. Reserve every retired `TDD-ID` in the ledger's `## TDD-ID reservations`
   section before the row is deleted. The ledger allocates the next id as
   `max + 1`, so deleting the highest row hands its number to the next one
   written, and two runs then share an identifier that this Change Request is
   the only record of. Option 1 reserves `spec-0002/TDD-0010`; option 2 the
   same; option 3 reserves `spec-0002/TDD-0008`, `spec-0002/TDD-0009`,
   `spec-0002/TDD-0010` and `spec-0002/TDD-0012`, the last of which is that
   pack's current maximum and so the one that would be reused first. **Every id
   here carries its pack**, because this Change Request now touches four of
   them and `spec-0010` has a `TDD-0008` of its own: a deleted row cannot say
   afterwards which ledger it came from, so the reservation has to.

## Resolution

Not yet resolved.
