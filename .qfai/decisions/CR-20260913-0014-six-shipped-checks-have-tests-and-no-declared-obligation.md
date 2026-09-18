# Change Request

- ID: `CR-20260913-0014`
- Title: `six shipped checks have tests and no declared obligation`
- Raised by: `qfai-implement`
- Raised at: `2026-09-18T04:10:00Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

Six checks ship and run, and each has a test file. None has a test case in any
spec that says what it must do, and no ledger row traces its tests. The tests
once carried annotations naming unrelated obligations, which made them look
traced. With those removed, they carry none.

Each check was read against the product and the spec packs:

| Check                                           | Where it runs                                                                                                    | Declared today                                                                                                                                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design-fidelity scorecard, `QFAI-FID-001..011`  | `runPrototypingValidators` (`packages/qfai/src/core/validate.ts:852`), so `--profile prototyping` and `full`     | Nothing. It was added for a capability since retired. It reads Markdown under a `Fidelity Scorecard` heading, and nothing the package ships writes one: the capture template writes `## taskFidelity` instead |
| Navigation flow, `QFAI-NAV-001..007`            | `runSddValidators` (`validate.ts:777`)                                                                           | Nothing. The `navigationFlow` mentions in `spec-0004` and `spec-0012` are the review-score axis of that name                                                                                                  |
| UI-bearing classification, `isUiBearingSpec`    | Decides whether the `UIX-VAL-*` validators run on a discussion pack (`validate.ts:622`, `:1165`)                 | `spec-0004` `NFR-0003`, "Non-UI packs do not over-fire UI-bearing validators", with no criterion or test case beneath it                                                                                      |
| Traceability integrity, `QFAI-TRACE-001..003`   | The `sdd`, `tdd` and `full` profiles (`validate.ts:772`, `:1047`)                                                | Partly. `spec-0013` `TC-0013-0020` and `TC-0013-0021` cover its wiring into the pipeline. What each code reports has no test case                                                                             |
| Install provenance lock, `confirmPublishedLock` | Every `qfai init` write of the provenance record (`packages/qfai/src/shared/provenance.ts:856`, `init.ts:549`)   | `spec-0003` declares where the record lives and its five file states (`REQ-0030`, `AC-0003-0034`). Nothing covers two writers at once                                                                         |
| Test stub check, `QFAI-TEST-001..003`           | The `atdd` and `tdd` profiles (`validate.ts:958`, `:1028`), behind `validation.testStrategy.forbidTestTodoStubs` | Nothing                                                                                                                                                                                                       |

Three places still name a stale owner:

- `packages/qfai/tests/core/navigationFlow.test.ts:1` reads
  `// QFAI:SPEC-0010 — Navigation Flow Validation`. `spec-0010` is the
  discussion skill.
- `packages/qfai/tests/core/traceabilityIntegrity.test.ts:2` names
  `spec-0038`, which does not exist.
- `.qfai/specs/spec-0011/07_Decisions.md:11` says `uixDetection.test.ts`
  covers `TC-0011-0001..0008`. `spec-0011`'s ledger routes those to other files.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                 | Cost                                                 | Risk                                                                                                                                                                   | Recommended |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Declare five in the spec that owns the command or stage they run in; record the fidelity scorecard as owned by no spec | Five new chains across three packs; one record entry | The fidelity check stays shipped with no obligation until a separate change retires it. That is the state it is in today, now written down                             | ✅          |
| 2   | Declare all six, the fidelity scorecard under `spec-0012`                                                              | Six chains                                           | Specifies a check no QFAI artifact can reach. A test case for it can only be met with a hand-written fixture, and its ledger row would certify behaviour no user meets |             |
| 3   | Record all six as owned by no spec                                                                                     | Six record entries                                   | Five of them gate `qfai validate` or `qfai init`. Leaving a gate unspecified is the defect this record exists to close                                                 |             |

## Proposed change

Option 1. Each new chain takes the next free ids in its pack when the rerun
runs, so this record names no id it allocates.

| Check                     | Owner       | Why that pack                                                                                                     | New chain                                                                                                                                                                                                                                                              |
| ------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navigation flow           | `spec-0004` | A `qfai validate` rule family in the `sdd` profile                                                                | One criterion and one business rule for what the family reports. Test cases for the three error codes: `001` legacy `graph` keyword, `004` unreachable node, `005` error node with no recovery edge. One more for the warnings, which do not fail `--fail-on error`    |
| UI-bearing classification | `spec-0004` | Discharges `NFR-0003`, which has nothing beneath it                                                               | One criterion, one business rule and two test cases: a pack declaring a UI surface is classified UI-bearing, and a pack with a generic flowchart and no screen is not                                                                                                  |
| Traceability integrity    | `spec-0013` | `/qfai-sdd` writes the ledger the check reads, and the pack already owns the check's wiring                       | One criterion and one business rule. Test cases: `TRACE-001` for a changed rule whose linked implementation did not change, `TRACE-002` for a missing or malformed ledger, and `TRACE-003` for a diff git could not produce                                            |
| Install provenance lock   | `spec-0003` | `qfai init` writes the record                                                                                     | One business rule and one criterion for two writers at once. Test cases: a brief absence while another process reclaims the lock is waited out, and a lock owned by someone else is reported without writing                                                           |
| Test stub check           | `spec-0004` | A `qfai validate` rule family with its own config key                                                             | One criterion and one business rule. Test cases: `TEST-001` for a todo stub, `TEST-003` for a skipped test other than a scaffold skeleton `D-SCAFFOLD-PLACEHOLDER` already reports, `TEST-002` when there is nothing to scan, and the config key turning the check off |
| Design-fidelity scorecard | none        | No shipped skill, template or command writes the input it reads, so no obligation stated for it can be met by use | Recorded in `_policies/10_delta.md` as a check owned by no spec, with that reason. Removing the check is a product change and is left to a change of its own                                                                                                           |

The tests that exist already are bound to the new test cases, and a case with
no test gets one:

- `navigationFlow.test.ts`, `uixDetection.test.ts`,
  `traceabilityIntegrity.test.ts`, `provenanceLockConfirm.test.ts` and
  `testTodoStubs.test.ts` carry the annotation of each case they discharge.
- The two stale headers above are corrected. The `spec-0011/07_Decisions.md`
  rationale is left alone: it records why an old decision was taken, and the
  ledger it contradicts is the authority.

## Blocked downstream items

| Item                                                                      | Kind         | Why it depends on the artifact                 |
| ------------------------------------------------------------------------- | ------------ | ---------------------------------------------- |
| The rows Phase 2b seeds for the new test cases in each of the three packs | `ledger-row` | They do not exist until this record is applied |

- Not blocked by this CR: every existing row. No existing test case, criterion
  or rule changes, and the two `spec-0013` rows on
  `traceabilityIntegrity.test.ts`, `TDD-0014` and `TDD-0015`, keep their
  obligations.
- Overlapping open CRs: the open records on `spec-0004` and `spec-0013` edit
  statements this record does not touch, and this one only appends. Where one
  of them appends ids first, this record takes the next free ones. **Every open
  `spec-0013` record that re-derives its ledger is applied before this record's
  `spec-0013` rows are seeded**, so they are seeded into the ledger's final
  shape.

## Impact scope

- Specs: `spec-0003`, `spec-0004`, `spec-0013`, and `_policies` for the
  delta entry
- Plans: `none`
- Tests: the five test files named above, and the rows seeded for them; and,
  through the `/qfai-atdd` passes in action 3, every other ATDD-owned row
  still owed in those three packs that no open Change Request blocks when each
  pass runs, with their `.qfai/evidence/atdd-spec-*.md` files
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR: `03_Acceptance-Criteria.md`,
  `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md`, `09_delta.md`
  and `tdd/test-list.md` of `.qfai/specs/spec-0003/`, `.qfai/specs/spec-0004/`
  and `.qfai/specs/spec-0013/`; and `.qfai/specs/_policies/10_delta.md`

## Decision needed from user

Approve option 1: declare five checks in the pack that owns the command or
stage they run in, and record the design-fidelity scorecard as owned by no
spec?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd` over each of `spec-0003`, `spec-0004` and `spec-0013`, mode
   `re-derive`, appending the chains in `## Proposed change` and nothing else.
   Each run records this Change Request as one row in that pack's
   `09_delta.md` `## Change Requests` table. The `_policies` run records the
   fidelity entry in `_policies/10_delta.md`.

2. Phase 2b of each run seeds one row per new test case at `todo`, recording
   this CR's ID in `DR-ID`. It resets no existing row.

3. **In this order**, per pack:
   1. `/qfai-implement` runs its Change Request preflight. It advances none of
      the new rows and makes no product edit.
   2. `/qfai-atdd` binds each new row to the existing test that discharges it,
      writes a test where none does, adds the annotations, and corrects the two
      stale headers. **That invocation is not limited to these rows**: it takes
      up every ATDD-owned row in the pack still owed when it runs that no open
      Change Request blocks, as that stage's ordinary forward work. None of
      that edits an upstream path.
   3. `/qfai-implement` resumes from that handover. This record makes no
      product edit.

## Resolution

Not yet resolved.
