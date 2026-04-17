# 01_Context — QFAI v1.7.15-rev11 セマンティッククロージャ完結

---

## UI-bearing 分類

- ui_bearing: false
- primary_surface: non-ui
- secondary_surfaces:（なし）
- classification_rationale: `packages/qfai` TypeScript ライブラリの内部実装変更のみ。ユーザー向け UI サーフェスなし。

---

## メタデータ

| 項目 | 値 |
|---|---|
| Discussion ID | discussion-20260417072340789 |
| 日付 | 2026-04-17 |
| オーナー | agent |
| ソース設計書 | qfai_v1_7_15_packages_qfai_single_pr_completion_design_rev11.md |
| ui_bearing | false |
| primary_surface | non-ui |
| ステータス | draft |

---

## ゴールと完了基準

**ゴール**: v1.7.15-11 監査で特定された3つの残存 semantic closure ギャップを単一 PR で閉じ、`packages/qfai` の public API 表面とバリデーション契約を完全に確定させる。

**測定可能な完了基準**:

1. `runMeasurement` / `validatePanelScore` が `src/core/index.ts` からエクスポートされていない（`export *` によるリークを含む）
2. `isSpecDeclarationRef()` が `.qfai/specs/<specId>/01_Spec.md#L<正整数>` のみを許可し、`notes.md` / `appendix.md` / `#anchor` / `#L0` / 絶対パス等をすべて拒否する
3. `specCoverage.ts` の `parseSpecDeclaration()` が `01_Spec.md` のみを読み込み、同ディレクトリ内の他の `.md` ファイル（`notes.md`・`appendix.md` 等）を無視する
4. `measurement.test.ts` / `panelScore.test.ts` が v1.7.15-rev11 DTO 形状に完全に準拠している
5. `specCoverage.test.ts` / `refSemantics.test.ts` が存在し、rev11 固有のセマンティック境界（`01_Spec.md` 限定スキャン・`#L<n>` 限定許可等）をカバーしている
6. `pnpm format:check && pnpm lint && pnpm check-types` 通過
7. `pnpm test` 全テスト GREEN

---

## ステークホルダー

| ロール | 責務 |
|---|---|
| QFAI 開発チーム | 実装・レビュー・マージ |
| completion-reviewer | 完了基準（DoD）の検証 |
| requirements-reviewer | REQ トレーサビリティの確認 |
| ライブラリ利用者 | `runFullHarness` が唯一の公開エントリポイントであることの確認 |

---

## 背景

### ビジネスコンテキスト

QFAI は specification-driven development の検証フレームワーク CLI。`packages/qfai` は npm パッケージとして公開されており、その public API はライブラリ利用者に対して型安全かつコントラクトが明示されたインターフェースを提供しなければならない。v1.7.15 は `runFullHarness` を唯一の production-path エントリポイントとする設計の major 改訂。

### 技術コンテキスト

- `packages/qfai/src/core/harness/measurement.ts` の `runMeasurement()` と `harness/panelScore.ts` の `validatePanelScore()` は `runFullHarness()` から呼ばれる内部ヘルパーとして設計されているが、`index.ts` から public export されている（または export される可能性がある）。
- `refSemantics.ts` の `isSpecDeclarationRef()` は `declaredRef` の形式を検証する述語だが、許可スコープが広すぎると `notes.md`・`appendix.md`・`#anchor` 形式の ref が通過してしまう。
- `specCoverage.ts` の `parseSpecDeclaration()` が spec ディレクトリ内の全 `.md` ファイルをスキャンする場合、`01_Spec.md` 以外のファイルの `ui_route:` 宣言が `declaredRef` に混入するリスクがある。
- ハーネス系テストファイルが v1.7.15-rev11 で確定した DTO 形状に追従していない可能性がある。

**実装対象ファイル**:

| ファイル | 変更種別 |
|---|---|
| `packages/qfai/src/core/prototyping/refSemantics.ts` | 修正（`isSpecDeclarationRef` の semantic 制限） |
| `packages/qfai/src/core/prototyping/specCoverage.ts` | 修正（`01_Spec.md` 専用スキャン） |
| `packages/qfai/src/core/harness/panelScore.ts` | 修正（`validatePanelScore` 厳格化確定） |
| `packages/qfai/src/core/harness/measurement.ts` | 修正（カテゴリ ref 全8種 + panel validator 呼び出し） |
| `packages/qfai/src/core/index.ts` | 修正（`runMeasurement` / `validatePanelScore` 非公開化） |
| `packages/qfai/tests/core/harness/measurement.test.ts` | 修正（rev11 DTO 準拠） |
| `packages/qfai/tests/core/harness/panelScore.test.ts` | 修正（rev11 DTO 準拠） |
| `packages/qfai/tests/core/specCoverage.test.ts` | 新規 or 更新（`01_Spec.md` 限定スキャン検証） |
| `packages/qfai/tests/core/refSemantics.test.ts` | 新規 or 更新（`#L<n>` 限定許可検証） |
| `packages/qfai/README.md` | 修正（ドキュメント同期） |

**対象外**:

- `.qfai/**`（運用ディレクトリ）
- スコアリング rubric 再設計
- Browser QA オーケストレーション再設計
- calibration pack 再設計
- non-UI prototyping
- マイグレーションサポート

### 歴史的コンテキスト

- rev1〜rev9: ビルドエラー・型エラーの解消
- rev10 / discussion-20260416195444737: terminal state machine / canonical screen contract refs / iteration category refs / semantic declaredRef の4 WS を実装
- rev11 監査: 上記3残存課題（public API 露出・`declaredRef` 過度許可・テスト陳腐化）が特定された

---

## 入力

**既存リポジトリ事実**:

- `packages/qfai/src/core/harness/measurement.ts` — `runMeasurement()` 実装（カテゴリ ref 全8種 + panel score 検証を内部で実行）
- `packages/qfai/src/core/harness/panelScore.ts` — `validatePanelScore()` / `scoreL1()` / `scoreL2()` / `scorePanelsFromInputs()` 実装
- `packages/qfai/src/core/harness/types.ts` — `FullHarnessPanelScore`・`FullHarnessIteration`・`MeasurementInput`・`MeasurementResult` DTO 定義
- `packages/qfai/src/core/prototyping/refSemantics.ts` — `isSpecDeclarationRef()` / `isCanonicalScreenContractRef()` / `assertConcreteArtifactRefs()` 実装
- `packages/qfai/src/core/prototyping/specCoverage.ts` — spec 宣言スキャン・カバレッジサマリービルダー実装
- `packages/qfai/src/core/index.ts` — public API エクスポート一覧（rev11 時点での整合性要確認）

**外部参照**:

- v1.7.15-11 監査レポート（本設計書 rev11 に集約）
- discussion-20260416195444737（直前 discussion pack、rev10 設計）

**前提**:

- `packages/qfai/` のソースのみが修正対象。`.qfai/` は変更しない
- 破壊的変更：後方互換性・マイグレーションサポートなし（fail-closed ポリシー）
- 実装順序は rev11 設計書で確定済み（refSemantics → specCoverage → panelScore → measurement → index → tests → README）

---

## 主要課題

**課題 1: `runMeasurement` / `validatePanelScore` の公開 API 暴露**

`src/core/index.ts` が `runMeasurement()` および `validatePanelScore()` を public export しており（あるいは export 経路が閉じていない）、外部からゆるいバリデーションレベルで呼び出せてしまう。これらは `runFullHarness()` からのみ呼ばれる内部ヘルパーであり、外部 API として設計されていない。`runMeasurement()` は全8カテゴリ ref（renderRefs, browserQaRefs, runtimeGateRefs, uiObservationRefs, specCoverageRefs, discussionRefs, trendRefs, screenContractRefs）の strict 検証と panel score 検証を行う非公開の enforcement 層として完全に内部化される。

**課題 2: `declaredRef` セマンティッククロージャの不備**

`isSpecDeclarationRef()` が許可する ref のスコープが広すぎる。`declaredRef` は `.qfai/specs/<specId>/01_Spec.md#L<正整数>` のみを canonical 形式とすべきだが、`notes.md`・`appendix.md`・`#anchor` フォーマット・`#L0`・絶対パス・ネストパス等が通過できてしまう可能性がある。また `specCoverage.ts` が spec ディレクトリ内の全 `.md` ファイルをスキャンすることで、`notes.md`・`appendix.md` 内の `ui_route:` 宣言が `declaredRef` に混入するリスクがある。宣言の SSOT は `01_Spec.md` のみである。

**課題 3: ハーネスユニットテストの陳腐化**

`measurement.test.ts`・`panelScore.test.ts` が v1.7.15-rev11 の DTO 形状および strict バリデーション契約に完全には準拠していない可能性がある。`specCoverage.test.ts`・`refSemantics.test.ts` が存在しないか、rev11 固有のセマンティック境界（`01_Spec.md` 限定スキャン・`#L<n>` 限定許可・`#L0` / `#anchor` / `notes.md` の拒否等）をカバーするテストケースが不足している。
