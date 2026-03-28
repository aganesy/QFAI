# 07 Decisions

## Decisions

2 decisions in this spec (OQ resolution from discussion phase).

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
