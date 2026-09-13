# Change Request

- ID: `CR-20260913-0006`
- Title: `spec-0014 TDD-0034 is done on a unit row whose evidence has no form it can take`
- Raised by: `qfai-implement`
- Raised at: `2026-09-13T01:15:15Z`
- Class: `intent`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

`TC-0014-0034` is `Level: unit` and expects that "iterate deletes the fullHarness
block as part of the hard reset". Its row, `spec-0014/TDD-0034`, is `done` with a
prose `Evidence` cell and a `Selector`, `cycle 0 deletes fullHarness`, that
matches no case title. The case that carries the obligation is
`re-seeds acceptedIterationIndex / stopReason and deletes reviewerGate /
fullHarness / executionPlan on cycle 0` in
`packages/qfai/tests/cli/commands/prototypingIterate.test.ts`.

The implementation shipped long before the record, so evidence for the row
takes the falsifiability path, and that path needs a `Satisfied-by` value.
`.qfai/assistant/skills/qfai-implement/references/red-not-observable.md` opens
four forms, and none fits this row:

| Form                                                       | Why it does not fit                                                                                                                                                                                                                           |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A sibling `TDD-NNNN` that already satisfies the obligation | No row in the pack builds the cycle-0 deletion                                                                                                                                                                                                |
| The production path and symbol                             | Accepted on an `E2E`, `API` or `Integration` row handed over by `/qfai-atdd`, and refused on a `Unit` row                                                                                                                                     |
| This row's own id and an earlier round                     | Open only to a row resumed from `blocked`                                                                                                                                                                                                     |
| An artifact and the property it already had                | For a property the system had before the spec existed. The line dropping the legacy block was written on 2026-05-06, the day the row was added, and the pack's first document dates from 2026-03-17 (`.qfai/evidence/implement-spec-0014.md`) |

The same reference sends a `Unit` row satisfied by production code no ledger
row owns to `exception`. The row is `done` with no evidence it can record, and
reaching `exception` from `done` takes a reset it has not been given.

The obligation itself is not in dispute: the case deletes `fullHarness`, and a
mutation that stops deleting it leaves the case failing on
`expect("fullHarness" in body).toBe(false)`. The case also asserts four
outcomes the test case does not name — two further deletions and two re-seeds
— but those are other obligations, and a mutation of the `fullHarness` deletion
alone fails at its own assertion, so this row needs no split. What is open is
where the row's evidence can come from.

## Proposed change

Give `TDD-0034` a completable form by one of the options below.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                                                                                                                                                                                                                                                                                                 | Cost                                                                                                                                                                           | Risk                                                                                                                                                                                                              | Recommended |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Record the row as `exception` with an accepted-risk decision, as the reference prescribes for a unit row satisfied by code no row owns                                                                                                                                                                                                                                                                                 | A decision record in `07_Decisions.md`, the row reset from `done` and moved to `exception` with that decision in `DR-ID`                                                       | The obligation is tested and still reads as an exception, and the risk the decision accepts is the absence of a row owning the code                                                                               |             |
| 2   | Re-level `TC-0014-0034` to `integration`, since its case drives `runPrototypingIterate` over files on disk, so the path-and-symbol form opens; move the case into the integration layer and record the evidence against it                                                                                                                                                                                             | `06_Test-Cases.md`, the ledger row's `Layer`, `Test file` and `Selector`, and moving one case between suites                                                                   | The layer then describes where the case sits more than what the obligation is; a later reader may take `integration` as a claim about scope                                                                       |             |
| 3   | Retire `TC-0014-0034` with the chain above it — `AC-0014-0006`, `BR-0014-0006` and `EX-0014-0027`, which no other test case reaches — and `TDD-0034`, and delete the case with them. The block it deletes comes only from legacy runs no current writer produces, and the retirement contract admits no test left without an owner: no surviving obligation states the cycle-0 reset, so the case cannot be re-pointed | `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `05_Examples.md` and `06_Test-Cases.md`, the ledger row and its reservation, and the case in `prototypingIterate.test.ts` | The cycle-0 reset loses its only assertion, for the four outcomes no obligation names as well as for this one: a regression in any of them fails nothing, and the pack no longer says the reset removes the block |             |

Option 2 is recommended. The case is an integration-shaped test already: it
seeds a project, runs the command's entry function and reads the file it
rewrote. Re-levelling states that, and it opens the form the reference already
accepts for exactly that shape, so the row's evidence is ordinary rather than
an exception. Option 1 is the cheapest and costs the ledger an `exception` for a
passing, discriminating test. Option 3 removes an obligation the product still
meets, to escape a form question rather than because the requirement changed.

## Blocked downstream items

| Item                                                                         | Kind         | Why it depends on the artifact                                                                           |
| ---------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------- |
| `spec-0014/TDD-0034`                                                         | `ledger-row` | Its evidence form, and under option 2 its `Layer`, `Test file` and `Selector`, turn on the option chosen |
| `spec-0014/TC-0014-0034`                                                     | `spec`       | Option 2 changes its `Level` and option 3 withdraws it                                                   |
| `spec-0014/AC-0014-0006`; `spec-0014/BR-0014-0006`; `spec-0014/EX-0014-0027` | `spec`       | Option 3 withdraws them with the test case, the only one that reaches them                               |

- Not blocked: every other `spec-0014` row; none names this case or this
  obligation.
- Overlapping open CRs: `CR-20260913-0005` names three other rows of this
  ledger; the two blocked sets do not intersect.

## Impact scope

- Specs: `spec-0014`
- Plans: `none`
- Tests: `spec-0014/TDD-0034` — `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`,
  and under option 2 the integration suite the case moves into
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR, by outcome:

  | Path                                              | Kept under      |
  | ------------------------------------------------- | --------------- |
  | `.qfai/specs/spec-0014/tdd/test-list.md`          | every option    |
  | `.qfai/specs/spec-0014/07_Decisions.md`           | option 1        |
  | `.qfai/specs/spec-0014/06_Test-Cases.md`          | options 2 and 3 |
  | `.qfai/specs/spec-0014/03_Acceptance-Criteria.md` | option 3        |
  | `.qfai/specs/spec-0014/04_Business-Rules.md`      | option 3        |
  | `.qfai/specs/spec-0014/05_Examples.md`            | option 3        |
  | `.qfai/specs/spec-0014/09_delta.md`               | every option    |

  This section is reduced to the approved outcome before `Status: approved` is
  written: `QFAI-DRIFT-001` reads the paths here and not the outcome beside
  them.

## Decision needed from user

`TDD-0034` cannot record evidence in any form the procedure opens for a unit
row. Record it as an accepted-risk `exception` (option 1), re-level its test case
to `integration` so the form it needs opens (option 2), or retire the test case
with the chain above it and its row (option 3)?

## Approved actions (owner skill rerun plan)

1. Owner rerun, by outcome:

   | Option | Rerun                                                                                                                                                                                                                                 |
   | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | 1      | `/qfai-sdd spec-0014`, mode `re-derive`, limited to the decision record the `exception` cites                                                                                                                                         |
   | 2      | `/qfai-sdd spec-0014`, mode `re-derive`: `TC-0014-0034`'s `Level` becomes `integration`, and the ledger row follows it                                                                                                                |
   | 3      | `/qfai-sdd spec-0014`, mode `re-derive`: `TC-0014-0034` is withdrawn with `AC-0014-0006`, `BR-0014-0006` and `EX-0014-0027`. No other test case reaches that criterion, so a chain left above the withdrawn case would end in nothing |

   Each records this Change Request as a row of `09_delta.md`'s
   `## Change Requests` table. Each is a `re-derive`, so its Phase 2b also
   migrates the pack's eight-column ledger to the template's columns and seeds
   one `E2E` row at `todo` for each of the five stories that have none, unless
   `CR-20260913-0005`'s rerun has already done so. Those rows are owed whatever
   this record decides, and they are listed so the approval covers them.

2. Downstream ledger sweep for `spec-0014/TDD-0034`:
   - **Option 1: reset to `todo`** with this Change Request in `DR-ID`, then moved
     to `exception` citing the new decision record.
   - **Option 2: reset to `todo`** with this Change Request in `DR-ID`, because
     the layer it carries changes, and re-pointed to the case in its new suite.
   - **Option 3: retired**, with its `Evidence` cell verbatim —
     `current iterate cycle-0 reset suite pass` — and its id reserved in that
     ledger's `## TDD-ID reservations` before the row is deleted. Its test
     disposition: delete
     `packages/qfai/tests/cli/commands/prototypingIterate.test.ts` "re-seeds acceptedIterationIndex / stopReason and deletes reviewerGate / fullHarness / executionPlan on cycle 0".

## Resolution

Not yet resolved.
