# 12_OQ-Resolution-Log

## 解決ログ

### OQ-0001: instructions 配置は syncIntegrationWrappers 内か別関数か

- **解決日**: 2026-03-22
- **決定**: (A) syncIntegrationWrappers 内に追加
- **根拠**: `copilot-instructions.md` の配置が既に同関数内で行われており（init.ts:269-280）、同じパターンで `.github/instructions/` も配置するのが一貫性がある
- **却下オプション**: (B) 独立関数。配置ロジックが分散し、.github/ 生成の全体像が把握しづらくなる

### OQ-0002: instructions テンプレートの配置先

- **解決日**: 2026-03-22
- **決定**: (A) assets/init/.github/instructions/ に配置
- **根拠**: `copilot-instructions.md` はハードコード（17行）だが、instructions ファイルは 70-110 行の長文。アセットファイルとして管理する方がメンテナンス性が高い
- **却下オプション**: (B) ハードコード。長文テンプレートのハードコードは可読性を損なう

### OQ-0003: SDD での言語固有ルール追記の仕組み

- **解決日**: 2026-03-22
- **決定**: (C) v1.6.3 で配置を実装、SDD 追記は別スペックで管理
- **根拠**: ユーザーが「汎用版を配布し、/qfai-sdd にて言語依存ルールを追記」と指示。配置と追記は独立したスペックとして管理可能
- **却下オプション**: (A) 同時実装はスコープ肥大。(B) v1.6.4 送りは不要（別スペックで v1.6.3 内着手可能）

### OQ-0004: frontmatter の applyTo 値

- **解決日**: 2026-03-22
- **決定**: (A) `**/*`（全ファイル対象）
- **根拠**: コードレビューは全ファイルを対象とするのが自然。現行ファイルも同設定

### OQ-0005: excludeAgent の値

- **解決日**: 2026-03-22
- **決定**: (A) `coding-agent` を除外
- **根拠**: coding-agent はコード生成エージェントであり、レビュー指示を適用する対象ではない。現行設定を踏襲

### OQ-0006: instructions アップグレードパス

- **Deferred**: 2026-03-22
- **理由**: v1.6.3 は初回配布。create-only の安全性を優先し、更新メカニズムは v1.7.0 で設計する
- **候補**: `--force-instructions` フラグ、`qfai update` コマンド、テンプレートバージョンヘッダー
- **発見元**: Devils-Advocate Review Challenge 1
