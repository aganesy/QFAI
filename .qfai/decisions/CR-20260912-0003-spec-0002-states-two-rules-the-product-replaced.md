# Change Request

- ID: `CR-20260912-0003`
- Title: `spec-0002 states two rules the product replaced: discussion fixes no direction, and prototyping.yaml is required`
- Raised by: `/qfai-implement orchestrator, repairing the spec-0002 execution ledger`
- Raised at: `2026-09-12T12:40:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user` — Option 1 selected through the structured question tool
- Approved at: `2026-09-24T23:26:20Z`
- Approved option: `1`
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

| #   | Option                                                                                                                                                                                                                                                                                        | Cost                                                                                                                                                                                                                                                                                                                                                | Risk                                                                                                                                                                                                              | Recommended |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Narrow the spec to the product: REQ-0012 and AC-0002-0008 bind the screen explorations only; REQ-0005 and AC-0002-0010 say the artifact is optional for a pack with a visual prototyping surface and not carried by a cli-only one                                                            | Edit four upstream statements, and the optional-artifact sentence in three shipped documents, which offers the file to cli-only packs too. Reset `TDD-0008`, `-0009`, `-0012`; **retire `TDD-0010`**; re-verify `TDD-0011` in place. **Plus the `spec-0010` owner re-derivation**, both chains and its ledger, which every statement-A outcome owes | Records today's behaviour as intended. If either narrowing was a regression, it becomes the specification. One row is removed rather than re-pointed                                                              | ✅          |
| 2   | Restore the product to the spec: reinstate a winner check, and make `prototyping.yaml` a readiness blocker for packs with a visual prototyping surface (`web`, `mobile`, `desktop`, `mixed`) — not for every UI-bearing pack, since a cli-only one is UI-bearing and cannot emit the artifact | New validator work, a breaking change for adopters, and — for the requiredness half — a `spec-0013` owner re-derivation it cannot be approved without                                                                                                                                                                                               | Reverses a deliberate design move without the record of why it was made. `2B` reverses `spec-0013` REQ-0015 outright, so approving it alone would leave two active packs prescribing opposite preflight behaviour |             |
| 3   | Retire the four obligations: withdraw REQ-0012, AC-0002-0008, REQ-0005's requiredness half and AC-0002-0010, and delete the rows resting on them                                                                                                                                              | Smallest edit **to `spec-0002`**, and the `spec-0010` re-derivation beside it like every other statement-A outcome. Retiring the direction rule here leaves `spec-0010`'s own copy of it to be withdrawn or restated, which is an edit rather than an absence                                                                                       | Loses the record that the question was ever settled, so the next reader re-derives it                                                                                                                             |             |

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

| Item                 | Kind         | Why it depends on the artifact                                                                                                          |
| -------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `spec-0002/TDD-0008` | `ledger-row` | `TC-0002-0008` asks that discussion completion not require a direction                                                                  |
| `spec-0002/TDD-0009` | `ledger-row` | `TC-0002-0009` asks that a pack asserting a single final winner be refused                                                              |
| `spec-0002/TDD-0010` | `ledger-row` | second row on `TC-0002-0009`                                                                                                            |
| `spec-0002/TDD-0012` | `ledger-row` | `TC-0002-0011` asks that the wording match the active requiredness rule                                                                 |
| `spec-0010/TDD-0006` | `ledger-row` | `TC-0010-0006`, the direction rule every statement-A outcome re-derives; the row is `done`                                              |
| `spec-0010/TDD-0007` | `ledger-row` | `TC-0010-0006` again; the row is `done`                                                                                                 |
| `spec-0010/TDD-0008` | `ledger-row` | `TC-0010-0006` again; the row is `done`                                                                                                 |
| `spec-0010/TDD-0010` | `ledger-row` | `TC-0010-0006` is the direction rule itself, which every statement-A outcome re-derives, and the row is `todo`                          |
| `spec-0010/TDD-0011` | `ledger-row` | `TC-0010-0007` asks that discussion author root `DESIGN.md`, the producer every statement-A outcome re-derives                          |
| `spec-0013/TDD-0016` | `ledger-row` | `TC-0013-0022` asks that `/qfai-sdd` Phase 0 write `DESIGN.md.lock.yaml`, which `2a` moves into `/qfai-prototyping`                     |
| `spec-0004/TDD-0008` | `ledger-row` | Under `2a` only: `TC-0004-0008` becomes a `QFAI-DCON-030` a pack that has not reached prototyping is exempt from, and the row is `done` |
| `spec-0002/TDD-0016` | `ledger-row` | The `E2E` row seeded for `US-0002-0005`, the planner-first story statement A narrows; the row is `todo`                                 |
| `spec-0010/TDD-0025` | `ledger-row` | The `E2E` row seeded for `US-0010-0008`, the direction rule; the row is `todo`                                                          |
| `spec-0010/TDD-0026` | `ledger-row` | The `E2E` row seeded for `US-0010-0009`, the producer; the row is `todo`                                                                |

**Every row an outcome resets or retires is here, whichever pack owns it.** The
three completed `spec-0010` rows and `spec-0004/TDD-0008` carry recorded
evidence against an obligation an outcome changes, so a completion left
unsuppressed would re-assert the old requirement while the choice is open.

**`spec-0010/TDD-0011` and `spec-0013/TDD-0016` are other packs' rows, and they
belong here anyway.** Both are at `todo`, so nothing has been observed against
either yet, and each obligation is one a re-derivation above moves. Left out of this set the open-CR
preflight does not suppress it, and `/qfai-implement` may advance it against a
requirement already known to change — producing a RED, a GREEN and a reviewer
verdict on a producer nobody has settled.

**`spec-0002/TDD-0011` is not in this set.** Its obligation is sound, its test
discharges it, and no A/B outcome moves either. The two repairs the matrix asks
for — giving `non-UI skip` a fixture that makes the guard load-bearing, and
removing the three annotations `threeLayer.test.ts` declares beside the
obligation it reaches — two that this spec's table does not hold, and a live
one the file cannot discharge — do edit the file its recorded observation
covers, so the
row owes a fresh observation. That is the shared-artifact re-verification of step
7, which needs no approval from this Change Request and no reset.

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
- The `E2E` rows the `spec-0002` and `spec-0010` ledger repairs seeded for
  `US-0002-0005`, `US-0010-0008` and `US-0010-0009` are in the table above by
  id. The `spec-0013` rows for `US-0013-0008` and `US-0013-0009` would join
  only under `2B` or `2a`, and option 1 reaches neither.
- Overlapping open Change Requests: two, both over `spec-0014` rows this record
  re-verifies in place.
  `CR-20260913-0005` holds `spec-0014/TDD-0009`, whose `Test file` and
  `Selector` it corrects, and `2A` re-verifies that row through the winner
  validator. `CR-20260913-0006` holds `spec-0014/TDD-0034`, and `2a` re-verifies
  it through the iterate command. In both cases the row cannot be re-verified as
  this record describes, because what it names is what the other request
  changes — so each is a prerequisite: it lands first, and the disposition here
  is refreshed against the row as it then reads. `TDD-0033`, `TDD-0018` and
  `TDD-0019` are held by neither and keep their in-place terms.
- **The `spec-0013` ledger repair is
  owed and unwritten**, like `spec-0002`'s, `spec-0010`'s, `spec-0004`'s and
  `spec-0012`'s. It re-derives that ledger to its template with no statement
  moving: the six columns it lacks, the `Integration` and `E2E` rows Phase 2b
  owes, and the split of all thirteen progressed rows that run several
  boundaries behind one `Selector`, `TDD-0019`, `TDD-0021` and `TDD-0022` among
  them. It edits `.qfai/specs/spec-0013/tdd/test-list.md` and
  `.qfai/specs/spec-0013/09_delta.md`, which this record also edits under `2B`
  and `2a`, the two outcomes that re-derive `spec-0013`. So the two are ordered:
  the repair is written and lands first, and this record is refreshed against
  what it actually wrote before `2B` or `2a` is approved. Until then neither
  outcome is applicable, because the prerequisite names no record an operator
  can open.

## Impact scope

Reduced to the approved outcome, option 1: `1A` for the direction rule and `1B`
for the requiredness rule. What the other outcomes would have reached is kept in
`## Options` and `## Decision needed from user`.

`spec-0010` is re-derived with `spec-0002`, because it owns the direction rule
itself (`US-0010-0008` → `AC-0010-0006` → `BR-0010-0006` → `EX-0010-0006` →
`TC-0010-0006`) and the producer of root `DESIGN.md` (`US-0010-0009` →
`AC-0010-0007` → `BR-0010-0007` → `EX-0010-0007` → `TC-0010-0007`). Under `1A`
the producer is `/qfai-sdd` Phase 0, reading the direction discussion records.

- Specs: `spec-0002` — `.qfai/specs/spec-0002/01_Spec.md`,
  `.qfai/specs/spec-0002/02_User-stories.md`,
  `.qfai/specs/spec-0002/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0002/04_Business-Rules.md`,
  `.qfai/specs/spec-0002/05_Examples.md`,
  `.qfai/specs/spec-0002/06_Test-Cases.md`,
  `.qfai/specs/spec-0002/07_Decisions.md`

  `spec-0010`, both chains and every layer:
  `.qfai/specs/spec-0010/01_Spec.md`,
  `.qfai/specs/spec-0010/02_User-stories.md`,
  `.qfai/specs/spec-0010/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0010/04_Business-Rules.md`,
  `.qfai/specs/spec-0010/05_Examples.md`,
  `.qfai/specs/spec-0010/06_Test-Cases.md`,
  `.qfai/specs/spec-0010/07_Decisions.md`,
  `.qfai/specs/spec-0010/09_delta.md`,
  `.qfai/specs/spec-0010/tdd/test-list.md`.

  The policy layer:

  | Path                                      | Statement                                                                                                                                                                   |
  | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `.qfai/specs/_policies/05_Contracts.md`   | the prose declaring root `DESIGN.md` to be `/qfai-discussion` output                                                                                                        |
  | `.qfai/specs/_policies/06_Glossary.md`    | the `DESIGN.md` and `exploration-first` entries                                                                                                                             |
  | `.qfai/specs/_policies/07_Constraints.md` | `TC-12`                                                                                                                                                                     |
  | `.qfai/specs/_policies/08_Decisions.md`   | `DR-0282: prototyping.yaml as Required Side Artifact` — the record this document called the second `DR-0094` before the duplicate id was renumbered; `DR-0240` is untouched |
  | `.qfai/specs/_policies/10_delta.md`       | the record of the change                                                                                                                                                    |

- Plans: `.qfai/specs/spec-0010/10_Plan.md`. `.qfai/specs/spec-0002/10_Plan.md`
  stays out: under option 1 it is already accurate, and its `TC-0002-0026` row
  belongs to a Change Request of its own.
- Tests: `spec-0002/TDD-0008`, `TDD-0009`, `TDD-0010`, `TDD-0011`, `TDD-0012`
  and `TDD-0016`; `spec-0010/TDD-0006`, `TDD-0007`, `TDD-0008`, `TDD-0010`,
  `TDD-0011`, `TDD-0025` and `TDD-0026`. Test files:
  `packages/qfai/tests/validators/uix/threeLayer.test.ts`, for the
  `spec-0002/TDD-0011` re-verification; and the two ledger backlogs the resets
  move, `packages/qfai/tests/assets/completedRowRunsARealTest.test.ts` and
  `packages/qfai/tests/assets/openRowAlreadyTested.test.ts`. Records:
  `.qfai/evidence/atdd-spec-0002.md` and
  `.qfai/evidence/coverage-depth-spec-0002.md`, regenerated by the
  `/qfai-atdd spec-0002` pass in approved action 9; and the dogfood backlog pin
  `scripts/dogfood-backlog.json` with its digest in `.github/pinned-bytes.txt`.
- Product files under `1B`: the optional-artifact sentence in `README.md`,
  `packages/qfai/README.md`,
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/SKILL.md` and
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/references/discussion-artifact-rules.md`,
  the last two with their root mirrors; the tests that pin it,
  `packages/qfai/tests/assets/assets.test.ts` and
  `packages/qfai/tests/assets/sddStage0PrototypingOptional.test.ts`; and the
  `CHANGELOG.md` entry. The sentence offered `prototyping.yaml` to every
  UI-bearing pack, and the narrowed rule offers it only to a pack with a visual
  prototyping surface.
- Contracts: `none`
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
   `BR-0010-0007` → `EX-0010-0007` → `TC-0010-0007`) against whichever producer
   statement A settles on, and the
   direction rule (`US-0010-0008` → `AC-0010-0006` → `BR-0010-0006` →
   `EX-0010-0006` → `TC-0010-0006`) against whatever statement A leaves of it.
   The downstream sweep runs from that pack, its ledger included. Mode
   `re-derive`: the rows change identity, so `confirm-only` — which writes
   nothing but this Change Request's reference — cannot carry it.

   **Its ledger dispositions are approved here rather than left to the sweep**,
   because the sweep re-verifies and these rows do not survive re-verification:

   | Outcome | `spec-0010` rows                                                                                                                                                                                                                                                     |
   | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `1A`    | `TDD-0006`, `TDD-0007`, `TDD-0008` and `TDD-0010` reset to `todo` with this `CR-*` in `DR-ID` — `TC-0010-0006` changes under all four                                                                                                                                |
   | `3A`    | The same three retired with `TDD-0010`, and all four ids reserved in that ledger's `## TDD-ID reservations`. The three `done` rows copy their `Evidence` cells in; `TDD-0010` never ran, so its entry reads `no evidence — retired at Status = todo, never executed` |
   | `2A`    | **Not reset.** Re-verified in place: the option restores the behaviour `TC-0010-0006` already requires, so the obligation stays and the product beneath it moves. `TDD-0010` is released as it stands, since a `todo` row owes no re-verification                    |

   **Why `2A` is not a reset.** `TC-0010-0006` requires discussion to declare
   no final winner, which is the behaviour option 2 restores, so the obligation
   beneath those three rows does not move — what moves is the product and the
   assertions written against it. A `CR-*` reset is for a row an approved
   upstream change invalidated; recording one here would enter an upstream
   invalidation in `DR-ID` that did not happen. The three take the in-place
   shared-artifact re-verification instead, on the same terms as
   `spec-0002/TDD-0008` and `TDD-0009` under the same option. The producer chain
   is separate and still re-derives: under `2b` the authoring moves to
   `/qfai-sdd`, which is a statement `US-0010-0009` carries.

   **`TDD-0010` is in the table because it is `todo`.** It carries `TC-0010-0006`
   like the three `done` rows, so it is blocked while statement A is open: the
   open-CR preflight suppresses only rows this record lists, and a row missing
   from it could be selected and completed against an obligation known to be
   changing. It resets with the others under `1A`, retires with them under `3A`,
   and is released unchanged under `2A`, where the obligation does not move.

   **`spec-0010`'s ledger repair is a prerequisite too, on the same terms as
   `spec-0002`'s (step 5).** That ledger has eight columns and no `E2E` row for
   any of its twelve stories, all of them active, so this `re-derive`'s Phase 2b
   would migrate the table and seed twelve rows this record does not authorise.
   The repair lands first as its own record. This record is then refreshed
   before approval, and two of the seeded rows join
   `## Blocked downstream items` by id, with these dispositions:

   | Outcome | The `US-0010-0008` row (direction rule)           | The `US-0010-0009` row (producer)           |
   | ------- | ------------------------------------------------- | ------------------------------------------- |
   | `1A`    | reset to `todo` with this `CR-*` in `DR-ID`       | reset to `todo` with this `CR-*` in `DR-ID` |
   | `3A`    | retired with its chain, its id written out here   | reset to `todo` with this `CR-*` in `DR-ID` |
   | `2A`    | left as it stands — the rule comes back unchanged | reset to `todo` with this `CR-*` in `DR-ID` |

   The producer row resets under every outcome because the producer chain is
   re-derived under every outcome, for the reason `TDD-0011` gives below.

   **`TDD-0011` is enumerated here rather than left to the sweep.**
   `TC-0010-0007` changes beneath it under **every statement-A outcome**, so it
   is **reset to `todo` with this `CR-*` in `DR-ID`** wherever statement A is
   settled. It is left alone only by an approval that settles statement B and
   not statement A, which leaves the producer chain where it is. A `todo` row is inside the drift
   sweep, not outside it, and parking its disposition would leave the operator
   applying an approved change with no approved disposition for a row the change
   invalidates.

2. **`spec-0013`, under `2B` only, and not before the duplicate id is
   repaired.** `/qfai-sdd` re-derives `REQ-0015` and the side-artifact
   `AC-0013-0009` — with the story, business rule, example and test case beneath
   them — to say that a pack **with a visual prototyping surface** (`web`,
   `mobile`, `desktop` or `mixed`) owes a `prototyping.yaml` that parses against
   its schema, so an absent file and a malformed one each block its readiness,
   the old-format file `REQ-0015` exempts included. **Not "UI-bearing"**, for
   the reason in the next paragraph. **`2B` is not approved without it**:
   approving the option alone would leave two active packs prescribing
   opposite preflight behaviour, with the product free to satisfy either. And it is not approved before the duplicate id lands either:
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
   carry it, with the recovery that `AC-0012-0035`, `EX-0012-0112` and
   `EX-0012-0134` give a user whose `DESIGN.md` drifted — restore the file, or
   run the authoring step before restarting from cycle 0, as the command
   contract below orders the two steps; and `spec-0013`'s `US-0013-0009` →
   `AC-0013-0015` → `BR-0013-0012` → `EX-0013-0012` → `TC-0013-0022`, which
   assigns the lock write to Phase 0.
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

   **The prototyping command contract is re-derived with them.**
   `/qfai-sdd --contract .qfai/contracts/cli/qfai-prototyping.md`, mode
   `re-derive`, gives the `DESIGN.md` drift class the authoring step as its
   recovery, and records this Change Request in `spec-0012/09_delta.md`, the
   delta of the spec that references the contract.

4. **The policy layer, under the outcomes its table names.** Every outcome
   reaches at least one policy statement, so an approval of any of them runs
   this action.

   **The policy layer states these rules globally, and different outcomes reach
   different statements.** A pack-level rerun leaves the shared record
   contradicting both the product and the packs it just repaired, so the policy
   rerun is part of the approval, scoped by outcome:

   | Outcome                   | Policy statement re-derived                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
   | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | every statement-A outcome | `_policies/05_Contracts.md`'s prose declaring root `DESIGN.md` to be `/qfai-discussion` output, and `_policies/06_Glossary.md`'s `DESIGN.md` entry, which says discussion authors the file and SDD freezes it — no outcome keeps discussion as the producer                                                                                                                                                                                                                                                                                                                                                                                              |
   | `1A`, `3A`                | `_policies/06_Glossary.md`'s `exploration-first` entry, which asserts the broad no-direction-in-discussion rule these two narrow or retire                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
   | `1A`, `3A`, `2b`          | `_policies/07_Constraints.md`'s `TC-12`, which says the design system is extracted from the prototyping winner direction rather than taken as a discussion input. It is restated to the chain the outcome leaves: `/qfai-sdd` Phase 0 authors root `DESIGN.md` — from the direction discussion records under `1A` and `3A`, and under `2b` from the discussion pack or the import-lite evidence, with no direction chosen in discussion — and the design system is mirrored from that file after the loop                                                                                                                                                |
   | `1B`, `3aB`, `3bB`        | `_policies/08_Decisions.md`'s `DR-0094: prototyping.yaml as Required Side Artifact`, which makes the file a blocker for every discussion pack and rejects making it optional. It takes `Status: superseded`, keeps its text, and gains a `Related` line naming this Change Request. `DR-0240` already states the neutrality these outcomes keep                                                                                                                                                                                                                                                                                                          |
   | `2B`                      | `_policies/08_Decisions.md`'s `DR-0240`, adopted globally, which says readiness must not require `prototyping.yaml`, and `DR-0094: prototyping.yaml as Required Side Artifact`, which requires the file of every pack with no cli-only exception. One new policy Decision Record states the rule `2B` restores — an absent or malformed file blocks a pack with a visual prototyping surface, and a cli-only pack owes none — with a `Context` naming the two records it replaces and a `Related` line naming this Change Request. Both earlier records take `Status: superseded`, keep their text, and gain a `Related` line naming this Change Request |
   | `2a`                      | `DCON-031` in `_policies/05_Contracts.md`, below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

   Each carries its `_policies/10_delta.md` record, and every path is in
   `## Impact scope`.

   **Every rerun in this plan records the Change Request the same way**: one
   row of the delta's `## Change Requests` table — `CR ID`,
   `Upstream artifact`, `Mode`, `Approved by`, `Applied at` — in each pack's
   `09_delta.md` and in `_policies/10_delta.md`, and never a `## Triage` row.

   **And the contract index is re-derived with them.**
   `.qfai/specs/_policies/05_Contracts.md` carries `DCON-031`, which assigns the
   lock freeze to `/qfai-sdd` Phase 0, and repeats the ownership in the prose
   beneath the table. That entry is the repository's global record of who owns
   the artifact, so `2a` reaches it as surely as it reaches the packs. A
   policy-level `/qfai-sdd` re-derivation rewrites the entry and its prose to
   the producer `2a` selects, and records the change in
   `.qfai/specs/_policies/10_delta.md` as that layer requires. Both paths are in
   `## Impact scope`; without them the correction would fail `QFAI-DRIFT-001`
   and the index would keep contradicting every pack the pack reruns above
   repair.

5. `/qfai-sdd` rerun scope: the statements the chosen option names, plus the
   `06_Test-Cases.md` rows that read them.

   The seven ledger rows the seeding contract requires and this pack does not
   have are **not** in this Change Request, and they are **a prerequisite to
   it**. Every selectable outcome invokes a `re-derive` of `spec-0002`, whose
   phase order runs Phase 2b, and Phase 2b seeds those rows and migrates the
   ledger's columns. No `re-derive` mode skips it. So an instruction to leave
   the ledger untouched cannot be followed: a rerun under this approval either
   performs the repair unauthorised, or stops short of a phase its owner skill
   requires, and neither completes the Change Request.

   **The same holds for every other pack an approved outcome re-derives.**
   `spec-0004`, `spec-0012` and `spec-0013` have nine-column ledgers with `E2E`
   rows for 3 of 16, 19 of 52 and 1 of 14 stories, so a `2a` rerun of them, or a
   `2B` rerun of `spec-0013`, would migrate each table to the template's columns
   and seed the missing rows as well. Their ledger repairs are prerequisites on
   the same terms, and **none of the five is written** — not `spec-0002`'s,
   `spec-0010`'s, `spec-0004`'s, `spec-0012`'s or `spec-0013`'s. So an outcome
   that re-derives one of those packs is not approved until its repair
   is written and has landed. This record is refreshed after each repair to
   name, by id, any seeded row whose story an approved outcome changes, with its
   disposition. Two are known now: the `spec-0013` repair seeds the `E2E` rows for
   `US-0013-0009`, the lock story, which are reset to `todo` with this `CR-*` in
   `DR-ID` under `2a`, and for `US-0013-0008`, the side-artifact story, reset
   the same way under `2B`. Each is left as it stands under every other
   outcome.

   **A progressed matrix row stops a rerun at that row, in every pack this plan
   re-derives.** Phase 2b re-scopes a `done` row that runs several independently
   observable cases behind one `Selector` only under a Change Request naming the
   row, its boundaries and the order of its split
   (`.qfai/assistant/skills/qfai-sdd/references/sdd-phase-checklists.md`), and
   this record names no such split. The `spec-0013` ledger repair owes one for
   each of the thirteen rows of that shape in that pack, and it is not written
   yet, so a `spec-0013` rerun under this plan meets none. No record names one
   for the other packs either, whose ledgers hold these rows today:

   | Pack        | Progressed rows whose `Selector` runs more than one case                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Re-derived under          |
   | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
   | `spec-0002` | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | every outcome             |
   | `spec-0010` | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | every statement-A outcome |
   | `spec-0004` | `TDD-0017`, `TDD-0020` and `TDD-0024`, `done` rows running three cases each                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `2a`                      |
   | `spec-0012` | twenty-five `done` rows. Twenty-one run from two cases to nineteen behind one `Selector`: `TDD-0286`, `TDD-0293`, `TDD-0376`, `TDD-0383`, `TDD-0386` to `TDD-0388`, `TDD-0404`, `TDD-0405`, `TDD-0407`, `TDD-0408`, `TDD-0427`, `TDD-0431`, `TDD-0433`, `TDD-0434`, `TDD-0439`, `TDD-0441`, `TDD-0442` and `TDD-0444` to `TDD-0446`. Four carry several `TC-Refs` behind one `Selector`, which is the same conflation written in the other column: `TDD-0336` and `TDD-0337` with four obligations each, `TDD-0338` and `TDD-0342` with two | `2a`                      |

   Several cases can observe one boundary, so the rerun judges each of these
   rows against the obligation it carries. For a row that conflates boundaries
   it raises a request of its own, naming the row, the boundaries and their
   order, and waits on that approval with the row untouched: Phase 2b is the
   only writer that can split the row, and finishing without the split leaves
   it un-split for good. Writing those requests before `2a` is approved spares
   that rerun the wait.

   The repair is recorded in `.qfai/evidence/coverage-depth-spec-0002.md`
   finding 7 and needs its own record. **That record lands first**, and this one
   is applied after it, against a ledger Phase 2b has nothing left to seed.

   **One of the rows that repair seeds is statement A's.** Phase 2b gives
   `US-0002-0005`, the planner-first story, an `E2E` row, and that story is
   statement A's obligation. So once the repair lands, this record is refreshed
   before approval: the row joins `## Blocked downstream items` by its id, with
   this disposition —

   | Outcome    | The `US-0002-0005` row                                                     |
   | ---------- | -------------------------------------------------------------------------- |
   | `1A`, `2b` | reset to `todo` with this `CR-*` in `DR-ID` — both narrow the story        |
   | `2a`       | left as it stands — the story comes back unchanged                         |
   | `3A`       | retired with the story, its id written out here and reserved in the ledger |

   Until the refresh it cannot be named by id, because it does not exist.

   The `10_Plan.md` row citing `TC-0002-0026`, which this spec's table does not
   declare, is **not** in this Change Request. It is independent of both
   statements, the approval record here covers only A and B, and folding an
   unrelated repair into an intent CR means approving one thing and authorising
   two. It is recorded in `.qfai/evidence/coverage-depth-spec-0002.md` and needs
   its own.

6. Downstream ledger sweep. The two statements are settled independently, so the
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
   not reset — for a reason belonging to neither statement, given at step 7.

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

   **Statement B narrows to the visual-surface predicate, not to "optional"
   alone.** The file is optional for a pack with a visual prototyping surface
   and not carried by a cli-only pack, which is UI-bearing and which
   `discussion-completion-matrix.md` forbids it, because `cli` is not a
   prototyping surface. The optional-artifact sentence the three shipped
   documents carry offers the file to every UI-bearing pack, so it moves with
   the statements, and the tests pinning it move with it (`## Impact scope`).
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
     identity is Phase 2b's to write, so the rerun **re-points the row** at a
     case that discharges the narrowed requiredness rule. The same applies under
     option 2, where the in-place repair path cannot touch identity either.

     **Re-pointing, never retirement.** `TC-0002-0011` stays a coverage target
     under options 1 and 2, so the row has an obligation to carry and the
     retirement branch does not apply to it. Retiring it would also need three
     things this record does not give: an entry in the option's retirement list,
     a disposition for its test, and its id reserved in
     `## TDD-ID reservations`. A rerun that deleted the row and seeded a
     replacement would therefore be acting outside this approval, so the
     instruction is the narrower one.

   - Retire: `spec-0002/TDD-0010` — `current preflight unit test pass`.
     **Its test disposition is "none to dispose of".** The row's `Selector`
     resolves to no case in the file it names, so the retirement leaves behind
     no surviving assertion for a later sweep to find and nothing to delete or
     re-point. What is disposed of is the stale selector itself, which goes with
     the row. The retirement procedure asks for an explicit disposition for
     every removed row, and "no matching test exists" is one; leaving the field
     out would make the eventual `Resolution` unable to account for the row.

   **Option 2 — restore the product to the spec.** Statement A's upstream
   statements do not change, and `/qfai-sdd`'s mode is nonetheless `re-derive`:
   they come back unchanged, and the rerun is there for the ledger row whose
   identity `confirm-only` could not touch. **Statement B's do change under
   `2B`**: the requiredness statements are re-derived around the visual-surface
   predicate and `TDD-0012` is reset, as the last bullet of this option sets
   out. The work is implementation, and it is larger
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

   | Option | Who authors `DESIGN.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
   | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `2a`   | `/qfai-prototyping` gains a direction-selection step and authors the file **and `.qfai/contracts/design/DESIGN.md.lock.yaml`**, with its tests. **The direction is the user's, and it is asked in the session that already runs before the loop.** A brand direction is an unfixed design decision, so `.agents/rules/grilling.md` governs it: it belongs on that session's frontier, is recorded under `## Session` in `.qfai/evidence/prototyping/grilling.md`, and is answered before the authoring step runs. An option that adds a step without saying whose choice it carries permits the assistant to pick the brand, which is the behaviour this request opened on. `packages/qfai/tests/assets/prototypingGrilling.test.ts` pins the session's rules and gains the case that the direction is a user-owned decision on the pre-loop frontier. **The new step runs before the existing preconditions, and both artifacts move from the skill's inputs to that step's outputs.** Today the skill lists them under its required inputs and Step 2-A confirms both exist before the loop starts, so on a fresh visual project — where this option leaves `/qfai-sdd` writing neither — the stage would stop before reaching the step meant to create them. The rerun therefore rewrites the input list, Step 2-A and the read-only contract together. The lock is what freezes the file: `prototyping iterate` refuses a lock that is malformed, unreadable or mismatched. It does not refuse a missing one — a run with no lock proceeds unfrozen — although `spec-0012/TC-0012-0347` requires cycle 0 to exit 2 when the lock is absent and `spec-0012/TDD-0356` stands at `done` for it. `2a` closes that branch: the step that authors the file writes the lock before the loop, so a cycle 0 with no lock is a run whose authoring step did not run, and `prototyping iterate` exits 2 as the test case already requires. `packages/qfai/src/cli/commands/prototypingIterate.ts` joins the scope for that branch, with `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`; `TDD-0356` keeps its obligation and takes the in-place re-verification against the changed branch. Discussion still chooses nothing |
   | `2b`   | `/qfai-sdd` Phase 0 authors it from the discussion pack it already reads — the requirements, context and constraints — because Phase 0 runs before a new project has any spec, and no phase order changes. Discussion asks nothing, and on the discussion route no later stage asks either. The requirement is met with no user-facing choice, and whatever a brand needs that the discussion pack does not carry is lost. A spec taken in through import-lite has no pack, so Phase 0 authors its file from the import-lite evidence instead, as the paragraph below the table sets out. **It narrows `US-0002-0005` with the rest of statement A**: that story requires prototyping to remain where the direction is chosen, and `2b` moves the authoring to `/qfai-sdd`, so leaving the story as written would contradict the option settling it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

   **`2b` on the import-lite route.** Phase 0 step 1 stops today on an
   import-lite spec with no root `DESIGN.md`, because no pack recorded a
   direction for it. Under `2b` the input is the import-lite evidence the spec's
   `Source` pair names, which Phase 0 already reads for the surface. `DESIGN.md`
   is authored from the brand material that evidence's `## Sources` and
   `## User provided excerpt` carry, such as an imported product's style guide,
   token file or screens. Where they carry none, Phase 0 keeps its stop on this
   route, asks for that material, and writes the answer into `DESIGN.md`
   itself, since the evidence file is written once. That is the one brand
   question `2b` keeps: `/qfai-sdd` asks it on the import-lite route only, and
   discussion asks nothing on either route. Without it Phase 0 would author a
   brand from nothing for an import that carries no brand material, because an
   import has no reference registry, which is the pack's input for brand and
   tokens. The rerun rewrites Phase 0 step 1 of `qfai-sdd/SKILL.md` and the
   import-lite sentence of `qfai-sdd/references/design-md-authoring.md`, both
   inside the `qfai-sdd/**` paths the `2A` block names.

   `2A` with no letter authorises neither, and withdrawing every producer
   without naming a replacement leaves a new UI project unable to enter
   prototyping at all. Beside that: a validator that emits the single-winner violation
   `TC-0002-0009` names, a preflight that blocks a pack with a visual
   prototyping surface whose `prototyping.yaml` is missing or malformed — and
   lets a cli-only one through, which is UI-bearing and cannot produce it — and
   the three shipped documents rewritten to say the artifact is required. This is the option with the largest blast radius, and
   the direction interview it removes was itself added to stop an assistant
   inventing a brand.
   - **Statement A's rows are not reset; statement B's `TDD-0012` is.**
     Statement A's statements come back from the re-derive unchanged, which is
     what the option means by restoring the product to the spec.

     **Statement B's do not.** `REQ-0005`, `AC-0002-0010` and `BR-0002-0010`
     make requiredness follow from a pack being UI-bearing, and the preflight
     `2B` restores deliberately lets a cli-only pack through — a pack that is
     `ui_bearing: true` and that the discussion playbook forbids the artifact,
     because `cli` is not a valid prototyping execution surface. So `2B` does
     not restore the product to those three statements; it implements a
     different rule, the visual-surface one, and the statements have to be
     re-derived around that predicate exactly as `spec-0013`'s are in approved
     action 2. `TC-0002-0011` moves with them, so **`spec-0002/TDD-0012` is
     reset to `todo` with this `CR-*` in `DR-ID`** under `2B`, and re-pointed in
     the same rerun for the reason option 1 gives. Recording the old obligation
     against an implementation written to violate it is the state this Change
     Request exists to end.

     For statement A's two rows,
     `.qfai/assistant/skills/qfai-implement/references/checkpoint-verification.md`
     admits the approved reset only for a row an approved **upstream** change has
     invalidated. `TDD-0008` and `TDD-0009` keep the obligations they already
     had; what changes is the product beneath them and the assertions that were
     written against the old behaviour. That is the in-place repair
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
     The first three retirements delete no test: each of their files carries
     coverage for other rows and survives intact. **`TDD-0012` follows the
     selected `3a` or `3b` instead**, and under `3b` its case is deleted — the
     table below says so, and a blanket "no test is deleted" would leave an
     operator preserving a case that outcome removes. Each retired row's test
     needs a disposition rather than a file that merely survives. `TDD-0012`'s selector,
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

7. `spec-0002/TDD-0011` is **re-verified, not reset**, under every option. Its
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

8. Reserve every retired `TDD-ID` in the ledger's `## TDD-ID reservations`
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

9. **The coverage records are regenerated by `/qfai-atdd spec-0002`, after
   the owner reruns.** Every outcome changes, re-scopes or retires `spec-0002`
   obligations and the tests behind them.
   `.qfai/evidence/coverage-depth-spec-0002.md` scores those obligations, and
   `.qfai/evidence/atdd-spec-0002.md` restates its totals: 120 scored cells
   today. Option 3 removes rows the matrix still scores, and options 1 and 2
   change the behaviour and the tests behind its cells. The pass starts once the
   reruns, the ledger sweep and `/qfai-implement`'s Change Request preflight
   have written the resets. It runs over every ATDD-owned `spec-0002` row still
   owed when it starts, not only the rows this record names, and through that
   stage's reviewer gate it:
   - re-derives the matrix and the business rule table from the pack as the
     approved outcome leaves it, one row per active obligation;
   - recounts both tables' totals;
   - rewrites the sections naming each `❌` and `⚠️` cell, and the findings;
   - restates the new totals in the ATDD evidence's `## Coverage Depth Matrix`.

   Under `2B` and `2a` the same pass runs as `/qfai-atdd spec-0013`, whose
   matrix scores `US-0013-0008`, `US-0013-0009` and `TC-0013-0022`, the
   obligations those two change. `spec-0010`, `spec-0004` and `spec-0012` hold
   no coverage record that scores an obligation any outcome changes.

   `/qfai-atdd spec-0010` still runs, after that pack's re-derivation and its
   ledger dispositions. There is no record to regenerate, but the pack has
   ATDD-owned rows at `todo` with no test behind them: the `E2E` rows seeded
   for `US-0010-0008` and `US-0010-0009`, the producer row `spec-0010/TDD-0011`
   every statement-A outcome resets, and under `1A` the Integration rows that
   option resets. `/qfai-implement` consumes the test and the RED provenance
   `/qfai-atdd` writes, so without this pass those rows stay at `todo`.

10. **The consultation entry closes in the change that sets `Applied at`.**
    `.qfai/steering/2026-09-12-spec-0002-two-statements-the-product-replaced.md`
    stands at `status: active` and `blocking: true`, and its body says this
    record is open and waits on a decision. Later sessions and reviewer input
    bundles read open work-log entries, so an entry left that way reports a
    settled conflict as a live blocker. Once `Resolution` is filled and
    `Applied at` set, the same change:
    - records the approved option and the date it was applied under the
      entry's `## What the next session picks up`;
    - sets `status: archived`, `blocking: false`, and `updated` to that date;
    - fills `closure-rationale` with this record's ID, its approved option and
      its `Applied at`. The work-log schema requires that field of an archived
      entry whose `promote-to` is `null`.

    `promote-to` stays `null`. The decision is recorded in this Change Request,
    in the Decision Records the reruns amend and in each delta's
    `## Change Requests` table, so the entry has nothing to promote.

## Resolution

Option 1 is being applied. The owner re-derivation and the ledger resets are
done. One retirement is held, so `Applied at` is not set.

The record was refreshed against the tree before it was applied:

- `## Impact scope` was reduced to option 1, which this record requires before
  approval. It had been approved unreduced.
- The `E2E` rows the two ledger repairs seeded joined the blocked set by id:
  `spec-0002/TDD-0016`, `spec-0010/TDD-0025` and `spec-0010/TDD-0026`.
- `CR-20260925-0005` was applied first. It changed `spec-0012` rows only, and
  option 1 names no `spec-0012` row, so no reset, retirement or ownership here
  moved because of it.
- What approved action 4 calls the second `DR-0094` is now
  `DR-0282: prototyping.yaml as Required Side Artifact`, since the duplicated
  policy ids were renumbered. It was edited by heading, as action 4 says.
- Two premises of approved action 6 predate a selector repair of 2026-09-22,
  which pointed every `spec-0002` row at a case that exists:
  - `spec-0002/TDD-0012` already named
    `artifact rules and SKILL.md share namespaced-only semantics for prototyping.yaml`
    in `packages/qfai/tests/assets/assets.test.ts`, not
    `legacy 4-axis format is error`. Its disposition is unchanged: it was reset
    and re-pointed.
  - `spec-0002/TDD-0010` now names
    `does not block when latest UI-bearing discussion pack is missing prototyping.yaml`
    in `packages/qfai/tests/core/sddPreflight.test.ts`, and that case exists.
    The test disposition action 6 gives it, "none to dispose of", no longer
    holds. See the held step below.

The owner re-derivation, `/qfai-sdd` in mode `re-derive`:

| Action | Pack        | What was re-derived                                                                                                                                                |
| ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1      | `spec-0010` | both chains, `REQ-0008` with the scope and policy lines, `DR-0010-0001`, `10_Plan.md`; `TC-0010-0006` now names four boundaries, one per existing row              |
| 4      | `_policies` | the producer prose in `05_Contracts.md`, the `DESIGN.md` and `exploration-first` entries, `TC-12`, and `DR-0282` taking `Status: superseded` with a `Related` line |
| 5, 6   | `spec-0002` | every row of the action 6 table for both statements, and `DR-0002-0001` and `DR-0002-0003`                                                                         |
| `1B`   | product     | the optional-artifact sentence in the four documents and the two tests that pin it                                                                                 |

Each pack's `09_delta.md` and `_policies/10_delta.md` carry the change and a
`## Change Requests` row.

The `/qfai-implement` Change Request preflight:

- Reset to `todo` with this request in `DR-ID`, the prior `Evidence` kept in
  the cell: `spec-0002/TDD-0008`, `TDD-0009`, `TDD-0012` and `TDD-0016`;
  `spec-0010/TDD-0006`, `TDD-0007`, `TDD-0008`, `TDD-0010`, `TDD-0011`,
  `TDD-0025` and `TDD-0026`.
- `spec-0002/TDD-0012` was re-pointed at
  `ensures qfai-discussion skill and artifact rules use canonical pack wording`,
  the case that holds the package README, the discussion skill and its artifact
  rules to one sentence.
- The four `TC-0010-0006` rows gained a `Boundary`: `screen-contract-template`
  (`TDD-0006`), `completion-conditions` (`TDD-0007`), `skill-guidance`
  (`TDD-0008`) and `installed-tree` (`TDD-0010`). The seeded selector of
  `spec-0010/TDD-0011` names the re-derived case.
- Left where they are under option 1: `spec-0013/TDD-0016`,
  `spec-0004/TDD-0008` and `spec-0002/TDD-0001`.
- The two ledger backlogs moved with the resets. The completed rows
  `spec-0002/TDD-0009` and `spec-0010/TDD-0006` to `TDD-0008` left the
  carrier-only list. `spec-0002/TDD-0008` and `TDD-0012` joined the
  open-but-tested list until their re-execution reaches `done`.

**Held: the retirement of `spec-0002/TDD-0010` (action 6) and its reservation
(action 8).** The row's case exists and asserts that the preflight does not
block a UI-bearing pack missing `prototyping.yaml`. No ledger row other than
this one names it, and no test case annotates it. The retirement procedure
requires the case to be deleted or re-pointed at a surviving obligation. This
record chose neither, because it assumed no such case existed. The nearest
obligation is the side-artifact criterion of `spec-0013`, which has no test case
or row, and option 1 does not reach `spec-0013`. The row stays `done` until that
disposition is decided.

Still owed once it is: the `spec-0002/TDD-0011` re-verification (action 7), the
`/qfai-atdd` passes (action 9), closing the consultation entry (action 10), and
`Applied at`.
