# 05_Scope

## In Scope

- UI-bearing discussion/spec に `Design Direction Pack` を追加する方針
- design theme / mood / taste / anti-goals / CTA hierarchy / section narrative の必須化
- 画面遷移、導線、error/recovery flow を spec に強制する方針
- `/qfai-prototyping` と `/qfai-implement` に render critique loop を要求する方針
- aesthetic/usability/accessibility/responsiveness を同時に判定する scorecard
- 既存 `spec-0013` との差分整理と breaking envelope の定義

## Out of Scope

- Figma / Sketch / MCP の必須依存化
- QFAI 自身の GUI 実装
- production RUM / A/B テストの実装詳細
- 実プロダクトごとのブランド戦略そのものの提供

## Success Criteria

- UI-bearing artifact に必要な direction fields が 100% 定義される
- downstream が direction を最上位入力として読める前提が確立される
- banned generic patterns を review で明示的に reject できる
- review/evidence で desktop/mobile critique の記録が残せる

## Anti-goals

- 「いい感じにして」で済ませること
- cards / gradients / icons を装飾として増やすこと
- theme 未定義のまま prototype/implement を開始すること

## Breaking Change Envelope

- Allowed: prompt assets, discussion/spec templates, review criteria, downstream input ordering
- Prefer preserving: public CLI command names and basic workflow entry points
- Required when breaking: delta 記録と migration note

## Work Orders Summary

| Step | Role (sub-agent) | Task title               | Input (refs)                   | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ------------------------ | ------------------------------ | ------------- | -------------------- |
| 1    | researcher       | Scope gap identification | `SRC-0002`..`SRC-0006`         | Gap list      | PASS                 |
| 2    | orchestrator     | Scope decision           | User request, repo constraints | `05_Scope.md` | PASS                 |
