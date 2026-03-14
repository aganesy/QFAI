# 08 Glossary

## 用語定義

| 用語 | 定義 | 初出ソース |
| ---- | ---- | ---------- |
| AskUserQuestion | VS Code Copilot Chat が提供するユーザーへの質問機能。ターミナルではなく Chat UI 上で構造化選択肢付きの質問を提示できる。全スキルで MUST 使用が義務化される | SRC-0013 |
| AskUserQuestion Protocol | 各スキルの SKILL.md に定義される、AskUserQuestion 使用方法のルール。MUST 化後は「使用しなければならない」の強制表現を持つ | SRC-0013 |
| MUST | RFC 2119 における最高強度の要件表現。「しなければならない」（義務）。SHOULD（推奨）より強い | SRC-0001 |
| SHOULD | RFC 2119 における推奨表現。「できれば使用する」（勧告）。守られないことがある。本変更前の表現 | SRC-0001 |
| フォールバック | AskUserQuestion が技術的に利用不可能な環境での代替手順。平文テキストで質問するが、理由の明示が必須 | SRC-0001 |
| --auto フラグ | スキル起動時に付与できるオプション。ユーザーへの質問をゼロにし、前提を明示して自動進行させる実行モード | SRC-0015 |
| constitution.md | QFAI エージェントの非交渉条項を定義するファイル。Article I〜IX（本変更後は X）。最高優先度を持つ | SRC-0011 |
| Article X | constitution.md に追加される新条項。AskUserQuestion 使用の MUST 義務を定義する | 本 discussion |
| コンパクト実行 | AIエージェントのコンテキスト圧縮。圧縮後もconstitution.md の参照により Article X が有効 | SRC-0001 |
| communication.md | QFAI エージェントの出力・通信ルールを定義するファイル。本変更で AskUserQuestion セクションを追加 | SRC-0012 |
| SKILL.md | 各スキルの定義ファイル。入力・出力・ロール・完了契約・Protocol を記述する SSOT | SRC-0002〜SRC-0010 |
| Reviewer Gate | スキル完了前に独立した Reviewer が実施する品質確認。PASS/REVISE を返す | SRC-0011 |
| 非交渉条項 | constitution.md に記載されるルールの性質。例外を認めず、他のルールより優先される | SRC-0011 |

## 略語

| 略語 | フルフォーム |
| ---- | ------------ |
| MUST | 義務（RFC 2119） |
| SHOULD | 推奨（RFC 2119） |
| AQ | AskUserQuestion |
| SSOT | Single Source of Truth |
