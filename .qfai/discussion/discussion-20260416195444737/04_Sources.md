# 04_Sources — ソースレジストリ

> **注**: 本パックは `ui_bearing: false`（non-UI）のため、Trend Scan および Competitive Reference Registry は不要。

---

## ソースレジストリ

| ID | タイトル | 種別 | 場所 / パス | 参照理由 |
|---|---|---|---|---|
| SRC-0001 | QFAI v1.7.15 継続開発設計書（packages/qfai 限定・単一PR・破壊的変更・rev10） | 設計書 | `qfai_v1_7_15_packages_qfai_single_pr_completion_design_rev10.md` | 本ディスカッションパックの一次ソース。WS-1〜WS-4 の要件定義、設計判断、完了基準を含む |
| SRC-0002 | QFAI v1.7 Canonical Unified Requirements Spec Design v1.0 | 仕様書 | `qfai_v1_7_canonical_unified_requirements_spec_design_v1.0.md` | rev10 が参照するベースライン仕様。型定義・バリデーションルール・traceability chain の原典 |
| SRC-0003 | QFAI v1.7 Integrated Audit Reconciliation | 監査報告 | `qfai_v1_7_integrated_audit_reconciliation.md` | rev1〜rev9 の累積的変更と未解決項目の統合監査レポート。rev10 設計の前提 |
| SRC-0004 | prototypingEvidence.ts（現行実装） | ソースコード | `packages/qfai/src/core/validators/prototypingEvidence.ts` | WS-1・WS-3 の修正対象。現行バリデーションロジックとギャップを把握するための参照 |
| SRC-0005 | execution.ts（現行実装） | ソースコード | `packages/qfai/src/core/prototyping/execution.ts` | WS-1・WS-4 の修正対象。runtime が生成する出力フォーマットの現行実装 |
| SRC-0006 | QFAI v1.7.15-10 packages/qfai 監査レポート | 監査報告 | `qfai_v1_7_15_10_packages_qfai_audit_report.md` | 本 PR を発動させた直近の監査。4つの semantic closure ギャップを特定 |

---

## ソース利用マッピング

| REQ / OQ | 参照ソース |
|---|---|
| REQ-0001〜REQ-0004（WS-1） | SRC-0001, SRC-0002, SRC-0004, SRC-0006 |
| REQ-0005（WS-2） | SRC-0001, SRC-0002, SRC-0005 |
| REQ-0006（WS-3） | SRC-0001, SRC-0002, SRC-0004, SRC-0006 |
| REQ-0007（WS-4） | SRC-0001, SRC-0002, SRC-0005, SRC-0006 |
| REQ-0008（同期） | SRC-0001 |
| REQ-0009（ネガティブフィクスチャ） | SRC-0001, SRC-0006 |
| OQ-0001（terminationReason マッピング） | SRC-0001, SRC-0002 |
| OQ-0002（refSemantics.ts 配置） | SRC-0001 |
| OQ-0003（runtimeGate / specCoverage ヘルパー） | SRC-0001, SRC-0004 |
| OQ-0004（bare path 禁止） | SRC-0001, SRC-0002 |
