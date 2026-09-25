# Change Request

- ID: `CR-20260925-0021`
- Title: `The tuning-record case asks for consecutive runs, which a record cannot show`
- Raised by: `test-design-analyst`
- Raised at: `2026-09-25T09:18:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-25T09:19:00Z`
- Approved option: `1`
- Applied at: `2026-09-25T09:20:00Z` — see Resolution
- Superseded by: `-`

## Context

`TC-0017-0083` verifies the record a parallelism tuning change leaves. Its
verify text asks that every moved runner project have "three consecutive run
identifiers recorded against THAT change".

The case reads `07_Decisions.md`. A decision record holds run identifiers, and
it can say which change they belong to. It cannot show that the runs were
consecutive: whether another run of the same lanes fell between two quoted
ones is a fact about the CI history, not about the text. A test of the record
therefore cannot hold the clause as written, and a row that claims to hold it
reports coverage it does not have.

The obligation itself is sound. `BR-0017-0053` requires the author of a tuning
change to record three consecutive green runs, and `EX-0017-0067` repeats it.
That duty falls on the author, and review of the pull request checks it against
the run history. Only the test case asks a record to show it.

Its one ledger row, `TDD-0083`, is at `review-fix`. Its test also pooled the
identifiers of every record section naming the project, so an earlier change's
runs justified a later move of the same project.

## Proposed change

Option 1.

1. `TC-0017-0083`'s verify text asks for what a record can carry. It requires
   three distinct run identifiers in the decision-record section that records
   the move: the last section that names the project and each setting it
   departs with. A moved project fails when no section records its move, or
   when that section quotes fewer than three identifiers. Identifiers in a
   section recording another change, to the same project or to another,
   do not count.
2. `BR-0017-0053` and `EX-0017-0067` keep the consecutiveness duty unchanged.
   Review of the tuning pull request holds it.
3. `TDD-0083` keeps its status, `Test file` and `Selector`. Its test binds the
   identifiers to the recording section and carries a two-change fixture for
   one project that fails.

## Options (at least 3) and recommendation

| #   | Option                                                                                                    | Cost                                   | Risk                                                                                                                               | Recommended |
| --- | --------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Restate the case to what the record carries, and leave the author's duty in the business rule and example | One verify text                        | None found. No criterion, rule or example changes                                                                                  | ✅          |
| 2   | Keep the clause and have the test ask the CI provider whether the quoted runs were consecutive            | A network client in a repository test  | The test depends on the provider's API and its retention, and fails offline or once old runs expire. It also spends the API budget |             |
| 3   | Drop the consecutiveness duty from `BR-0017-0053` and `EX-0017-0067` as well                              | One rule, one example, one verify text | Weakens a rule nobody asked to weaken. The duty is sound and review can hold it                                                    |             |
| 4   | Leave the case as it is                                                                                   | None                                   | The row stays at `review-fix` with a clause no test of the record can satisfy                                                      |             |

## Blocked downstream items

None. `TDD-0083` stays at `review-fix`, where the reviewer's finding put it.

- Not blocked by this CR: every other `spec-0017` row.
- Overlapping open CRs: none name `TC-0017-0083` or `TDD-0083`.

## Impact scope

- Specs: `spec-0017`
- Plans: `none`
- Tests: `packages/qfai/tests/integration/spec0017TuningChangeScope.test.ts`
- Contracts: `none`
- Schema: `none`
- Reviewed unchanged: `.qfai/specs/spec-0017/03_Acceptance-Criteria.md`,
  `04_Business-Rules.md` and `05_Examples.md`. `AC-0017-0029`, `BR-0017-0053`
  and `EX-0017-0067` still state the author's duty.
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0017/06_Test-Cases.md`,
  `.qfai/specs/spec-0017/09_delta.md`

## Decision needed from user

Approve option 1: restate `TC-0017-0083` to the identifiers a record can carry,
bound to the section recording the move, and leave the consecutiveness duty to
review?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0017`, mode `re-derive`, makes steps 1 and 2 of
   `## Proposed change` and records this request in `09_delta.md`.
2. Downstream ledger sweep: no row is reset, retired or seeded. `TDD-0083`
   stays at `review-fix`.
3. `/qfai-atdd spec-0017` records the rework round for `TDD-0083`: a fresh
   falsifiability observation on the revised test.
4. `/qfai-implement spec-0017` resumes `TDD-0083` from `review-fix`, with a new
   review round, to `done`.

## Resolution

Applied under option 1, steps 1 to 3.

- `TC-0017-0083`'s verify text names the identifiers a record carries and the
  section they must sit in.
- `spec-0017/09_delta.md` records this request.
- The test binds identifiers to the section recording the move.

Steps 3 and 4 of the rerun plan are still owed. `TDD-0083` has no rework round
on record yet.
