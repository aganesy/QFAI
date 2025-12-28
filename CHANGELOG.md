# Changelog

この変更履歴は Keep a Changelog と Semantic Versioning に基づきます。

## [Unreleased]

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
