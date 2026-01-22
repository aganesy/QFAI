# agents

## 1. 目的

`agents` はサブエージェントの役割定義を格納します。作業を分担し、各成果物の責務と判断基準を明確化します。

## 2. 背景

単一プロンプトで全てを決めると、論点の取りこぼしや品質ムラが発生します。役割定義により、検討・作成・レビューを分離して安定化させます。

## 3. ここに配置するもの

- 役割定義ファイル（Markdown）
- 役割ごとの Mission / Non-goals / Working rules / Output format

## 4. ここに配置してはならないもの

- 要件や仕様そのもの
- 実装コード
- プロジェクト固有の前提（それは steering）

## 5. ディレクトリ構造

```text
.
├─ README.md
├─ facilitator.md
├─ interviewer.md
├─ requirements-analyst.md
├─ planner.md
├─ architect.md
├─ contract-designer.md
├─ qa-engineer.md
├─ test-engineer.md
├─ frontend-engineer.md
├─ backend-engineer.md
├─ devops-ci-engineer.md
└─ code-reviewer.md
```

## 6. テンプレート

```md
---
trigger_terms:
  - <keyword>
use_when: <condition>
output_format: markdown
---

# Role name

## Mission

- <responsibilities>

## Non-goals

- <not doing>

## Working rules

- <must>
- <must not>

## Output format

- Findings:
- Recommendations:
- Proposed edits:
- Open Questions:
- Confidence:
```

## 7. 完成例

```md
---
trigger_terms:
  - contract
use_when: contracts を作るとき
output_format: markdown
---

# Contract Designer

## Mission

- API/DB/UI の契約を先に定義し、spec が架空参照しないようにする
- YAML/SQL の構文を正しく保つ

## Non-goals

- 実装の技術選定を決めない

## Working rules

- カテゴリ（api/db/ui）を増やさない
- テンプレと命名規約を守る
- 不明点は Open Question にする

## Output format

- Findings:
- Recommendations:
- Proposed edits:
- Open Questions:
- Confidence:
```

## 8. チェックリスト

- [ ] Mission と Non-goals が分離している
- [ ] Working rules が明確で検証可能
