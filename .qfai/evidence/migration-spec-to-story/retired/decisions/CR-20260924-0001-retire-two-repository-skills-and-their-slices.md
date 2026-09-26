# Change Request

- ID: `CR-20260924-0001`
- Title: Retire two repository skills and their test slices
- Raised by: `requirements-analyst`
- Raised at: `2026-09-24T06:24:06Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user@2026-09-24`
- Approved at: `2026-09-24T06:24:06Z`
- Approved option: `1`
- Applied at: `2026-09-24T07:20:10Z`
- Superseded by: `-`

## Context

The repository is retiring its `pr-fix` and `pr-merge` skills and their
tests. `spec-0017/01_Spec.md#REQ-0011` and its acceptance chain require nine
test slices, including a dedicated slice for each retired suite.
`spec-0017/04_Business-Rules.md#BR-0017-0006` also forbids removing any
matrix leg. Keeping those two legs would leave declared slices with no tests.

## Proposed change

Keep slice alignment for the seven remaining suites. Permit the removal of a
matrix leg when its slice and owned test suite are retired through an approved
change. Continue to declare and condition every remaining leg for change
selection. Keep the runner projects, per-slice scripts, both CI matrices,
both release matrices and release verify's `SUITE_SLICES` aligned. Re-pin the
check-name and cost inventories after the topology changes.

## Options (at least 3) and recommendation

| #   | Option                                                                              | Cost                                     | Risk                                                        | Recommended |
| --- | ----------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------- | ----------- |
| 1   | Retire both skills, suites and matrix legs; revise the spec to seven aligned slices | One coordinated spec and workflow change | Check-name and cost pins must be refreshed                  | Yes         |
| 2   | Retire the skills but keep empty test slices                                        | Smaller workflow diff                    | Violates the no-empty-project requirement and wastes checks | No          |
| 3   | Keep both skills and their tests                                                    | No slice change                          | Retains behavior the user asked to remove                   | No          |

## Blocked downstream items

| Item                 | Kind       | Why it depends on the artifact                                    |
| -------------------- | ---------- | ----------------------------------------------------------------- |
| `spec-0017/TDD-0007` | ledger-row | Its leg-removal oracle enforces the old unconditional prohibition |
| `spec-0017/TDD-0043` | ledger-row | Its literal full-run check names include both retired legs        |
| `spec-0017/TDD-0062` | ledger-row | Its selector and obligation require nine aligned slices           |
| `spec-0017/TDD-0064` | ledger-row | Its obligation names the former script additions                  |
| `spec-0017/TDD-0099` | ledger-row | Its prior release proof does not classify exact seven-slice sets  |
| `spec-0017/TDD-0100` | ledger-row | Its prior fallback proof does not cover an older nine-slice tag   |

- Not blocked by this CR: `spec-0017/TDD-0063` still checks that every
  declared project has tests. The retired projects must be absent for it to pass.
- Overlapping open CRs: none identified for these rows.

## Impact scope

- Specs: `spec-0017`
- Plans: `.qfai/specs/spec-0017/10_Plan.md`
- Tests: `spec-0017/TDD-0007`, `spec-0017/TDD-0043`,
  `spec-0017/TDD-0062`, `spec-0017/TDD-0064`,
  `spec-0017/TDD-0099`, `spec-0017/TDD-0100`
- Contracts: none
- Schema: none
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0017/01_Spec.md`,
  `.qfai/specs/spec-0017/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0017/04_Business-Rules.md`,
  `.qfai/specs/spec-0017/05_Examples.md`,
  `.qfai/specs/spec-0017/06_Test-Cases.md`,
  `.qfai/specs/spec-0017/07_Decisions.md`,
  `.qfai/specs/spec-0017/09_delta.md`,
  `.qfai/specs/spec-0017/10_Plan.md`,
  `.qfai/specs/spec-0017/16_Traceability-ledger.md`,
  `.qfai/specs/spec-0017/tdd/test-list.md`

## Decision needed from user

The user approved option 1 in this session: revise `spec-0017` in the same
pull request, reduce the aligned set from nine to seven, and resolve the
matrix-leg deletion rule.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0017` revises the requirement chain and records this
   approval in `09_delta.md`.
2. Reset to `todo`, recording this CR in `DR-ID` and retaining old
   evidence as history: `spec-0017/TDD-0007`, `spec-0017/TDD-0043`,
   `spec-0017/TDD-0062`, `spec-0017/TDD-0064`,
   `spec-0017/TDD-0099`, `spec-0017/TDD-0100`.
3. The implementation stage updates the surviving test oracles, matrix lists
   and pins, then re-executes those rows.
4. The retired skill tests are deleted with the skills. No active
   `spec-0017` test-case ID or ledger row is retired.

## Resolution

The `/qfai-sdd spec-0017` owner revision updated the requirements,
acceptance criteria, business rules, examples, test cases, decisions, plan
and delta named above. It reset `spec-0017/TDD-0007`,
`spec-0017/TDD-0043`, `spec-0017/TDD-0062`,
`spec-0017/TDD-0064`, `spec-0017/TDD-0099` and
`spec-0017/TDD-0100` to `todo`, with this CR in `DR-ID`.
No ledger row was retired. Prior proof stays in the historical evidence files
and is linked from each reset row; it does not credit the revised obligation.
The targeted acceptance tests pass against the updated workflow and release
classifier, and each changed obligation rejects a focused mutation.
Their commands and results are recorded in
`.qfai/evidence/atdd-spec-0017.md#retired-slice-verification`.
The six ledger rows remain `todo` until their formal implementation cycles
and reviewer evidence are complete.
