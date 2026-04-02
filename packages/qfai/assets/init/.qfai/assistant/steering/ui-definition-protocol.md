# UI Definition Consumption Protocol

spec-0013 (CAP-0013) で定義された、下流 skill（prototyping / ATDD / TDD）が UI 定義を読み取る際の手順。

## Reading Order

下流 skill は以下の順序で UI 定義を読み取る：

1. **Discussion-side UI/UX Sidecar Artifacts** (`discussion-*/uiux/`) — primary source of truth
   - `30_comparison.md` — オプション比較 + **Selected Direction**（選択方向の単一正本）
   - `10_strategy.md` — 実装戦略（8-field strong schema）
   - `40_contracts.md` — スクリーンコントラクト（strong schema）
   - `11_design_taste_interview.md` — デザインテイストインタビュー
   - `20-24` — 3-layer 評価ファミリー（invariant / trend-derived / product-specific / aggregate / dynamic overrides）
   - `50_review_bundle.md` — レビュー入力バンドル

2. **UI Contracts / Route-level Obligations** (`.qfai/contracts/ui/*.yaml`)
   - 画面定義、インタラクション仕様
   - Design Token ID への参照を含む

3. **Design Token** (`.qfai/contracts/design/design-tokens*.yaml`) — supporting input
   - カラー、スペーシング、タイポグラフィ等の基盤値
   - primitive → semantic → component の 3 層参照解決

4. **Optional Fallback Visual Mock** (spec/discussion 内の Screen Mock セクション)
   - HTML+CSS mock は補助的な視覚的フォールバックとしてのみ使用
   - sidecar artifacts と contracts が主要な UI 定義ソース
   - mock が存在する場合のみ参照し、欠落していても問題なし

5. **Mermaid Screen Flow** (spec/discussion 内の mermaid フェンス)
   - 画面遷移図（stateDiagram-v2）
   - ナビゲーション構造図（flowchart）

## Fallback Rules

| Missing Definition             | Behavior                                           |
| ------------------------------ | -------------------------------------------------- |
| Design Token のみ欠落          | warning 発行、CSS fallback 値を使用して継続        |
| UI Contract のみ欠落           | warning 発行、sidecar artifacts から構造を推論     |
| Sidecar artifacts 欠落         | warning 発行、UI Contract からの推論で継続         |
| Fallback mock 欠落             | no-op — mock は必須ではない                        |
| 全定義が欠落                   | 現実装では no-op（issues なし）で終了              |

## Priority and Override Semantics

- sidecar artifacts（selected direction / strategy / contracts）が primary truth
- Design Token と optional fallback mock は補助的入力
- Design Token の値と HTML Mock の fallback 値が矛盾する場合は warning を発行
- UI Contract の screen ID と sidecar contracts の対応がない場合は warning を発行
