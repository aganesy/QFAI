# 10 Plan

## Implementation approach

1. TDD micro-cycle engine: Red -> Green -> Refactor -> Done lifecycle
2. test-list.md parser: 8-column table with status tracking
3. Status transition validator: forward-only enforcement, exception with DR-ID
4. Sub-agent roster: 6 agents with handoff contracts
5. Completion gate: 10-point checklist enforcement
6. Evidence contract: per-item fresh evidence validation
7. Parallelization policy: independence check, worktree separation, integration verify

### Intent-driven entry (CAP-0018)

This change introduces no architectural element. It writes `qfai-implement`'s
own `references/orchestrated-mode.md` in the table format CLI-WFFILE owns.

Units and work. The order across the batch is spec-0018 `10_Plan.md` `### Implementation order`.

- **U2:** `qfai-implement/references/orchestrated-mode.md`, holding:
  - the entry check (BR-0011-0009);
  - the Operations table, `diagnose-only`, `implement`, `seam-only`,
    `regression-fix` and `test-fix` (BR-0011-0010);
  - the run binding and `checkpointRef` (BR-0011-0011, 0012);
  - the ledger check never cached (BR-0011-0013);
  - the seam-only work order (BR-0011-0014);
  - diagnose-only and `matchedRowIds` (BR-0011-0015, 0016);
  - the regression fix and its `regressionFix` receipt (BR-0011-0018, 0019);
  - the test-fix record and layers (BR-0011-0020, 0021, 0022).

  Plus one citation line in `qfai-implement/SKILL.md`, which takes it to
  exactly 800 lines.

- **U3:** the carve-out (BR-0011-0017), in the same change as spec-0001's and
  spec-0013's:
  - `references/change-request-reset.md` at its scope-gap line;
  - the two scope-gap lines of `SKILL.md`, edited in place with no line added.

Left out: the core's refusals of a seam, RED and ledger check (spec-0018); the
acceptance-layer `test_fix` (spec-0008).

## Test approach

- Unit tests: status lifecycle transitions, evidence validation, backward transition rejection
- Integration tests: full TDD cycle from todo to done, exception handling, parallel dispatch rules
- E2E tests: end-to-end implement workflow with test-list.md processing

### Intent-driven entry (CAP-0018)

Every case this change adds reads a shipped skill file, so it is `L3`. No code is
written for this spec, so there is no `L1` or `L2` case.

| Layer | What it proves                                                                                                               | Test module, one per BR, under `packages/qfai/tests/integration/implement/orchestrated/` | TCs                        |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------- |
| `L3`  | The entry check and the one `SKILL.md` citation line                                                                         | `stageSkillHandover.test.ts` (BR-0011-0009)                                              | TC-0011-0013               |
| `L3`  | The Operations table is exactly the five implement operations                                                                | `operationsTable.test.ts` (BR-0011-0010)                                                 | TC-0011-0014               |
| `L3`  | A run binding supplies `primarySpecId` without a question                                                                    | `runBinding.test.ts` (BR-0011-0011)                                                      | TC-0011-0015               |
| `L3`  | A long stage resumes at the row `checkpointRef` names                                                                        | `checkpointResume.test.ts` (BR-0011-0012)                                                | TC-0011-0016               |
| `L3`  | The ledger check is made on the current ledger                                                                               | `ledgerCheckNotCached.test.ts` (BR-0011-0013)                                            | TC-0011-0017               |
| `L3`  | A seam-only order lands only the minimal connection; a seam that cannot be landed is returned by who clears it               | `seamOnly.test.ts` (BR-0011-0014)                                                        | TC-0011-0018, TC-0011-0027 |
| `L3`  | Diagnose-only changes no tracked file and names its record in `artifactRefs`                                                 | `diagnoseOnlyNoTrackedFile.test.ts` (BR-0011-0015)                                       | TC-0011-0019               |
| `L3`  | A diagnosis returns one verdict, `matchedRowIds` and `reproductionRef`                                                       | `diagnosisVerdict.test.ts` (BR-0011-0016)                                                | TC-0011-0020               |
| `L3`  | The two scope-gap lines carve out a diagnosed missing test (DR-0297)                                                         | `missingTestCarveOut.test.ts` (BR-0011-0017)                                             | TC-0011-0021               |
| `L3`  | A regression fix leaves the `done` row `done`                                                                                | `regressionFixKeepsDone.test.ts` (BR-0011-0018)                                          | TC-0011-0022               |
| `L3`  | The `regressionFix` receipt and the re-verify round confirm a regression fix                                                 | `regressionFixReceipt.test.ts` (BR-0011-0019)                                            | TC-0011-0023               |
| `L3`  | A test fix leaves `Status`, `TC-Refs`, `Layer` and `Boundary` alone and appends a re-verify round                            | `testFixLedgerRow.test.ts` (BR-0011-0020)                                                | TC-0011-0024               |
| `L3`  | A change of meaning goes to `qfai-sdd` as `needs_repair`                                                                     | `testFixMeaningChange.test.ts` (BR-0011-0021)                                            | TC-0011-0025               |
| `L3`  | Implement takes a test fix only for a unit-layer row                                                                         | `testFixLayers.test.ts` (BR-0011-0022)                                                   | TC-0011-0026               |
| E2E   | The four stories, discharged by spec-0018 journeys (spec-0018 `10_Plan.md` `### Which journey discharges which stage story`) | the spec-0018 journey modules                                                            | US-0011-0009..US-0011-0012 |

Each row's ledger `Test file` names its module above, the per-BR split
`catalog/test-layers.md` `## Test-file granularity` asks for.

Cases that stand alone:

- No case here is matrix-shaped. The four diagnosis verdicts are held literally
  in one case, since reading one file is one observation.
- `regression-fix` and `test-fix` each have their own ledger-row case, because
  their rows differ: `Test file` and `Selector` may change only under a test fix.
- TC-0011-0026 holds the layer boundary: one `L3` test case among `L1` and `L2`
  cases takes an `Integration` row away from this skill.
- The kept failures are TC-0011-0025 (a change of meaning) and TC-0011-0027 (a
  seam that cannot be landed is `blocked` only with its cause in `debts`, `unrun`
  with none, and `needs_repair` where the stage can repair it).

What existing guards hold, so no case is written for it:

- The workflow core's refusals at `accept`: `write-scope`, `seam-passed`,
  `test-fix-meaning`, `test-fix-receipt`, `regression-fix-receipt`,
  `blocked-repairable`, `ledger-done-moved` and `ledger-row-added`. They are
  spec-0018's fault seeds.
- The forward-only row lifecycle stays TC-0011-0002.
- `discussion-20260923171450572#NFR-0003`: the 800-line asset budget holds
  `SKILL.md` at exactly 800 lines, and review of the diff holds the one added
  line.
- No internal identifier in the shipped reference: the distributed-surface
  guards.

Order: the reference is a tier-2 stage asset, and the carve-out lands with
spec-0001's and spec-0013's lines in the same change. The four E2E rows close at
tier 5, in the order spec-0018 `10_Plan.md` `### Order in which the rows go green`
sets.

Findings carried on purpose. Pushes go to one draft pull request that is merged
only when every lane is green, and each push lists its expected findings in the
batch evidence (spec-0018 `10_Plan.md` `### Findings carried on purpose`).

| Finding                                                           | Why it is expected                                                                                                                                                                                                                                                 | Until                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| `QFAI-ATDD-111` naming US-0011-0009..0012                         | The journeys that discharge them do not exist yet. The finding is project-wide and charged to `.qfai/specs/spec-0001`                                                                                                                                              | spec-0018's tier-4 journeys land |
| `QFAI-ATDD-112` naming TC-0011-0013..0027                         | The integration tests do not exist yet. Charged the same way                                                                                                                                                                                                       | ATDD writes them                 |
| `QFAI-ATDD-131` on `.qfai/specs/spec-0011`, pinned at 1 in `full` | The spec has no Coverage Depth Matrix yet. The push that adds its first `.qfai/evidence/coverage-depth-spec-0011.md` re-pins `full` with `node scripts/check-dogfood-backlog.mjs --profile full --pin`, which strikes the entry, since a count below its pin fails | That push                        |

## Dependencies

- Requires: spec artifacts from `/qfai-sdd` (test-list.md populated by SDD)
- Consumed by: `/qfai-verify` for validation gate

## NFR approach

- The legacy floors NFR-0001..NFR-0005 of `01_Spec.md` `## Applicable NFR` are unchanged by the
  intent-driven entry, and their existing measurements stand. The forward-only lifecycle
  (NFR-0002) is where the regression fix lands: the row stays `done`.

### Intent-driven entry (CAP-0018)

- **`discussion-20260923171450572#NFR-0003`: `qfai-implement/SKILL.md` grows by the one citation
  line only, from 799 to exactly 800 of 800.** Met by putting every orchestrated-mode rule in
  `references/orchestrated-mode.md`, and by editing the two scope-gap lines in place. The file then
  has no headroom. Breach: the asset line-budget check at 801 lines, or a pull-request diff that
  adds any other line to the file.
- **NFR-0002 and NFR-0015 for the new reference and the edited `change-request-reset.md`.** Met by
  the existing guards. Breach: the asset line-budget check on either file, or one of the four
  distributed-surface guards reporting an internal identifier or a private version marker in
  them.

## Risk mitigation

- Complex agent orchestration may be difficult to test in isolation
- Mitigation: stop immediately on failed first delegation and return concrete remediation steps for unsupported or misconfigured subagent environments

### Intent-driven entry (CAP-0018)

| Risk                                                                                                                                                      | Likelihood / impact | Mitigation                                                                                                                                             | Trigger to act                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| A later edit adds a line to `qfai-implement/SKILL.md`, which is at the 800-line ceiling                                                                   | high / med          | Every edit to the file replaces text in place, and new rules go into a reference                                                                       | The asset line-budget check failing on the file, or a diff adding a line to it                                |
| A `test_fix` or a `regression_fix` changes a file the row observes but writes no re-verify record, so the `done` row reads as stale and `finish` is unmet | med / high          | The re-run is appended to the row's evidence section as a re-verify record in the form the ledger validator already reads (BR-0011-0019, BR-0011-0020) | `QFAI-TDDLIST-009` on a row a `test_fix` or `regression_fix` names, or `finish` listing that finding as `new` |
| A diagnose-only stage changes a tracked file                                                                                                              | low / high          | Its work order has no write area, so the core refuses the result (`write-scope`), and the skill writes only files git ignores (BR-0011-0015)           | A `write-scope` refusal on a diagnose-only result                                                             |
