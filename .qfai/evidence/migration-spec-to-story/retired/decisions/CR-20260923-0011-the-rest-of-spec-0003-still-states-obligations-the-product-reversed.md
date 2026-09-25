# Change Request

- ID: `CR-20260923-0011`
- Title: `the rest of spec-0003 still states obligations the product reversed`
- Raised by: `qfai-sdd`
- Raised at: `2026-09-23T11:13:13Z`
- Class: `intent`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-23T11:14:00Z`
- Approved option: `1`
- Applied at: `2026-09-23T11:15:07Z` — see Resolution
- Superseded by: `-`

## Context

`CR-20260923-0006` restated the `spec-0003` statements that said the opposite of
what the product does. It restated only the statements it was asked about, and
listed the others that carry the same contradictions for a follow-up. This
record is that follow-up.

Each claim was checked against the source or shipped asset that implements it
and the test that asserts it. Paths under `src/`, `tests/` and `assets/` are
relative to `packages/qfai/`.

| Statements                                                          | What they said                                                                            | What the product does, and where it is asserted                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TC-0003-0001` verify bullet 1, `EX-0003-0001`                      | `specs/`, `contracts/` and the other artifact directories exist under `.qfai/` after init | `assets/init/.qfai/` ships only `assistant/` and `waivers.yml`, so init writes no artifact directory. `tests/e2e/initE2E.test.ts:42-57` asserts `.qfai/assistant` present and all six of `specs`, `contracts`, `discussion`, `evidence`, `report`, `review` absent. `tests/cli/init.test.ts:483-503` asserts no file under any of them                                                                                                                                                              |
| `REQ-0016`                                                          | The block carries `.qfai/discussion/discussion-*/` and README negations                   | `src/core/gitignore.ts:294-340`: `QFAI_GITIGNORE_BLOCK` writes `.qfai/discussion/*`, then the governance negations. `:268-292` lists the README negations and `.qfai/discussion/discussion-*/` in `QFAI_GITIGNORE_LEGACY_LINES`, which migration strips. Asserted by `tests/cli/init.test.ts:247-266` and `tests/e2e/initE2E.test.ts:454-471`                                                                                                                                                       |
| `EX-0003-0019`                                                      | `.qfai/steering/README.md` is seeded                                                      | `src/cli/commands/init.ts:2139-2142`: `seedProjectSteering` writes `.gitkeep` and `_templates/entry.md` only. `tests/cli/init.test.ts:3581-3605` asserts reading `README.md` rejects                                                                                                                                                                                                                                                                                                                |
| `REQ-0023`, `EX-0003-0023`                                          | The legacy layout is readable for one window, and the finding is a warning on stdout      | `src/cli/commands/init.ts:2856-2872` writes `D-DEPRECATED-PATH` through `error()`, which writes stderr, and names `qfai init --upgrade-assistant-tree`. `src/core/paths/assistantPaths.ts:32-34` fixes the sunset at `1.10.0`. `tests/cli/init.test.ts:4148-4178` runs at 1.10.0 and asserts the legacy file kept, stderr carrying the finding, the sunset and the command, and no `read-compatible`. `:4180-4210` asserts `--upgrade-assistant-tree` still reads the legacy tree                   |
| `EX-0003-0034`                                                      | Two installing declarations, four and three instances                                     | `tests/integration/shippedWorkflowInertness.test.ts:469-518` names the installing jobs `qfai-docs.yml#checks`, `qfai-tests.yml#tests` and `qfai-validate.yml#validate`, and counts 9 on a pull request and 8 on a push, the test lane at its bound of five legs. The shipped templates under `assets/init/root/.github/workflows/` install in those three jobs only; `scope`, `detection` and the aggregates `docs`, `verdict`, `summary` install nothing, and every job declares `timeout-minutes` |
| `EX-0003-0043`                                                      | The provenance record is not in `QFAI_GITIGNORE_BLOCK`                                    | `src/core/gitignore.ts:215-225` re-includes it with `!.qfai/install-provenance.json`. `tests/integration/shippedWorkflowOwnership.test.ts:504-520` asserts that line present and no line that ignores the record                                                                                                                                                                                                                                                                                    |
| `REQ-0027`, `AC-0003-0031`, `EX-0003-0035`                          | Full history is requested by the detection job only                                       | `fetch-depth: 0` at `qfai-tests.yml:95` (`detection`) and `qfai-docs.yml:107` (`scope`), and the pull-request-only depth at `qfai-validate.yml:90` (`validate`). `tests/integration/shippedWorkflowDetection.test.ts:285-385` sanctions exactly those three and requires each                                                                                                                                                                                                                       |
| `REQ-0031`, `EX-0003-0046`, the `CLI-WFSET` §5 line of `01_Spec.md` | Nine dimensions                                                                           | `.qfai/contracts/cli/shipped-workflows.md` §5 lists ten; the tenth is each aggregate's external check name. `tests/integration/shippedWorkflowShapeGate.test.ts:74` holds `CONTRACT_DIMENSION_IDS` as 1 to 10, and `:687` asserts all ten are pinned and diffed                                                                                                                                                                                                                                     |
| `US-0003-0025` Non-goals                                            | A second runner tier waits for a second job class                                         | `tests/integration/shippedWorkflowRunners.test.ts:47` and `:56` hold `QFAI_CI_RUNNER` and `QFAI_CI_LIGHT_RUNNER`. The installing jobs read the first; `scope`, `detection` and the aggregates read the light variable first. `REQ-0028` already states the two classes                                                                                                                                                                                                                              |
| `EX-0003-0006`                                                      | `README.md` stays a regular file                                                          | `tests/e2e/initE2E.test.ts:326-354` asserts no `README.md` in `.agents/`, `.codex/`, `.claude/agents/` or `.github/agents/`. No `README.md` exists anywhere under `assets/init/`                                                                                                                                                                                                                                                                                                                    |

Every claim in the list held. None was found already right and left alone, and
on no row did the product and its tests disagree.

### Found and left as they are

These are outside the list this record answers. Each needs its own decision:

- `BR-0003-0006` still says `README.md` is not symlinked, which presumes a
  README the product no longer writes. `07_Decisions.md` `DR-0003-0005` records
  the retired decision, and `10_Plan.md` still names README generation.
- The `.github/copilot-instructions.md` that init generates
  (`src/cli/commands/init.ts:8148-8150`) says the legacy layout is
  read-compatible during the window and that `D-DEPRECATED-PATH` fires as a
  warning. That is product text, and no test asserts it.

### Test names that still read the old counts

The `TDD-0037` test names in
`tests/integration/shippedWorkflowInertness.test.ts` still read "two installing
job declarations, four and three executing instances" (the `describe` at `:360`)
and "exactly the docs and validate lanes, four instances on a pull request and
three on a push" (the `it` at `:469`), while the case asserts three
declarations, nine and eight. The ledger's `Selector` cell holds the first name.
This record renames no test. `/qfai-atdd` renames them, and the `Selector`
follows in the same change.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                              | Cost                                                                        | Risk                                                                                                                                                                | Recommended |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Restate each listed statement to what the product does and the tests assert. No test or product change                              | Sixteen statements in five files, and one ledger row whose obligation moved | None found. Every restated statement is already asserted by a test named above. The one reset row reopens a case whose backfill never asserted the moved obligation | ✅          |
| 2   | Revert the product to the statements: scaffold the directories, restore the old block, seed the README, reopen the window, and more | Product and test changes across init and all three shipped workflows        | Undoes deliberate changes that `CR-20260923-0006` already declined to undo, and leaves that record's restatements contradicting the product in turn                 |             |
| 3   | Retire the contradicted statements instead of restating them                                                                        | Deletions across five files                                                 | Behaviour the tests assert loses its obligation, and the test cases that cite a retired example lose their `EX-Ref`                                                 |             |

## Proposed change

Option 1. Each statement named in `## Context` is restated to what the product
does and the tests assert. Ids stay as they are.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                                                                              |
| -------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `spec-0003/TDD-0001` | `ledger-row` | `TC-0003-0001` verify bullet 1 moves from "the artifact directories exist" to "none of them exists"; the row is `exception` |

- `TDD-0001` is reset. Its backfill test only reads `init.ts` for the string
  `runInit`, and `DR-0003-0006` closed it on the strength of other suites. The
  moved bullet is an obligation that row's own test has never asserted.
- Not blocked by this CR: `TDD-0006` (`TC-0003-0006`). `EX-0003-0006` changes,
  but `TC-0003-0006` has no verify text, so the row owes nothing new.
- Not blocked by this CR: `TDD-0022`, `TDD-0026`, `TDD-0037`, `TDD-0038`,
  `TDD-0046` and `TDD-0049`. Only the example each case cites changes;
  `CR-20260923-0006` already restated each case's verify text, and it is
  unchanged here.
- Not blocked by this CR: `TDD-0069` (`US-0003-0001`) and `TDD-0088`
  (`US-0003-0025`). Story rows, already `todo`.
- Overlapping open CRs: `none`

## Impact scope

- Specs: `spec-0003`
- Plans: `none`
- Tests: `none`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0003/01_Spec.md`,
  `.qfai/specs/spec-0003/02_User-stories.md`,
  `.qfai/specs/spec-0003/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0003/05_Examples.md`,
  `.qfai/specs/spec-0003/06_Test-Cases.md`,
  `.qfai/specs/spec-0003/09_delta.md`,
  `.qfai/specs/spec-0003/tdd/test-list.md`,
  `.qfai/evidence/coverage-depth-spec-0003.md`

## Decision needed from user

Approve option 1: restate the listed `spec-0003` statements to what the product
does and the tests assert, and reset `spec-0003/TDD-0001`?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0003`, mode `re-derive`, restating the statements in
   `## Context` and recording this Change Request in `spec-0003/09_delta.md`'s
   `## Change Requests` table.
2. Downstream ledger sweep: reset `spec-0003/TDD-0001` to `todo`, with this CR
   in `DR-ID` beside `DR-0003-0006` and cited in `Evidence`. No other row.

## Resolution

Applied under option 1 by `/qfai-sdd spec-0003`, mode `re-derive`.

- `01_Spec.md`: `REQ-0016`, `REQ-0023`, `REQ-0027`, `REQ-0031`, and the
  `CLI-WFSET` §5 line.
- `02_User-stories.md`: the Non-goals of `US-0003-0025`.
- `03_Acceptance-Criteria.md`: `AC-0003-0031`.
- `05_Examples.md`: `EX-0003-0001`, `EX-0003-0006`, `EX-0003-0019`,
  `EX-0003-0023` (input and expected), `EX-0003-0034`, `EX-0003-0035`,
  `EX-0003-0043` and `EX-0003-0046`.
- `06_Test-Cases.md`: verify bullet 1 of `TC-0003-0001`.
- `.qfai/evidence/coverage-depth-spec-0003.md`: Finding 2 says the follow-up
  was applied. The matrix is not rescored.
- `spec-0003/09_delta.md` records this request.
- Ledger rows reset: `spec-0003/TDD-0001`, `exception` to `todo`, `DR-ID`
  `DR-0003-0006, CR-20260923-0011`. Ledger rows retired: none.
