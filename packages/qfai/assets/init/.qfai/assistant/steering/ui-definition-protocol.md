# UI Definition Consumption Protocol

spec-0013 (CAP-0013) で定義された、下流 skill（prototyping / ATDD / TDD）が UI 定義を読み取る際の手順。

## Reading Order

下流 skill は以下の順序で UI 定義を読み取る。
**Primary truth** は step 1 の discussion sidecar artifacts にある。step 2 以降は **存在する場合のみ読む supporting input / fallback** であり、init 直後に未作成でも正常である。

1. **Discussion-side UI/UX Sidecar Artifacts** (`discussion-*/uiux/`) — **primary source of truth**
   - `30_option_comparison.md` — オプション比較（比較 artifact）
   - `31_selected_anchor_screen.md` — 選定結果 + selected direction の SSOT
   - `10_implementation_strategy.md` — 実装戦略（strict canonical schema）
   - `11_design_taste_interview.md` — デザインテイストインタビュー
   - `20-24` — 3-layer 評価ファミリー（invariant / trend-derived / product-specific / aggregate / dynamic overrides）
   - `40_screen_contracts.md` — スクリーンコントラクト（strong schema）
   - `50_review_input_bundle.md` — レビュー入力バンドル

2. **UI Contracts / Route-level Obligations** (`.qfai/contracts/ui/*.yaml`) — **supporting input; read only if present**
   - 画面定義、インタラクション仕様
   - Design Token ID への参照を含む
   - init 直後にファイルが存在しなくても異常ではない

3. **Design Token** (`.qfai/contracts/design/design-tokens*.yaml`) — **supporting input; read only if present**
   - カラー、スペーシング、タイポグラフィ等の基盤値
   - primitive → semantic → component の 3 層参照解決
   - init 直後にファイルが存在しなくても異常ではない

4. **Optional Fallback Visual Mock** (spec/discussion 内の Screen Mock セクション) — **fallback; read only if present**
   - HTML+CSS mock は補助的な視覚的フォールバックとしてのみ使用
   - sidecar artifacts と contracts が主要な UI 定義ソース
   - mock が存在する場合のみ参照し、欠落していても問題なし

5. **Mermaid Screen Flow** (spec/discussion 内の mermaid フェンス) — **supporting; read only if present**
   - 画面遷移図（stateDiagram-v2）
   - ナビゲーション構造図（flowchart）

## Fallback Rules

| Missing Definition     | Behavior                                       |
| ---------------------- | ---------------------------------------------- |
| Design Token のみ欠落  | warning 発行、CSS fallback 値を使用して継続    |
| UI Contract のみ欠落   | warning 発行、sidecar artifacts から構造を推論 |
| Sidecar artifacts 欠落 | warning 発行、UI Contract からの推論で継続     |
| Fallback mock 欠落     | no-op — mock は必須ではない                    |
| 全定義が欠落           | 現実装では no-op（issues なし）で終了          |

## Priority and Override Semantics

- sidecar artifacts（selected direction / strategy / contracts）が **primary truth**
- UI Contracts と Design Token は **存在する場合のみ読む supporting input**（primary truth ではない）
- Optional fallback mock はさらに後順位の **fallback**
- Design Token の値と HTML Mock の fallback 値が矛盾する場合は warning を発行
- UI Contract の screen ID と sidecar contracts の対応がない場合は warning を発行
