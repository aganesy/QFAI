# Research-First Protocol

QFAI が定義する、`discovery-analyst` サブエージェントの作業冒頭リサーチプロトコル。
担当は agent-catalog の role id で指定する（agent-selection の SSOT ルールに従い、散文の職務説明では指定しない）。

## Trigger

`/qfai-discussion` コマンド実行時に自動トリガーされる。`discovery-analyst` は agent-routing 上の
`qfai-discussion` framing phase で mandatory であり、UI の有無にかかわらず本プロトコルを実行する。

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

- `research_summary` はカレントの discussion-pack の `04_Sources.md` 内（`## Research Summary` セクション）に記録
- グローバルには永続保存しない
