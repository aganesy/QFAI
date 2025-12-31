# Changelog

この変更履歴は Keep a Changelog と Semantic Versioning に基づきます。

## [Unreleased]

## [0.3.5] - 2025-12-31

### Added

- `docs/roadmap/qfai_v0.3.5_and_v1_roadmap_reassessment.rev2.md` を正本として追加

### Changed

- OQ表記の排除対象を「現行仕様として参照される場所」に限定する方針を明文化
- PromptPackの `roles/` 命名と v0.3.4 → v0.3.5 → v0.4 の順序をロードマップに追記
- RELEASE/README の表記を v0.3.5 に更新

## [0.3.4] - 2025-12-31

### Changed

- init で生成する require を `.qfai/require/` 配下へ移動（後方互換なし）

### Fixed

- PRテンプレのOQチェックリストを撤去し、v0.3.3+決定事項チェックへ置換
- 命名規約の過去状態（OQ継続/版表記）を除去し、標準構成へ収束
- CHANGELOG の誤記（0.3.0のADR検証表現）を修正

## [0.3.3] - 2025-12-31

### Added

- pnpm allowlist 運用ガイド（`.qfai/rules/pnpm.md`）をテンプレートに追加
- `.qfai/require/README.md` と require-to-spec プロンプト雛形をテンプレートに追加

### Changed

- README に「できること」セクションを追加
- init テストで v0.3.3 テンプレート生成を検証
- 命名規約ドキュメントの版表記を v0.3.3 に更新

### Fixed

- init のテンプレート探索パスを明確化し、見つからない場合はエラーで通知

## [0.3.2] - 2025-12-31

### Added

- Gherkin 公式パーサ（@cucumber/gherkin）と Scenario モデルを追加
- Scenario 内の本文/DocString から契約 ID を抽出するトレーサビリティを追加
- Feature の SPEC タグ必須チェックと scenario.md/spec.md の存在チェックを追加

### Changed

- Spec Pack のディレクトリ名を `spec-0001`（4 桁）へ統一（`spec-001` など 3 桁は非対応）
- Spec Pack は `.qfai/specs` 直下のディレクトリのみサポート（ネスト構成を廃止）
- Scenario/ID/Traceability の解析を AST ベースへ刷新

## [0.3.1] - 2025-12-30

### Added

- Spec Pack（spec.md / delta.md / scenario.md）のテンプレートと規約を追加
- delta.md の変更区分検証を追加
- Scenario 単位のタグ検証（SC 1件必須、Feature タグ継承）を追加

### Changed

- config スキーマを v0.3.1 向けに刷新（paths.\* / output.validateJsonPath）
- Scenario の配置を `specs/spec-xxx/scenario.md` に統一
- validate は常に `validate.json` を出力し、report は固定パスを入力に使用
- init テンプレート/README/verify-pack を新構成に整合

### Removed

- decisions/ADR のバリデーションを v0.3.1 から除外

## [0.3.0] - 2025-12-30

### Added

- parse 層（Spec/Scenario/ADR）を導入し、構造解析を集約
- BR Priority（P0〜P3）の検証を追加
- Scenario の Feature/Scenario/タグ必須チェックを追加
- ADR パーサ（parseAdr）ユーティリティを追加

### Changed

- Spec 必須セクション判定を H2 見出しベースへ変更
- traceability の Spec→BR を BR 定義（業務ルール内）に限定
- init テンプレ/README を v0.3.0 仕様へ整合

## [0.2.9] - 2025-12-29

### Added

- ContractIndex を導入し、契約 ID を共通収集（パース失敗時はテキスト抽出）
- 契約パース失敗時のノイズ低減テストを追加

### Changed

- traceability/duplicate 検証の契約 ID 収集を共通化
- init テンプレの v0.2.6 固定表現を削除
- API サンプルから `x-qfai-refs` を撤去

## [0.2.8] - 2025-12-29

### Added

- Contract パース失敗/ID 未定義の検出（UI/API）
- Spec → Contract 参照の実在性チェック

### Changed

- report から rules 指標を削除
- `paths.rulesDir` を削除（互換不要）

## [0.2.7] - 2025-12-29

### Added

- Scenario 参照 ID の実在性チェック（SPEC/BR/Contract）
- BR が参照 SPEC に属するかの検証
- 定義 ID の重複検知（Spec/Scenario/Contracts）
- unknown Contract 参照の severity 設定（warning|error）

### Changed

- ID 形式を `PREFIX-0001` に厳格化
- 命名規約/テンプレートの説明を v0.2.7 に整合

## [0.2.6] - 2025-12-28

### Added

- .qfai 配下の README 群とガイドを追加（spec/contracts/prompts/out）
- Spec/Scenario/Contracts の最小例を刷新

### Changed

- init の生成先を `.qfai/` に統一
- 既定の探索/設定パスを `.qfai` 前提に更新
- Scenario の既定配置を `.qfai/spec/scenarios` に変更

### Removed

- legacy の `spec.md` 探索互換を削除

## [0.2.5] - 2025-12-28

### Added

- 命名規約ドキュメントを追加（docs/rules/naming.md）
- overview / Business Flow 生成用プロンプトをテンプレートに同梱

### Changed

- init テンプレートの Spec/Contracts サンプルを ID+slug 命名に変更
- validate/report/traceability の Spec 探索を `spec-0001-*.md` に対応

### Behavior

- legacy の `spec.md` は引き続き探索対象（後方互換維持）

## [0.2.4] - 2025-12-26

### Added

- CHANGELOG.md を追加
- RELEASE.md を追加

### Changed

- README の Quick Start を現行 CLI 挙動に整合
- validate/report の入出力と GitHub Actions テンプレート導線を明記

### Behavior

- No behavior change（validate/report/CLI の挙動は維持）

## [0.2.3] - 2025-12-25

### Changed

- report: validate.json 欠損時の案内と exit code 2
- init: 既存ファイル衝突時の --force 案内
- build: import.meta 警告の解消と警告ゲート追加
