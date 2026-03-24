# 01 Spec

- Spec: spec-0022
- Parent: CAP-0022

## Consumer View

- Primary SSOT for execution: `spec-0022/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: スコアカード定義（階層・明確性・アクセシビリティ・レスポンシブ・taskFidelity の 5 次元）、各次元の評価基準、PASS/FAIL 閾値、レビューゲート統合、Warning→Error ゲート昇格ルール、破壊的変更ドキュメント管理、エビデンス形式（prose + scorecard）
- Out: 自動 VRT スコアリング、RUM メトリクス、プロダクション A/B テスト

## Applicable NFR

- NFR-0001: 方向性完全性 - UI-bearing artifact の DDP 必須項目充足率 100%
- NFR-0003: レスポンシブ - representative desktop/mobile viewport で major layout break 0
- NFR-0004: a11y - contrast, keyboard path, focus visibility の必須項目 PASS
- NFR-0007: レビュー再現性 - 同一 artifact に同一 rubric を適用した結果差分 0
- NFR-0008: 破壊的変更衛生 - breaking item 100% が delta / migration note を持つ
- NFR-0009: タスク完了効率 - primary flow の click count が max_primary_steps 以下であること
- NFR-0010: ゲート厳格性 - REQ-0017 で指定された 6 条件は qfai validate において warning ではなく error として扱う

## Applicable Policy

- Policy: \_policies/01_Objective.md, \_policies/02_Initiative.md, \_policies/07_Constraints.md

## Evidence Summary

- Evidence: フィデリティスコアカード（5 次元スコア + prose コメント）、レビューゲート判定記録、Warning→Error ゲート昇格判定記録、破壊的変更デルタログ

## Relevant Requirements

- REQ-0009: フィデリティスコアカード - review と evidence は design fidelity scorecard を持ち、visual hierarchy / navigation clarity / accessibility / responsiveness を採点する
- REQ-0011: 破壊的変更ドキュメント - 破壊的変更を許容する場合、delta と migration expectation を必ず記録する
- REQ-0012: レビューゲート整合 - review roster は design coherence と downstream actionability を検査し、FAIL 時は具体的代替案を返す
- REQ-0016: taskFidelity 評価 — primary task step count、primary CTA 可視性、empty state 誘導、error recovery path、破壊的操作確認、4状態実装、primary flow click count を評価する
- REQ-0017: Warning→Error ゲート昇格 — 指定された 6 条件を qfai validate においてエラーに昇格する

## Entry points

- US range in this spec: US-0022-0001..US-0022-0005
- Primary actors: QA エンジニア、AI エージェント開発者、プロジェクトリード、レビュアー
- Notes: 本 spec は discussion-phase の Design Fidelity Review  を仕様化する。美的品質とユーザビリティを同時にスコアカードで評価し、レビューゲートと統合する

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: スコアカードの次元間で評価が矛盾する場合（例: 美的に優れるが a11y 不足）
- Conflict: NFR-0003（レスポンシブ）と NFR-0004（a11y）の要求が衝突する場合
- Missing: 4 次元以外の評価観点が必要と判断される場合
- Trade-off: スコアカード閾値の厳格さと開発速度のバランス判断

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
