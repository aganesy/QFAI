# UI Definition Consumption Protocol

spec-0013 (CAP-0013) で定義された、下流 skill（prototyping / ATDD / TDD）が UI 定義を読み取る際の手順。

## Reading Order

下流 skill は以下の順序で UI 定義を読み取る：

1. **Design Token** (`.qfai/contracts/design/design-tokens*.yaml`)
   - カラー、スペーシング、タイポグラフィ等の基盤値
   - primitive → semantic → component の 3 層参照解決

2. **UI Contract** (`.qfai/contracts/ui/*.yaml`)
   - 画面定義、コンポーネント構造、インタラクション仕様
   - Design Token ID への参照を含む

3. **HTML+CSS Visual Mock** (spec/discussion 内の Screen Mock セクション)
   - ビジュアルレイアウトの具体的な実装例
   - CSS custom property による Design Token 参照
   - 状態バリアント（data-state）とレスポンシブバリアント（data-breakpoint）

4. **Mermaid Screen Flow** (spec/discussion 内の mermaid フェンス)
   - 画面遷移図（stateDiagram-v2）
   - ナビゲーション構造図（flowchart）

## Fallback Rules

| Missing Definition    | Behavior                                       |
| --------------------- | ---------------------------------------------- |
| Design Token のみ欠落 | warning 発行、CSS fallback 値を使用して継続    |
| UI Contract のみ欠落  | warning 発行、HTML Mock から構造を推論して継続 |
| HTML Mock のみ欠落    | warning 発行、UI Contract からの推論で継続     |
| 全 4 定義が欠落       | 現実装では no-op（issues なし）で終了          |

## Priority and Override Semantics

- 後の定義は前の定義を**補完**する（上書きではない）
- Design Token の値と HTML Mock の fallback 値が矛盾する場合は warning を発行
- UI Contract の screen ID と HTML Mock の対応がない場合は warning を発行
