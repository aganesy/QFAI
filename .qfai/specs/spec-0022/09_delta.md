# 09 Delta

## Change Summary

- Change ID: DELTA-0022-0001
- Date: 2026-03-24
- Primary: spec-0022 初回作成 - デザインフィデリティ評価
- Tags: fidelity-scorecard, design-review, accessibility, responsive, breaking-change
- Summary: CAP-0022（デザインフィデリティ評価）のレイヤードスペック形式での初回作成

## Rationale

- discussion-20260324054332396 で承認された fidelity scorecard 方針に基づき、4 次元スコアカード（階層・明確性・アクセシビリティ・レスポンシブ）による design fidelity review を仕様化
- discussion-phase の Design Fidelity Review  を spec レベルで体系化し、レビューゲートと破壊的変更管理を統合

## Candidates Considered

1. 主観的な美的評価のみでレビュー（採点基準なし）
2. 4 次元スコアカード + prose コメントによる客観的評価（採用）
3. 自動 VRT ハードゲートによる完全自動評価

## Adopted

- Adopted: フィデリティスコアカード 4 次元（階層・明確性・アクセシビリティ・レスポンシブ）による評価体系
- Why: aesthetic/usability を再現可能に判定するため。prose + scorecard の組み合わせにより、数値と根拠の両方を記録できる
- Evidence: discussion-20260324054332396/99_delta.md

- Adopted: 破壊的変更エンベロープ（内部アーティファクト限定）
- Why: ユーザーが破壊的変更を許容したため。prompt assets, discussion/spec templates, review criteria, downstream input ordering が対象
- Evidence: discussion-20260324054332396/05_Scope.md

## Rejected

- Candidate: 主観的美的評価のみ（採点基準なし）
- Reason: 再現性がなく、レビュアー間で判定がばらつく。NFR-0007（レビュー再現性）に違反
- DO NOT: スコアカードを省略して「見た目が良い/悪い」だけで判定しない
- Temptation: 「スコアカードは形式的で面倒」と感じた時

- Candidate: 自動 VRT ハードゲート
- Reason: 価値は高いが別 capability として設計した方が安全。v1.6.6 に deferred
- DO NOT: VRT スコアリングをこの spec の必須要件に含めない
- Temptation: 「自動化すれば手動レビュー不要」と感じた時

## Impact

- Affects: review/evidence テンプレート、レビューゲート判定基準、破壊的変更管理フロー
- Validation: `qfai validate` でエラー 0

## Follow-ups

- qfai validate 構造検証の実行・証跡記録
- Owner: /qfai-sdd
- Due: 本バッチ完了時

## Deferred

- VRT/RUM 自動化: v1.6.6 にて別 capability として設計予定
- 参照: shared-level open question 0008（共有レベル）

## DELTA-0022-0002

- Change ID: DELTA-0022-0002
- Date: 2026-03-24
- Primary: Behavior
- Tags: ChatGPT-analysis, REQ-0016, REQ-0017, taskFidelity, warning-to-error
- Summary: スコアカードに taskFidelity 5 次元目を追加し、Warning→Error ゲート昇格を定義

## Rationale (DELTA-0022-0002)
- SRC-0008: uiFidelity を taskFidelity に拡張し、タスク完遂評価を追加
- SRC-0008: 主要 UI 品質 warning を error に昇格し、低品質 UI を確実に止める

## Adopted (DELTA-0022-0002)
- taskFidelity を 5 次元目に追加（REQ-0016）: step count, CTA visibility, 4-state, click count
- Warning→Error 昇格 6 項目（REQ-0017）: UI req+no mock, UI Contract+no HTML mock, states+missing impl, CTA mismatch, max_primary_steps exceeded, critical anti-pattern

## Rejected (DELTA-0022-0002)
- 全 warning を一斉 error 化（既存プロジェクト破壊リスク）
  - DO NOT: 全 warning を無差別に error に昇格しない
  - Temptation: 品質を最大限に強制したい
- taskFidelity を完全 defer（DOM 充足のみの問題が継続）
  - DO NOT: taskFidelity を完全に先送りしない
  - Temptation: 複雑な機能を避けたい
