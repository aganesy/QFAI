# 07 Decisions

## Decisions

3 decisions in this spec (2 OQ resolution from discussion phase + 1 v1.7.6 remediation).

### DR-LOCAL-001: OQ-0001 解決 — サイドカー verbosity は minimal-but-complete

- Decision: 各サイドカーアーティファクトタイプにつき1つの完全な例を提供する (Option B: minimal-but-complete)
- Context: discussion-20260328120000000 OQ-0001 で3つの verbosity レベルを比較
- Rationale: オーサリング摩擦と下流可読性のバランス。verbose は摩擦過大、skeleton-only はガイダンス不足
- Rejected-A: Verbose（全アーティファクトに全パターン例示）（オーサリング摩擦が過大）
  - DO NOT: 冗長な例をサイドカーテンプレートに含めない。Temptation: 完全性を追求して全パターンを例示したい
- Rejected-B: Skeleton-only（例なし）（下流ガイダンス不足）
  - DO NOT: スケルトンのみのテンプレートを出荷しない。Temptation: ファイルサイズを最小化したい
- Evidence: DR-0056 (\_policies/08_Decisions.md), discussion OQ-0001

### DR-LOCAL-002: OQ-0002 解決 — Surface classification は surface type のみ

- Decision: UI-bearing 分類は surface type (web-ui, mobile-ui, desktop-ui, mixed, non-ui) のみで判定する
- Context: discussion-20260328120000000 OQ-0002 で3つの分類方式を比較
- Rationale: surface type は決定論的に判定可能、interaction complexity は主観的で自動化困難
- Rejected-A: Interaction complexity ベースの分類（主観的、自動化困難）
  - DO NOT: interaction complexity を UI-bearing 判定基準にしない。Temptation: インタラクションの複雑さで UI を検出したい
- Rejected-B: ハイブリッド分類（surface + interaction）（過度のエンジニアリング）
  - DO NOT: 分類基準を複合化しない。Temptation: より精度の高い検出を目指して両方を組み合わせたい
- Evidence: DR-0057 (\_policies/08_Decisions.md), discussion OQ-0002

### DR-LOCAL-003: OQ-REQ-0026-0005 解決 (v1.7.6 remediation) — Strategy に5フィールドを必須化

- Decision: UI/UX Implementation Strategy アーティファクト (uiux/10_strategy.md) に selection_required, candidate_options, chosen_option, verification_expectations, none-as-legitimate-outcome の5フィールドを必須フィールドとして追加する
- Context: v1.7.6 remediation。REQ-0026-0005 の元定義は UI-bearing 検出実装に焦点を当てており、strategy アーティファクトの必須フィールド一覧が不完全だった。
- Rationale: 意思決定トレーサビリティを完全にするために全5フィールドが必要。none-as-legitimate-outcome を正当な選択肢として明示することで「選ばない」という決定も証跡として残せる。
- Rejected-A: 既存の YAML strategy のフィールドセットをそのまま維持する（意思決定の根拠が不透明なまま）
  - DO NOT: strategy アーティファクトの必須フィールドを省略したり、任意フィールドとして扱わない
  - Temptation: 後方互換を優先して既存フィールドセットを変更したくないが、完全な意思決定証跡を犠牲にしてはいけない
- Adopted: 5フィールドを全て必須化
  - Why: qfai validate が完全な意思決定トレースを検証できるようにするため。none-as-legitimate-outcome も含めることで「選択しない」という決定を証跡に残せる
- Evidence: v1.7.6 remediation discussion、US-0026-0005、BR-0026-0019..BR-0026-0022
