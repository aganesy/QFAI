# 10_Policy

## セキュリティポリシー

- instructions ファイルにシークレット情報やトークンを含めない
- instructions ファイルは公開リポジトリにコミットされることを前提とする

## コンプライアンスポリシー

- 配布する instructions の内容は GitHub Copilot の利用規約に準拠する
- レビュー指示は公正で偏りのない技術基準に基づく

## 品質ポリシー

- テンプレートアセットの instructions は有効な Markdown + YAML frontmatter 形式とする
- 配布前に GitHub Copilot instructions として有効であることを手動検証する
- 変更時は既存テストスイート全パスを確認する

## 配布ポリシー

- instructions ファイルは `npm pack` の配布物に含める
- `.npmignore` で除外されていないことをビルド時に確認する
