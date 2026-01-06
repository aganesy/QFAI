# Prompts Local（利用者カスタム / Overlay）

このディレクトリは **利用者が自由に編集・追加できるプロンプト資産**の置き場です。

QFAI v0.7 以降は、プロンプト資産のカスタマイズ手段を **overlay（prompts.local 優先）**に一本化します。

## Overlay ルール（重要）

同じ相対パスのファイルが存在する場合、次の優先順位で参照する運用とします。

1. `.qfai/prompts.local/<relativePath>`（存在すればこちらを優先）
2. `.qfai/prompts/<relativePath>`（無ければ base を参照）

例:

- base: `.qfai/prompts/require-to-spec.md`
- local override: `.qfai/prompts.local/require-to-spec.md`

→ `prompts.local` に同じ相対パスで置けば、以降は local を読む運用にできます。

## 重要な注意（サポート境界）

- `.qfai/prompts/**` は **QFAI 標準資産**です（更新や `qfai init` の再実行で上書きされ得ます）。
- 利用者が `.qfai/prompts/**` を直接編集することは **非推奨・非サポート（ほぼ禁止）**です。
- 変更したい場合は、対象ファイルを `prompts.local` にコピーして上書きしてください。

## init 再実行時の保護（契約）

- `qfai init` は `.qfai/prompts.local/**` を **保護**します（`--force` を付けても上書きしません）。
- 現時点でこの保護対象は `prompts.local` のみです。
