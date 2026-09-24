# P7 cutover result

## Mapping and preservation

The accepted four-flow scope is in the discussion pack's `05_Scope.md` and
OQ-0020. `plan.yaml` places the 241 active stories in BF-0001 through BF-0004;
`id-map.json` fixes the old-to-new IDs. The source inventory and disposition
records in `p7-mapping-reconciliation.md`, `criterion-disposition.md`,
`example-disposition.md`, `retired-rule-disposition.md`, and
`step04-ex-provenance.csv` account for removed or rewritten obligations.
The retired source is preserved under `retired/`. The pre-cutover SDD batch
verdicts and their old pack evidence are preserved in `.qfai/evidence/` and
`retired/spec-*/`. The new tree's four flows are the destinations of those
approved obligations. Step 4's unplaced active examples were resolved in the
new tree; `step04-step07-manual-resolution.md` records their provenance.

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
the final tree. Every invocation reports `## Operations` as `none`; the CSV
records the result for each invocation. Exit 3 on steps 4, 5, and 8 denotes
historical items in `## For a person`, not a write. Their dispositions are in
the records above. Step 6 preserves a manually corrected AC reference, and
step 10 has normalized the managed `.gitignore` block before this final pass.

## Validation boundary

The full validation after removal of the old packs returned exit 1 with
`info=4 warning=20 error=615`. All 615 errors are `QFAI-STORY-006` missing
test annotations; there are no layout or chain errors. The complete BF, AC,
and EX obligation list is in `reports/full-validation-20260925.log` (run
`run-20260925062723201`). The repository dogfood gate tracks this inherited
coverage debt through its ratchet. This result is not an ATDD PASS.

The final CI result and independent reviewer verdicts remain separate merge
gates.
