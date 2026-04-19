# 04_Sources — ソース登録・トレーサビリティ

<!-- このプロジェクトは non-ui (ui_bearing: false) のため、Trend Scan・Competitive Reference Registry は不要 -->

## Source Registry

| SRC-ID   | Title                                                                         | Type     | URL / Path                                                                          | Retrieved  | Notes                                       |
| -------- | ----------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------- | ---------- | ------------------------------------------- |
| SRC-0001 | QFAI v1.7.15 継続開発設計書（rev11）                                          | primary  | `Provided by user: qfai_v1_7_15_packages_qfai_single_pr_completion_design_rev11.md` | 2026-04-17 | rev11 本ディスカッションの直接入力            |
| SRC-0002 | v1.7.15-11 監査レポート                                                       | primary  | `qfai_v1_7_15_11_packages_qfai_audit_report.md`                                     | 2026-04-17 | rev11 設計の起点となった監査報告書            |
| SRC-0003 | QFAI v1.7.15 継続開発設計書（rev10）                                          | primary  | `qfai_v1_7_15_packages_qfai_single_pr_completion_design_rev10.md`                   | 2026-04-16 | rev10 ディスカッション（discussion-20260416195444737）の入力 |
| SRC-0004 | qfai canonical unified requirements spec design v1.0                          | primary  | `qfai_v1.7_canonical_unified_requirements_spec_design_v1.0.md`                      | 2026-04-16 | v1.7 系の統合要件・仕様設計のベースライン      |
| SRC-0005 | v1.7 integrated audit reconciliation                                          | primary  | `qfai_v1_7_integrated_audit_reconciliation.md`                                      | 2026-04-16 | rev10 以前の統合監査調整文書                 |
| SRC-0006 | packages/qfai ソースコード（既存実装）                                         | primary  | `packages/qfai/src/`                                                                | 2026-04-17 | delivery-planner が WS-1/WS-2 実装済みを確認 |

## Source Types

- `primary`: First-hand evidence (design docs, audit reports, source code).
- `secondary`: Derived information (summaries, analyses).
- `external`: Third-party references (specs, RFCs, vendor docs).

## Traceability

| REQ/NFR  | SRC-IDs                  | Notes                                                             |
| -------- | ------------------------ | ----------------------------------------------------------------- |
| REQ-0001 | SRC-0001, SRC-0002       | WS-1: index.ts から runMeasurement / validatePanelScore export 削除 |
| REQ-0002 | SRC-0001, SRC-0002       | WS-1: runMeasurement() 全8カテゴリ refs 非空・concrete 検証        |
| REQ-0003 | SRC-0001, SRC-0002       | WS-1: runMeasurement() screenContractRefs canonical 形式検証       |
| REQ-0004 | SRC-0001, SRC-0002       | WS-1: runMeasurement() l1.axes / l2.axes 非空検証                  |
| REQ-0005 | SRC-0001                 | WS-1: runMeasurement() が validatePanelScore() mandatory 呼び出し  |
| REQ-0006 | SRC-0001, SRC-0002       | WS-1: validatePanelScore() axes 非空検証                           |
| REQ-0007 | SRC-0001, SRC-0002       | WS-1: validatePanelScore() evidenceRefs 厳格検証                   |
| REQ-0008 | SRC-0001, SRC-0002       | WS-2: specCoverage.ts が 01_Spec.md のみスキャン                   |
| REQ-0009 | SRC-0001, SRC-0004       | WS-2: isSpecDeclarationRef() を line-ref only grammar に限定       |
| REQ-0010 | SRC-0001, SRC-0002       | WS-3: measurement.test.ts 現行 DTO へ全面更新                       |
| REQ-0011 | SRC-0001, SRC-0002       | WS-3: panelScore.test.ts 現行 panel score shape で更新             |
| REQ-0012 | SRC-0001, SRC-0002       | WS-3: specCoverage.test.ts 新規作成または既存拡張                   |
| REQ-0013 | SRC-0001, SRC-0002       | WS-3: refSemantics.test.ts 新規作成または既存拡張                   |
| NFR-0001 | SRC-0001                 | 後方互換性完全廃棄: export 互換パスなし                             |
| NFR-0002 | SRC-0001, SRC-0002       | fail-closed 徹底: warning-only / silent fallback 禁止              |
| NFR-0003 | SRC-0001                 | 単一 PR 原子的完結: WS-1/2/3 + README を 1 PR に集約               |
| NFR-0004 | SRC-0001                 | stale テスト完全排除: skip/todo/旧DTO フィクスチャ 0 件            |
| NFR-0005 | SRC-0001                 | predicate consolidation と README 同期義務                         |
| NFR-0006 | SRC-0001                 | TypeScript 型安全: any / @ts-ignore 新規追加 0 件                  |
