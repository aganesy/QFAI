# 08_Glossary

| 用語 | 定義 |
|---|---|
| instructions ファイル | GitHub Copilot が PR レビュー時に参照する指示ファイル。`.github/instructions/*.instructions.md` に配置。YAML frontmatter で適用範囲を指定 |
| create-only | ファイルが存在しない場合のみ作成し、既存ファイルを上書きしない配置戦略 |
| force 無効 | `--force` フラグが指定されても上書きを行わない保護レベル。instructions ファイルに適用 |
| frontmatter | Markdown ファイル先頭の `---` で囲まれた YAML メタデータ。GitHub Copilot instructions では `applyTo` と `excludeAgent` を指定 |
| applyTo | instructions frontmatter のフィールド。指示が適用されるファイルパターンを glob で指定（例: `**/*`） |
| excludeAgent | instructions frontmatter のフィールド。指示から除外するエージェント名を指定（例: `coding-agent`） |
| 重要度プレフィックス | レビューコメントの深刻度を示すタグ: `[BLOCKER]`, `[MAJOR]`, `[MINOR]`, `[NIT]`, `[FYI]` |
| 汎用版 | 言語固有のチェック項目を除去し、任意のプログラミング言語で有効なレビュー指示のみを含むバージョン |
| SDD 追記 | `/qfai-sdd` フェーズで技術スタック選定後に、言語固有のレビュールールを instructions ファイルに追記する仕組み |
| テンプレートアセット | `packages/qfai/assets/init/` 配下に格納される、`qfai init` がコピーするファイル群 |
