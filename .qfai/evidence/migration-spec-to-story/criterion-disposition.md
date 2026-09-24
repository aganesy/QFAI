# P7 criterion disposition

This register records old criteria that cannot be assigned by the migration
plan without a source-backed decision. The original source remains under
`.qfai/specs/spec-NNNN/03_Acceptance-Criteria.md` until the P7 archive is
captured. No row below may be silently dropped by step 5.

## Resolved after semantic review

| Old criterion | Disposition | Evidence |
| --- | --- | --- |
| AC-0009-0008 | Assign to US-0009-0002 in `plan.yaml` | The story states the missing `paths.specsDir` case and `.qfai/spec` result; old AC states the same condition and output. |
| AC-0012-0009 | Assign to US-0012-0109 in `plan.yaml` | The story resolves all UI-bearing contracts; the criterion's non-UI exclusion is the boundary of that same selection. |
| AC-0015-0010 | Assign to US-0015-0001 in `plan.yaml` | The agent-card story and BR-0015-0018 preserve each merged specialist's responsibilities in the card body. |
| AC-0006-0007/0008 | Assign to new US-0006-0012 in `plan.yaml` | The SDD-added story states the doctor `--fail-on error`/`warning` threshold and both old criteria explicitly reference it. |
| AC-0007-0007/0008 | Assign to new US-0007-0004 in `plan.yaml` | The SDD-added story owns absent action and unreadable `--path` errors with exit 2; both old criteria explicitly reference it. |
| AC-0003-0026 and new AC-0003-0047 | Assign to US-0003-0026 and US-0003-0021 respectively | The SDD split keeps lockfile/cache/install branches in the old criterion and moves the Node support floor to the new criterion. The pre-split source is preserved in `retired/spec-0003/legacy-multistory-criterion.md`. |
| AC-0012-0051 and new AC-0012-0083 | Assign to US-0012-0116 and US-0012-0117 respectively | DR-0012-0034 splits the frozen UI-contract set from the frozen stock-photo license catalog. The pre-split source is preserved in `retired/spec-0012/legacy-multistory-criterion.md`. |
| AC-0010-0001 | Assign to US-0010-0006 | DR-0010-0007 narrows it to screen-contract existence. Existing AC-0010-0005/0007/0008 own the review bundle, root DESIGN and legacy-sidecar absence. The pre-narrowing text is preserved in `retired/spec-0010/legacy-multistory-criterion.md`. |

## Approved superseded criteria: archive, do not migrate

| Old criterion | Active successor | Authority |
| --- | --- | --- |
| AC-0012-0020 | AC-0012-0038 | `spec-0012/09_delta.md` OP-PURGE-070 |
| AC-0012-0021 | AC-0012-0041 | `spec-0012/09_delta.md` OP-PURGE-071 |
| AC-0012-0022 | AC-0012-0041 | `spec-0012/09_delta.md` OP-PURGE-072 |
| AC-0012-0028 | AC-0012-0042 | `spec-0012/09_delta.md` OP-PURGE-073 |
| AC-0012-0029 | AC-0012-0038/0039 | `spec-0012/09_delta.md` OP-PURGE-074 |
| AC-0012-0030 | AC-0012-0046 | `spec-0012/09_delta.md` OP-PURGE-075 |
| AC-0012-0033 | AC-0012-0047 | `spec-0012/09_delta.md` OP-PURGE-076 |

The P7 2.0 scope decision in `spec-0012/07_Decisions.md#DR-0012-0033`
additionally retires the following legacy criteria. The related
`09_delta.md` rows retire BR-0012-0008/0010/0025, EX-0012-0102/0121,
TC-0012-0313/0337 and TDD-0346; verify every source/archive row at cutover.

| Old criterion | Disposition | Current evidence or successor |
| --- | --- | --- |
| AC-0012-0008 | Retire | Historical validator-only conditions do not define a public 2.0 mode. Preserve the old text in the archive. |
| AC-0012-0010 | Retire | Old reserved identifier claims move to migration `id-map.json` and decision provenance, not an active criterion. |
| AC-0012-0031 | Retire | The 130/410-line skill budget conflicts with the restructured skill and references; current behavior is governed by the new skill contract. |
| AC-0013-0010 (second occurrence) | Retire under `spec-0013/07_Decisions.md#DR-0013-0006` and its P7 REMOVE row | The legacy exploration-brief/evaluation-rubric/evaluator-calibration family is rejected by AC-0013-0016. The first occurrence of this ID is separately retired with the old test-case Type column. |
| AC-0013-0011 | Retire under the same decision and P7 REMOVE row | AC-0013-0016 forbids selected-direction; AC-0013-0017 keeps the active design-system requirement. TC-0013-0011 concerns plan finalization and has its own approved P7 REMOVE row. |

The detailed old text, original line, candidate US and review rationale are in
`tmp/p7-ac-semantic-map.csv`. Before P7 cutover, copy that audit into tracked
evidence, close the SDD decisions, then update `plan.yaml#criteria`. Prose
criteria must be converted to Gherkin before step 5; migration does not convert
their wording automatically.
