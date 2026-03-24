# 05_Scope

## In Scope

- UI-bearing discussion/spec に `Design Direction Pack` を追加する方針
- design theme / mood / taste / anti-goals / CTA hierarchy / section narrative の必須化
- 画面遷移、導線、error/recovery flow を spec に強制する方針
- `/qfai-prototyping` と `/qfai-implement` に render critique loop を要求する方針
- aesthetic/usability/accessibility/responsiveness を同時に判定する scorecard
- 既存 `spec-0013` との差分整理と breaking envelope の定義
- Research-to-Constraint 変換の必須化（research summary → contracts/design BP/AP rule DB）
- Story Workshop テンプレートの高忠実度化（一覧/フォーム画面テンプレ必須項目）
- UI Contract の体験仕様拡張（purpose, primary_user_task, states, max_primary_steps）
- uiFidelity → taskFidelity 拡張（step count, CTA visibility, empty/error state）
- Warning→Error ゲート昇格（UI品質関連の主要 warning を error 化）
- Anti-pattern 検出バリデータ新設
- qfai.config.yaml に uiux policy セクション追加
- 複数案比較の必須化（primary screen で最低2案）
- 競合/参考 UI の必須化（3件以上）

## Out of Scope

- Figma / Sketch / MCP の必須依存化
- QFAI 自身の GUI 実装
- production RUM / A/B テストの実装詳細
- 実プロダクトごとのブランド戦略そのものの提供
- visual regression screenshot diff 自動化（Phase 3, deferred）
- runtime click path / friction metrics 収集（Phase 3, deferred）
- integrated-uiux-reviewer の scorecard 化（Phase 3, deferred）

## Success Criteria

- UI-bearing artifact に必要な direction fields が 100% 定義される
- downstream が direction を最上位入力として読める前提が確立される
- banned generic patterns を review で明示的に reject できる
- review/evidence で desktop/mobile critique の記録が残せる
- Research-to-Constraint 変換が mandatory ステップとして定義され、research summary が downstream 拘束条件に変換される
- 高忠実度テンプレートが一覧/フォーム/状態マトリクスの必須項目を含み、generic テンプレート使用時に error が発生する
- UI Contract が purpose / primary_user_task / states / max_primary_steps を必須フィールドとして持つ
- taskFidelity 評価が uiFidelity と並行して実行され、DOM 充足だけでは PASS しない
- UI 品質関連の主要 warning が error に昇格し、低品質 UI がビルドを止める
- primary screen で最低2案の比較が実施される
- 競合/参考 UI が3件以上記録される

## Anti-goals

- 「いい感じにして」で済ませること
- cards / gradients / icons を装飾として増やすこと
- theme 未定義のまま prototype/implement を開始すること
- research 結果を discussion に閉じたまま downstream に渡さないこと
- DOM 要素の存在だけで fidelity を判定すること
- warning のままで品質違反を見逃すこと
- 1案のみで比較なく UI を確定すること

## Breaking Change Envelope

- Allowed: prompt assets, discussion/spec templates, review criteria, downstream input ordering, validator severity levels
- Prefer preserving: public CLI command names and basic workflow entry points
- Required when breaking: delta 記録と migration note

## Work Orders Summary

| Step | Role (sub-agent) | Task title               | Input (refs)                                     | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ------------------------ | ------------------------------------------------ | ------------- | -------------------- |
| 1    | researcher       | Scope gap identification | `SRC-0002`..`SRC-0008`                           | Gap list      | PASS                 |
| 2    | orchestrator     | Scope decision           | User request, repo constraints, ChatGPT analysis | `05_Scope.md` | PASS                 |
