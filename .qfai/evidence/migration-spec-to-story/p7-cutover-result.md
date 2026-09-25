# P7 cutover result

## Mapping and preservation

The accepted four-flow scope is in the discussion pack's `05_Scope.md` and
OQ-0020. `plan.yaml` places the 241 active stories in BF-0001 through BF-0004;
`id-map.json` fixes the old-to-new IDs as step 4 wrote them. The source
inventory and disposition records in `p7-mapping-reconciliation.md`,
`criterion-disposition.md`, `example-disposition.md`,
`retired-rule-disposition.md`, and `step04-ex-provenance.csv` account for
removed or rewritten obligations.
The retired source is preserved under `retired/`. The pre-cutover SDD batch
verdicts and their old pack evidence are preserved in `.qfai/evidence/` and
`retired/spec-*/`. The new tree's four flows are the destinations of those
approved obligations. Step 4's unplaced active examples were resolved in the
new tree; `step04-step07-manual-resolution.md` records their provenance.

The tree holds more obligations than the ID map targets. Each one written after
step 4 is listed with its decision row or migration record in
`post-step4-obligations.md`.

| Kind | In the tree | `id-map.json` targets | Written after step 4 |
| ---- | ----------- | --------------------- | -------------------- |
| AC   | 465         | 447                   | 18                   |
| EX   | 730         | 636                   | 97                   |
| BR   | 526         | 514                   | 12                   |

Three EX targets are no longer in the tree: DEC-0719 removed EX-0001-0069-01
and EX-0001-0069-02, and DEC-0730 removed EX-0003-0013-05.

## Execution reports

`reports/initial-run/` contains the complete reports retained from the first
cutover and its repairs. Archival removed only extra blank lines at the end of
each report. The original command harness did not retain measured
exit codes. `expected-exit-codes.csv` classifies the expected 0, 2, or 3 from
each report and the migration command's documented exit behavior. These are
**inferences**, not measured results. The initial step 2 rerun printed only a
prewrite error; its exit code remains unknown. This is a historical evidence
limit and is not replaced by a later measurement.

`reports/final-rerun/` contains the complete reports and measured exit codes
for a fresh dry run, real run, and further rerun of each of the ten steps on
the final tree, run on 2026-09-25 with the package built from commit
`8c0d01e0f`. All ten dry runs finished before the first real run. Every
invocation reports `## Operations` as `none`, and `exit-codes.csv` records the
exit code of each. A hash of every working-tree file, ignored files included,
was the same before and after the thirty invocations. The comparison left out
`.git`, `node_modules`, `tmp/`, the build output and the report directory
itself.

Exit 3 on steps 5 and 8 denotes historical items in `## For a person`, not a
write:

| Step | Items | Disposition                                                                                                    |
| ---- | ----- | -------------------------------------------------------------------------------------------------------------- |
| 5    | 18    | Old test cases in the archived packs, one row each in `step05-step08-tc-disposition.csv`                       |
| 8    | 18    | Old annotations kept as migration test input, the migration-input rows of `step08-for-a-person-disposition.md` |

The step 8 disposition numbers its rows by the earlier report. Line numbers
have moved since, but the 18 items are the same annotations. Its row 4 is now
two lines, 405 and 406 of `bf0004MigrationCutoverE2E.test.ts`. Both are
expected values asserting that step 8 no longer keeps that annotation.

Step 4 exits 0 with no item. The archived work-log whose `spec-0003` scope
spanned three flows now has `scope: global`, as
`step04-step07-manual-resolution.md` records. Step 6 preserves a manually
corrected AC reference, and step 10 has normalized the managed `.gitignore`
block before this final pass.

## Validation boundary

The full validation after removal of the old packs returns exit 1 with
`info=4 warning=19 error=613`. All 613 errors are `QFAI-STORY-006` missing
test annotations, 396 for AC and 217 for EX. There are no layout or chain
errors and no BF finding. The complete AC and EX obligation list is in
`reports/full-validation-20260925-101327.log` (run `run-20260925101327540`),
from the package built at commit `8c0d01e0f`. It matches
`reports/full-validation-20260925-084254.log`, from the build of `092dfaee2`,
in every line but the run ID.

The earliest log, `reports/full-validation-20260925.log`, reported 615 errors
and 20 warnings. The step 8 annotation work cleared AC-0001-0167-01 and
EX-0001-0067-02, and the `W-WORKLOG-SCHEMA` warning for the `spec-0003`
work-log is gone. One `W-WORKLOG-SCHEMA` warning remains, for the `CHG-007`
scope of `.qfai/steering/2026-08-09-chg-007-implementation-standing-brief.md`.

The repository dogfood gate tracks this inherited coverage debt through its
ratchet. This result is not an ATDD PASS.

The final CI result and independent reviewer verdicts remain separate merge
gates.
