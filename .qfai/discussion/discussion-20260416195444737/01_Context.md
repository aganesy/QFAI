# 01_Context — QFAI v1.7.15 packages/qfai 単一PR完結設計

---

## メタデータ

| 項目 | 値 |
|---|---|
| Discussion ID | discussion-20260416195444737 |
| 日付 | 2026-04-16 |
| オーナー | agent |
| ソース設計書 | qfai_v1_7_15_packages_qfai_single_pr_completion_design_rev10.md |
| ui_bearing | false |
| primary_surface | non-ui |
| ステータス | draft |

- ui_bearing: false
- primary_surface: non-ui
- secondary_surfaces:
- classification_rationale: packages/qfai 内部実装変更のみ。UIサーフェスなし。

---

## ゴール

`packages/qfai` v1.7.15 を単一 PR で **completion** 状態（直接ブロッカーゼロ・バリデータ通過・全テスト GREEN）に収束させる。

---

## 背景

rev1〜rev9 の設計イテレーションにより direct blocking（型エラー・ビルドエラー・クリティカルテスト失敗）は解消された。  
しかし v1.7.15-10 監査レポートにより、以下の **semantic closure** の欠落が発覚した。

1. **Terminal semantics state machine（WS-1）** — `fullHarness` の outcome フィールド（`status`, `terminationReason`, `finalDecision`, `reviewerSignoff`）が状態機械の遷移制約を強制していない。`in-progress` 状態でも `terminationReason` が存在できてしまう等。
2. **Canonical screen contract refs（WS-2）** — `buildScreenContractInputs()` がルートスラグからアンカーを生成しており、`readCanonicalScreenContracts()` の `sourceRef` を直接利用していない。
3. **Iteration category refs 厳格化（WS-3）** — `fullHarness.iterations[].evidenceRefs.*` の全カテゴリ（render, browserQa, uiObservation, discussion, screenContract, trend, runtimeGate, specCoverage）が「非空かつ具体的な artifact ref である」という検証がない。
4. **Semantic declaredRef（WS-4）** — `specs[].coverageRefs[].declaredRef` が `.qfai/specs/` パスかつ行/宣言アンカー付きであることを強制していない。ディスカッション ref やスクリーンコントラクト ref が混入できてしまう。

これら4つのワークストリームを1つの PR で同時に修正・テスト・ドキュメント同期する。

---

## スコープ概要

**対象**: `packages/qfai/**` のみ  
**非対象**: `.qfai/**`（運用ディレクトリ）、calibration pack 再設計、スコアリング rubric 再設計、Browser QA オーケストレーション再設計、non-UI prototyping 再導入、standard/low-cost mode 再導入、マイグレーションサポート

**破壊的変更**: あり（後方互換性を完全に廃棄）。レガシーフィクスチャなし、warning-only パスなし、互換エイリアスなし。

---

## ステークホルダー

| ロール | 責務 |
|---|---|
| QFAI 開発チーム | 実装・レビュー・マージ |
| completion-reviewer | WS 完了基準の検証 |
| requirements-reviewer | REQ トレーサビリティの検証 |
| architecture-reviewer | WS-1〜WS-4 のアーキテクチャ影響評価 |

---

## 影響ファイル

| ファイル | 変更種別 |
|---|---|
| `packages/qfai/src/core/prototyping/runtime.ts` | 修正（WS-1） |
| `packages/qfai/src/core/prototyping/history.ts` | 修正（WS-1） |
| `packages/qfai/src/core/prototyping/execution.ts` | 修正（WS-1, WS-4） |
| `packages/qfai/src/core/evidence/l2Evidence.ts` | 修正（WS-3） |
| `packages/qfai/src/core/evidence/screenContracts.ts` | 修正（WS-2） |
| `packages/qfai/src/core/validators/specCoverage.ts` | 修正（WS-4） |
| `packages/qfai/src/core/validators/prototypingEvidence.ts` | 修正（WS-1, WS-3） |
| `packages/qfai/README.md` | 修正（ドキュメント同期） |
| `packages/qfai/tests/core/fullHarnessRuntime.test.ts` | 修正（WS-1） |
| `packages/qfai/tests/core/prototypingEvidence.test.ts` | 修正（WS-3） |
| `packages/qfai/tests/core/prototypingExecution.productionPath.test.ts` | 修正（WS-4） |
| `packages/qfai/src/core/prototyping/refSemantics.ts` | 新規（任意・OQ-0002 で defer） |
| `packages/qfai/tests/core/prototypingEvidence.semanticRefs.test.ts` | 新規（任意・OQ-0002 で defer） |
