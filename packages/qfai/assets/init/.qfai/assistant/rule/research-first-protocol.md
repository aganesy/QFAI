# Research-First Protocol

QFAI's initial research protocol for `discovery-analyst`. Select the role by
its card ID and the resolved routing entry, as
`.qfai/assistant/rule/agent-selection.md` requires.

## Trigger

`/qfai-discussion` triggers this protocol. The resolved routing entry makes
`discovery-analyst` mandatory in its framing phase. Run it whether or not the
work includes UI.

## Output Schema

```yaml
research_summary:
  sources:
    - id: string # SRC-XXXX format (必須)
      title: string # 文献タイトル (必須)
      type: primary | secondary | external # 既定は external
      # type: external のとき
      url: string # URL
      published: string # YYYY-MM-DD
      # type: primary / secondary のとき
      locator: string # そのソースに到達する手段
      observed: string # YYYY-MM-DD, 観測日
  best_practices:
    - id: string # BP-XXXX format
      category: string
      title: string
      description: string
      source_id: string # sources[].id への参照
  anti_patterns:
    - id: string # AP-XXXX format
      category: string
      title: string
      description: string
      source_id: string
  reflection:
    - source_id: string
      finding: string
      action: apply | reject | defer
      reason: string
```

## Freshness Rule

- `type: external` のソースについて、直近 2 年以内の参照率 ≥80%
- 80% 未満の場合は freshness warning を発行
- 古いソースを含める場合は、歴史的重要性などの理由を明記

一次証拠には出版日がなく、新しいとも古いともいえない。観測日を出版日として
数えると、そうしたエントリは常に「新しい」と数えられ、この比率は何も測らなく
なる。したがって比率は `external` のみを分母とする。

## Source Citation Rule

全エントリが記録する事実は 2 つ。**そのソースがどこにあるか**と、**いつのもの
か**。どちらの欄に書くかは `type` が決める。

| `type`                  | どこにあるか | いつのものか |
| ----------------------- | ------------ | ------------ |
| `external`（既定）      | `url`        | `published`  |
| `primary` / `secondary` | `locator`    | `observed`   |

- 全エントリに `id` と `title`、および `type` が指す 2 欄を記録する（1 件でも
  欠落はバリデーションエラー）
- `type` の記載がない、または語彙にない値のときは `external` として扱う。読め
  ない `type` が義務を緩めることはない
- 顧客の現行システムのスクリーンショット、提供されたファイル、会話ログは
  `primary`。それらから計算した集計は `secondary`。`url` と `published` は
  公開物のための欄であり、公開されていないものに書いてはならない

## Conflict Protocol

- 新しいリサーチ結果が既存の BP/AP ルールと矛盾する場合:
  - `reflection[].action: reject` — 新知見を不採用
  - `reflection[].action: defer` — 判断を延期
  - **自動上書き禁止**: 既存ルールを自動的に書き換えてはならない
- `reflection[].action: apply` が 1 件以上必須

## Storage

- `research_summary` goes to the invoking stage's own evidence when it is
  produced, and is carried into the artifact that consumes it when that artifact
  is authored. For `/qfai-discussion` that artifact is the pack's
  `04_Sources.md`, under its `## Research Summary` section.
- The evidence first, because a stage may hold authoring until something
  authorizes it. Writing the summary straight into the artifact creates the
  artifact, and a run cancelled before that authorization leaves it behind as
  the newest of its kind — which is what every later reader then picks up.
- Not persisted globally. The evidence belongs to the run that produced it.
