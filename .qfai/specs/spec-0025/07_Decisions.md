# 07 Decisions

## Decisions

2 decisions in this spec (OQ resolution from discussion phase).

### DR-LOCAL-001: OQ-0004 解決 — Finding 重複制御は config 可変閾値

- Decision: maxDuplicateFindingsPerRule をデフォルト 5 の config 可変閾値とし、超過分は集約サマリー 1 issue にまとめる
- Context: discussion-20260326072322818 OQ-0004 で方針（cap duplicate, aggregate）は合意済みだが閾値未定義だった
- Rationale: 固定閾値ではプロジェクト規模に対応できない。config 可変にすることで大規模プロジェクトでも小規模でも適切に制御可能。デフォルト 5 は report の可読性と情報量のバランス
- Rejected-A: 固定閾値 3/file/rule（大規模プロジェクトで不足）
  - DO NOT: 閾値をハードコードしない。Temptation: 設定項目を減らしたい
- Rejected-B: 閾値なし全件出力（report が冗長になり可読性低下）
  - DO NOT: 重複制御を省略しない。Temptation: 実装が簡単
- Evidence: DR-0052 (\_policies/08_Decisions.md), discussion OQ-0004

### DR-LOCAL-002: OQ-0005 解決 — Tier 3 default profile は category ベース分岐

- Decision: default profile の Tier 3 rule severity を category で分岐する。cosmetic (SLP-01, SLP-02, SLP-05) → info、functional (SLP-03, SLP-04, SLP-06) → warning
- Context: discussion-20260326072322818 OQ-0005 で「info/warning in default」方針は合意済みだが分岐条件未定義
- Rationale: cosmetic パターンは認知促進（info）に留め、functional パターンは注意喚起（warning）で品質意識を高める。high/strict では全て warning 以上
- Rejected-A: 全て warning（cosmetic 検知がノイズに）
  - DO NOT: cosmetic と functional を同一 severity にしない。Temptation: 分岐ロジックの省略
- Rejected-B: 全て info（functional slop が見逃される）
  - DO NOT: functional slop を info にしない。Temptation: false-positive を恐れて全て下げたい
- Evidence: DR-0053 (\_policies/08_Decisions.md), discussion OQ-0005
