# PR テンプレート（詳細版）

<!--
目的: 変更内容・影響・検証を一度で把握できるPR本文を作るためのテンプレート。
参考:
- GitHub Docs: PRテンプレートの配置（.github/pull_request_template.md など）
- Kubernetes/Electron のPRテンプレート（目的/影響/テスト/リリースノートを明示）
- Keep a Changelog の変更区分（Added/Changed/Fixed/...）
-->

## サマリ（1-3行）

- 何を、なぜ、どこまで直したか（結論）
- v0.5.0 の確定仕様に対する対応点（該当する場合）

## 1. 概要（What / Why）

### 目的・背景

- 何の課題を解決するか、なぜ今やるか

### 変更の要約

- 主要な変更点を簡潔に

### 変更区分（Compatibility / Change）

- 分類:
- 根拠:

### Review Language

- Review Language: ja（例: ja / en / ja+en）

### 関連 Issue / 仕様

- Fixes # / Refs # / 仕様書リンク:

## 2. 変更内容（How）

### 変更一覧（機能/挙動）

- 変更点1:
- 変更点2:

### 詳細（設計・実装）

- どのモジュール/ファイルに、どのような責務の変更が入ったか
- 重要な判断やトレードオフ（採用理由/不採用理由）

### 非スコープ（明示）

- 今回やらないこと:

### 既存挙動との違い

- 旧挙動:
- 新挙動:

## 決定事項チェック

- [ ] Scenario は `scenario.md` に Gherkin で記述（`@cucumber/gherkin` パース前提）
- [ ] 1ファイル = 1 Scenario（Scenario Outline 含む）。Feature/Scenario タグで SPEC/SC を明示
- [ ] Spec Pack は `.qfai/specs/spec-0001/` 形式で `spec.md / delta.md / scenario.md` を配置
- [ ] `spec.md` の BR は `## 業務ルール` 配下の `- [BR-0001][P0] ...` 形式
- [ ] `validate.json` / `report` の入出力パスは現行仕様（config + 既定）と整合
- [ ] `pnpm verify:pack` を実行済み（配布物の健全性）
- [ ] README の「できること」と矛盾が無い

<!-- 重要: PRテンプレはSSOTではなく、正本は README / .qfai 規約 / 実装 -->

## 仕様アーティファクト変更（差分要約）

- specパック（spec-xxx）: 追加/変更/削除したファイル
- spec.md: 追加/変更したBR
- delta.md: 変更区分
- scenario.md: 追加/変更したScenario

## validate観点（影響範囲）

- 追加/変更したルールコード:
- 破壊的変更（後方互換なし）:
  - 変更点:
  - 影響を受けるコマンド/パス:

## 3. 影響範囲・互換性

### 影響範囲

- 対象機能/モジュール:
- 依存する外部要素（CI/配布/運用/設定など）:

### 互換性・移行

- 破壊的変更: あり/なし
- 移行手順・注意点:

### リスク評価

- 機能:
- 性能:
- UX:
- セキュリティ:
- 運用:

### ロールバック方針

- 影響を戻す手順/確認ポイント:

## 4. 検証（Tests）

### 実行したテスト

- コマンド:
- 結果:

### 未実施のテストと理由

- 例: 環境未整備、再現困難、対象外

## 5. リリースノート（ユーザー向け）

<!--
Keep a Changelog 形式を参考に、該当項目だけ残す。
該当がない項目は削除してOK。ユーザー影響がない場合は「なし」。
-->

### Added

-

### Changed

-

### Fixed

-

### Deprecated

-

### Removed

-

### Security

-

## 6. 追加情報（任意）

### スクリーンショット / 動作確認ログ

-

### レビュアーへの補足

- 重点的に見てほしい箇所・確認観点:

### 参考資料

- リンク:

## レビューチェックリスト（QA/Architect）

- [ ] README / docs / examples / init テンプレ / PromptPack の相互矛盾がない
- [ ] init 生成物で validate が error=0 になる
- [ ] report の契約→Spec / Spec→契約 に (none)/(orphan) が期待通り出る
- [ ] 変更は「確定仕様」の範囲に収まっている
- [ ] issue code / severity / config の説明が README と一致している

## Open Questions / Follow-ups（あれば）

- v0.5.1+ に送る論点（判断不要なら空でOK）
