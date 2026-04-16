# 09_Constraints — 制約定義

---

## 技術的制約

| # | 制約 | 詳細 | 根拠 |
|---|---|---|---|
| TC-01 | **変更対象は `packages/qfai/**` のみ** | `.qfai/**`（運用ディレクトリ）・repo root の設定ファイル・他パッケージへの変更は禁止 | 設計書 rev10 のスコープ定義 |
| TC-02 | **TypeScript 使用必須** | 新規ファイル・既存ファイルの変更はすべて TypeScript で記述。`any` 型・`@ts-ignore` 新規追加禁止 | NFR-0001 |
| TC-03 | **破壊的変更を許可** | 後方互換性を完全に廃棄。レガシーフィクスチャ・warning-only パス・互換エイリアスを維持しない | 設計書 rev10 の方針 |
| TC-04 | **単一 PR での完結** | WS-1〜WS-5 の変更はすべて同一 PR に含める。分割不可 | 設計書 rev10 の方針 |
| TC-05 | **新規 npm パッケージ追加禁止** | 既存の依存関係のみを使用。新規 `npm install` 禁止 | コスト・セキュリティ方針 |
| TC-06 | **バリデータは fail-closed** | 新規バリデーションルールは warning-only パスを持てない。すべての制約違反はエラーとして返す | NFR-0002 |
| TC-07 | **`refSemantics.ts` の新規作成は defer** | OQ-0002 により、`refSemantics.ts` の配置判断は SDD フェーズまで延期 | OQ-0002 deferred |
| TC-08 | **`pnpm` を使用** | パッケージマネージャーは `pnpm` を使用。`npm`・`yarn` は使用不可 | リポジトリ標準 |

---

## 運用的制約

| # | 制約 | 詳細 | 根拠 |
|---|---|---|---|
| OC-01 | **マイグレーションサポートなし** | v1.7.15 の変更に対する自動マイグレーションスクリプト・ガイドは提供しない | 設計書 rev10 の方針 |
| OC-02 | **レガシーフィクスチャの維持なし** | 旧バージョン用のテストフィクスチャは削除し、再使用しない | 設計書 rev10 の方針 |
| OC-03 | **CI 必須通過** | PR マージ前に `pnpm format:check && pnpm lint && pnpm check-types && pnpm test` がすべて GREEN でなければならない | リポジトリ標準 |
| OC-04 | **README 同期義務** | WS-1〜WS-4 で変更した API・挙動は `packages/qfai/README.md` に反映する | REQ-0008 |

---

## 設計上の制約（禁止事項）

| # | 禁止事項 | 理由 |
|---|---|---|
| DC-01 | ルートスラグからのアンカー生成 | WS-2: canonical sourceRef を使用するため不要 |
| DC-02 | `declaredRef` のベアファイルパス | WS-4: OQ-0004 で解決済み |
| DC-03 | `terminationReason=absent` を `status=completed` で許可 | WS-1: 状態機械違反 |
| DC-04 | `.qfai/discussion/` パスを `declaredRef` として使用 | WS-4: discussion ref は spec declaration ref でない |
| DC-05 | `calibration pack`・`scoring rubric`・`Browser QA オーケストレーション` の変更 | スコープ外 |
| DC-06 | `non-UI prototyping` / `standard/low-cost mode` の再導入 | 廃止済み |
