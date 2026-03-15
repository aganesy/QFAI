# Research-First Protocol

spec-0013 (CAP-0013) で定義された、UI/UX 専門家サブエージェントの作業冒頭リサーチプロトコル。

## Trigger

`/qfai-discussion` コマンド実行時に自動トリガーされる（DEC-0013-0004）。

## Output Schema

```yaml
research_summary:
  sources:
    - id: string          # SRC-XXXX format (必須)
      title: string       # 文献タイトル (必須)
      url: string         # URL (必須)
      published: string   # YYYY-MM-DD (必須)
  best_practices:
    - id: string          # BP-XXXX format
      category: string
      title: string
      description: string
      source_id: string   # sources[].id への参照
  anti_patterns:
    - id: string          # AP-XXXX format
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

- 参照ソースの直近 2 年以内の参照率 ≥80%
- 80% 未満の場合は freshness warning を発行
- 古いソースを含める場合は、歴史的重要性などの理由を明記

## Source Citation Rule

- 全エントリに `id`, `title`, `url`, `published` を記録（1 件でも欠落はバリデーションエラー）

## Conflict Protocol

- 新しいリサーチ結果が既存の BP/AP ルールと矛盾する場合:
  - `reflection[].action: reject` — 新知見を不採用
  - `reflection[].action: defer` — 判断を延期
  - **自動上書き禁止**: 既存ルールを自動的に書き換えてはならない
- `reflection[].action: apply` が 1 件以上必須

## Storage

- `research_summary` はカレントの discussion-pack 内（`## Research Summary` セクション）に記録
- グローバルには永続保存しない（DEC-0013-0002）
