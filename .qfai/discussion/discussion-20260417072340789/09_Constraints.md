# 09_Constraints — 制約定義

---

## 技術的制約

| # | 制約 | 詳細 | 根拠 |
|---|---|---|---|
| TC-01 | **変更対象は `packages/qfai/**` のみ** | `.qfai/**`（運用ディレクトリ）・repo root の設定ファイル・他パッケージへの変更は禁止 | 設計書 rev11 スコープ定義 |
| TC-02 | **TypeScript 型安全の徹底** | `as unknown as`・`@ts-ignore`・`@ts-expect-error` の新規追加禁止。型アサーション（`as`）は型ガードによる narrowing で代替できる場合は使用禁止 | 設計書 rev11 TypeScript 制約 |
| TC-03 | **破壊的変更を許可・互換レイヤー禁止** | 後方互換性を完全廃棄。互換エイリアス・deep import パス・deprecation warning パスを一切維持しない | 設計書 rev11 方針 |
| TC-04 | **単一 PR での完結** | runtime・helper・validator・tests・docs のすべての変更を同一 PR に含める。分割不可 | 設計書 rev11 方針 |
| TC-05 | **新規 npm パッケージ追加禁止** | 既存の依存関係のみ使用。`pnpm add` による新規パッケージ追加禁止 | コスト・セキュリティ方針 |
| TC-06 | **バリデータは fail-closed のみ** | すべての制約違反はエラーとして返す。`console.warn`・silent fallback・warning-only パス禁止 | 設計書 rev11 fail-closed 制約 |
| TC-07 | **`isSpecDeclarationRef()` は `.qfai/specs/<specId>/01_Spec.md#L<正の整数>` のみ許可** | `refSemantics.ts` の述語は行参照付き spec 宣言 ref のみに限定。ディレクトリ ref・discussion ref・ベアパスは拒否 | 設計書 rev11 predicate consolidation |
| TC-08 | **`specCoverage.ts` のスキャン対象は `01_Spec.md` のみ** | spec ディレクトリ内の全 .md ファイルをスキャンする実装を廃止。`01_Spec.md` への制限で `declaredRef` 形式を `01_Spec.md#L<n>` に固定 | 設計書 rev11 canonical declaration |
| TC-09 | **`pnpm` を使用** | パッケージマネージャーは `pnpm` に統一。`npm`・`yarn` は使用不可 | リポジトリ標準 |
| TC-10 | **テストフレームワークは vitest** | `packages/qfai` の全テストは `vitest.workspace.ts` に定義された project slices（core / validators / integration / e2e / cli）で実行。jest への移行・混在禁止 | リポジトリ標準 |
| TC-11 | **実装順序は固定** | `refSemantics.ts` → `specCoverage.ts` → `panelScore.ts` → `measurement.ts` → `index.ts` → tests → README の順で変更する。意味述語を先に確定してから runtime/helper を修正する | 設計書 rev11 実装順制約 |

---

## 運用的制約

| # | 制約 | 詳細 | 根拠 |
|---|---|---|---|
| OC-01 | **マイグレーションサポートなし** | v1.7.15 の変更に対する自動マイグレーションスクリプト・利用者向けガイドは提供しない | 設計書 rev11 方針 |
| OC-02 | **stale テストは削除のみ・修正不可** | `skip` / `todo` / `xit` でマークして残すことは禁止。古い DTO フィールド（`apiEndpoints`・`domLabelsFound` 等）を参照するテストは完全に削除し書き直す | 設計書 rev11 tests represent current contract |
| OC-03 | **フォールバック・自動正規化なし** | stale / malformed な入力に対して auto-normalization を行う実装禁止。不正入力はそのままエラーとして返す | 設計書 rev11 no fallbacks |
| OC-04 | **CI 必須通過** | PR マージ前に `pnpm format:check && pnpm lint && pnpm check-types` がすべて GREEN でなければならない | リポジトリ標準 |
| OC-05 | **README 同期義務** | public API の変更（`runMeasurement` / `validatePanelScore` の public export 削除を含む）は `packages/qfai/README.md` に即時反映する | 設計書 rev11 docs 制約 |

---

## 設計上の制約（禁止事項）

| # | 禁止事項 | 理由 |
|---|---|---|
| DC-01 | `runMeasurement()` を public export に残す | rev11: internal helper として再定義。public API から除去 |
| DC-02 | `validatePanelScore()` を public export に残す | rev11: internal helper として再定義。public API から除去 |
| DC-03 | `isSpecDeclarationRef()` のロジックを `refSemantics.ts` 以外に重複実装 | predicate consolidation: 単一 SSOT を維持する |
| DC-04 | `specCoverage.ts` が `01_Spec.md` 以外の .md ファイルをスキャン | canonical declaration: `declaredRef = 01_Spec.md#L<n>` の形式を保証するため |
| DC-05 | `validatePanelScore()` が空の `evidenceRefs` を受理 | rev11: evidenceRefs は非空必須。空配列は strict エラー |
| DC-06 | `runMeasurement()` が category refs の不正形式を受理 | rev11: category refs strict validation を追加 |
| DC-07 | `as unknown as` による型キャスト | TypeScript 型安全制約 |
| DC-08 | `.qfai/**` 配下のファイルへの修正 | スコープ外。運用ディレクトリを直接編集してもパッケージとしてリリースされない |
