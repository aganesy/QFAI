# Feature branch conflict disposition

`feature-v2-conflict-source-manifest.json` records the exact stage-3 bytes and
SHA-256 of four merge inputs. The existing `retired/spec-0003/` and
`retired/spec-0017/` files retain the P7 migration snapshot. The later feature
branch source is preserved under each pack's `merge-input/` directory.
`retired/decisions/feature-v2-cr-manifest.json` records the exact bytes and
SHA-256 of approved CR-20260923-0011 and CR-20260923-0013. DEC-0723 and
DEC-0724 carry their decisions into the current project table.

| Source | Integration |
| --- | --- |
| spec-0003 AC-0003-0031 | Its full-history exception for detection, document scope and pull-request validation is reflected in AC-0002-0004-01. |
| spec-0003 EX-0003-0001/0006/0019 | Current init examples EX-0001-0020-01, EX-0001-0025-01 and EX-0001-0034-02 retain the later assertions, with the story-tree `spec/`, singular `agent/` and singular `_template/` homes. |
| spec-0003 EX-0003-0023 | The old assistant-path deprecation case has no active id-map target. Its later wording is preserved in the exact source snapshot; it is not reintroduced as a story-tree requirement. |
| spec-0003 EX-0003-0034/0035/0043/0046 | EX-0002-0003-04, EX-0002-0004-01, EX-0002-0007-02 and EX-0002-0008-01 now preserve the later CI counts, full-history placement, tracked provenance and ten-dimensional shape. |
| spec-0003 retired TDD ledger | The 121-row P7 snapshot remains the primary archive. The feature branch's 92-row snapshot is byte-preserved. TDD-0001 and TDD-0037 differ in status, scope and evidence; neither observation is silently overwritten. |
| spec-0017 retired TDD ledger | The 106-row P7 snapshot remains the primary archive. The feature branch's 101-row snapshot is byte-preserved. Nine rows differ in scope or status: TDD-0016/0030/0032/0033/0034/0035/0069/0070/0083. Five P7 rows are absent from the feature snapshot. |
| atdd-spec-0017 evidence | The feature branch's ATDD run, grilling notes and routed-row evidence are retained. Its opening ledger count is reconciled with the later 106-row P7 snapshot. |

The old `.qfai/specs/spec-0003/` files are removed from the merge index by the
integration owner after this archive and new-story reconciliation. Their
stage-3 bytes remain available through the exact source snapshots above.
