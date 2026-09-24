# 09 Delta

## 2026-09-24 — Criterion-scoped report examples

DR-0005-0003 separates the eight outcomes previously routed through EX-0005-0004. Its Markdown case stays EX-0005-0004→AC-0005-0001. JSON becomes EX-0005-0018→AC-0005-0002. EX-0005-0019..0024 respectively cover AC-0005-0003..0008, with the original TC-0005-0003..0008 retained as provenance. These are UPDATE:MODIFY and UPDATE:APPEND source rows for the P7 EX mapping; no old example is retired.

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-04-01
- Primary: spec-0005 新規作成（旧 spec-0003 の統合）
- Tags: report, markdown, json, consolidation

- Change ID: DELTA-0002
- Date: 2026-09-24
- Primary: spec-to-story batch `sdd-batch-20260923100952585`
- Tags: report, story-tree, flow-scope
- Summary: on the story tree the report is written per business flow,
  `qfai report --flow BF-NNNN` scopes it, and `--spec` is refused there and
  removed at P7. Recorded under `## 2026-09-24 — spec-to-story batch record`.

## Migration Record

| Old Spec  | Title       | Key Changes                                                                                                     |
| --------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| spec-0003 | qfai report | Core functionality retained. IDs renumbered to 0005-XXXX. phase guard and spec-pack report added as explicit US |

## Outdated Content Removed

- 旧 spec-0003 では暗黙的だった phase guard と spec-pack レポートを US-0005-0007, AC-0005-0008 として明示化
- 実装に合わせて validate.json の形式検証ルール（isValidationResult）を BR-0005-0005 として明示化

## Adopted

- Adopted: 旧 spec-0003 を spec-0005 として再番号付け
- Why: v2.0 のスペック番号体系に合わせるため

## Rejected

- Candidate: 旧番号（spec-0003）を維持する
- Reason: 新番号体系は CAP-0005 に揃えるため
- DO NOT: 旧 spec-0003 の番号でテスト/コード内の参照を残さないこと
- Temptation: 旧番号維持は変更が少ないが、番号体系の不整合が将来の混乱を招く

## v1.7.13 (2026-04-04) — Canonical Sidecar Convergence

- adopted: REQ-0028 (Prototyping report observability section) 追加
- adopted: US-0005-0008, AC-0005-0009~~0010, BR-0005-0009, EX-0005-0009~~0010, TC-0005-0009~0010 追加
- rationale: v1.7.13 report.ts に prototyping observability section が追加された実装の仕様反映

### v1.7.13 補完 (2026-04-04)

- adopted: BR-0005-0010~~0012, EX-0005-0011~~0012, TC-0005-0011~0012 追加
- rationale: コミット履歴分析で特定された mode provenance, fullHarness, calibration スキーマの設計意図補完

### v1.7.13 収束 (2026-04-05)

- adopted: US range 更新 US-0005-0001..US-0005-0008
- rationale: US-0005-0008（prototyping observability section）が US range に含まれていなかった修正

## v1.7.14 (2026-04-07) — Report Terminology Canonical 統一

- adopted: REQ-0029（Report Terminology Canonical 統一）追加
- rationale: v1.7.14 の breaking change を仕様に反映:
  - **"Compatibility Issues" → "Canonical Issues"**: レポートの issue カテゴリセクション名と issuesByCategory キーを "compatibility" → "canonical" に変更（DR-0294）
  - **Surface inference fallback**: surface 推定不能時に "mixed" にフォールバックし warning を付与（旧: エラー）
  - **バージョン更新**: レポート内バージョンコメント v1.7.13 → v1.7.14

## Triage (2026-09-23 spec-to-story)

| Source                                                                       | Subject                                                                                                        | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                                                                                                                                                                                                                                                                                 | Depends-On |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0013 | The spec-pack report becomes a spec-tree report                                                                | spec-0005     | UPDATE    | MODIFY | -             | Slice C; the old report ends when the rewrite lands                                                                                                                                                                                                                                                                       | OQ-0170    |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0013 | `qfai report --flow BF-NNNN` scopes the run to one business flow; `qfai report --spec` on a story tree exits 2 | spec-0005     | UPDATE    | APPEND | -             | Slice A, selected by the detected layout. Decided by the user in the Phase 2 grilling (Q2): `--flow BF-NNNN` replaces `--spec`, and skills gate per flow. Conservation pairs with this spec's `--spec` REMOVE row                                                                                                         | -          |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0013 | Remove the `--spec <spec-id>` scope of `qfai report`                                                           | spec-0005     | UPDATE    | REMOVE | yusuke_senaga | Slice C, lands P7. Decided by the user in the Phase 2 grilling (Q2): `--flow BF-NNNN` replaces `--spec`, and skills gate per flow; the answer approves this row. No item in this spec states the scope today, so the row removes the flag in code and the tests that pin it. Replacement: this spec's `--flow` APPEND row | OQ-0170    |

## 2026-09-24 — spec-to-story batch record

The record of the `/qfai-sdd` batch run `sdd-batch-20260923100952585` for this
spec, summarised as DELTA-0002 under `## Change Summary`. Its rows are under
`## Triage (2026-09-23 spec-to-story)` above, and every decision it applies is
in `.qfai/evidence/sdd-batch-20260923100952585.md`. Nothing is retired or
tombstoned by this record: a REMOVE row's items stay until the change that
lands the row (ruling X3).

### What this run changed

- Added: US-0005-0009, AC-0005-0011..0013, BR-0005-0013..0016,
  EX-0005-0014..0017, TC-0005-0014..0017, and ledger rows TDD-0019..0026, all
  at `todo`. TDD-0026 is the E2E row of US-0005-0009.
- Changed by adding a clause marked "on the story tree" beside the current one
  (ruling X1), and translated to English: US-0005-0007 and AC-0005-0007.
- `01_Spec.md`: Consumer View, Scope, the REQ-0026 line, one line citing the
  discussion pack, and the US range.
- `10_Plan.md`: a `### Story-tree layout` subsection under each heading the
  change touches.
- Unchanged: every existing TC, TC-0005-0007 included, and every existing
  ledger row (ruling X2).
- Skipped and never reissued (ruling X14): BR-0005-0005..0012,
  EX-0005-0006..0013 and TC-0005-0011..0013, which git history shows were
  retired.

### Where each row lands

Delivery is three pull requests (P3-C1 to P3-C3): P1 on its own and merged
first; P2 to P8 in one pull request that also carries `/qfai-atdd` and
`/qfai-implement` with their tests; then the removal of the migration memo's
guard exception. Every row of this spec lands in the second.

| Triage row                         | Operation     | Lands | Items                                                                                                                         |
| ---------------------------------- | ------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| Spec-pack report becomes per flow  | UPDATE:MODIFY | P7    | US-0005-0007; AC-0005-0007; BR-0005-0013; EX-0005-0014; TC-0005-0014 (TDD-0019, TDD-0020); the Scope bullet and REQ-0026 line |
| `--flow BF-NNNN`; `--spec` refused | UPDATE:APPEND | P3    | US-0005-0009; AC-0005-0011..0013; BR-0005-0014..0016; EX-0005-0015..0017; TC-0005-0015..0017 (TDD-0021..0025); TDD-0026       |
| Remove `--spec`                    | UPDATE:REMOVE | P7    | See the next section                                                                                                          |

TDD-0023 belongs to the `--flow` row but goes green only at P7: it asserts that
only the named flow's directory is written, and per-flow directories exist only
after the P7 rewrite of `packages/qfai/src/core/specPackReport.ts`.

### What the REMOVE row retires at landing

**Remove `--spec` from `qfai report` (P7).**

- In this spec: nothing. No item states the scope, and no ledger row of this
  spec covers it.
- In code: the `--spec` handling in `packages/qfai/src/cli/commands/report.ts`
  and the `report.spec-<ids>` names it builds through the `spec-` unit of
  `scopedReportPath`, which spec-0004's `--spec` REMOVE row deletes.
- Tests that pin the flag today, re-derived when the row lands: the `--spec`
  cases of `packages/qfai/tests/cli/report.test.ts`.

### Co-changes the landing carries

- **P3.** `report.ts` names its scoped files through `scopedReportPath` as
  spec-0004's plan generalises it, and `packages/qfai/src/cli/main.ts` lists
  `--flow` in the help text.
- **P7.**
  - The landing drops the current clause from US-0005-0007, AC-0005-0007, the
    Scope bullet and the REQ-0026 line, leaving the marked one (ruling X1,
    OQ-0170). TC-0005-0007 keeps its text until then and is brought to the
    per-flow report in the same commit.
  - spec-0007's P7 change makes `packages/qfai/src/core/report.ts` pass both
    story-tree directories to `loadDecisionGuardrails`, so the report's
    guardrail section reads the same files as `qfai guardrails`. Only
    spec-0007's plan states this.
  - `packages/qfai/src/core/report.ts` and `specPackReport.ts` call
    `buildContractIndex`, which does not change before P7.

### Recorded drift

Found while drafting and left as it is, because no row of this run covers it
(ruling X11).

- `qfai report` has no contract file. BR-0005-0014..0016 cite
  `.qfai/contracts/cli/qfai-validate.md#flow-scope`, which states both
  commands' flow scope. Open.
- No test under `packages/qfai/tests/` carries a spec-0005 annotation, and
  ledger rows TDD-0001..0008 cite
  `packages/qfai/tests/integration/reportSpec0005.test.ts`, which does not
  exist. Nothing today pins the per-spec report the P7 rewrite removes, and the
  new `todo` rows are the first annotated tests. Open under OQ-0024.
- Removing `--spec` at P7 keeps an explicit refusal: `--spec` still exits 2
  with a message naming `--flow BF-NNNN`, so AC-0005-0012, BR-0005-0015 and
  TC-0005-0016 keep holding. Settled by review ruling D8b in the batch record.

### Adoption and rejection

- Adopted (ruling G4-15): on the story tree the report unit is the business
  flow, one directory `<outDir>/business-flow-NNNN/` per flow holding
  `coverage.md` and `traceability-graph.json`, with node types BF, US, AC, EX,
  BR and CON.
- Rejected: one report for the whole story tree.
  - DO NOT: replace the per-spec reports with a single tree-wide report.
  - Temptation: it is the smallest rewrite of `specPackReport.ts`. Parallel
    workers gate per flow, and a single report has no file of their own to
    write.
- Rejected: re-filtering the unscoped `validate.json` inside report.
  - DO NOT: derive a flow's result in report from the unscoped result.
  - Temptation: report already reads `validate.json`, so filtering it looks
    free. Report would then apply a scope validate never applied.
- Rejected: a scoped-name helper of report's own.
  - DO NOT: build `report.flow-<ids>` or `validate.flow-<ids>.json` outside
    `scopedReportPath`.
  - Temptation: a local helper saves an import. Two helpers drift apart, and
    report then misses the file validate wrote.
