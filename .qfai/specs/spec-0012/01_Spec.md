# 01 Spec

- Spec: spec-0012
- Parent: CAP-0012

## Consumer View

- Primary SSOT for execution: `spec-0012/01_Spec.md`
- Public interface: `/qfai-prototyping [--auto]`
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - `/qfai-prototyping` skill orchestration
  - exploration-first direction funnel (`5->3->2->1`)
  - UI prototype implementation, sub-agent delegation, reviewer handoff
  - mandatory screenshot evidence: `.qfai/evidence/prototyping/screenshots/<screen-id>.png`
  - mandatory HTML snapshot evidence: `.qfai/evidence/prototyping/html/<screen-id>.html`
  - L1 / L2 evaluator workflow driven by skill instructions and references
  - L3 reviewer / quality gate workflow through `/qfai-verify`
  - `qfai validate --fail-on error` による機械検査
  - `QFAI-UIE-001` / `QFAI-UIE-002` による screen 単位 evidence 欠落検知
  - `.qfai/contracts/design/exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml` を基準にした evaluator inputs
  - `.qfai/contracts/design/selected-direction.yaml` と `.qfai/contracts/design/design-system.yaml` を基準にした winner / design-system checks
  - `.qfai/contracts/ui/*.yaml` を基準にした declared screen / route inputs
  - plateau detector による breakthrough trigger
  - branch planner による 2-branch breakthrough loop
  - reviewer-score centered full-harness evidence schema
  - snapshot-based `scoringTrace` / `iterationBudget` / termination semantics
  - best-of-history winner retention
- Out:
  - `qfai prototyping` CLI command
  - `runPrototypingExecution()` / `runFullHarness()` を public runtime orchestration として扱うこと
  - mode selection engine を public contract として扱うこと
  - weighted-total scoring を active evidence contract として扱うこと

## Applicable NFR

- NFR-0001: Skill-first execution -- prototyping completion is orchestrated by `/qfai-prototyping`, not by a package CLI entrypoint
- NFR-0002: Evidence completeness -- declared screen ごとに screenshot と HTML snapshot の両方が揃う
- NFR-0003: Fail-closed evidence gate -- screenshot または HTML が欠落した screen は未評価扱いとなり rerun 必須
- NFR-0004: Validator determinism -- validate は evidence 存在と schema 整合を機械的に再現可能な形で判定する
- NFR-0005: Reviewer accountability -- reviewerScores / review artifacts / reviewer PASS-REVISE が残る
- NFR-0006: Non-UI safety -- `ui_bearing: false` spec は prototyping execution 対象外
- NFR-0007: Breakthrough determinism -- plateau trigger は機械判定で再現可能である

## Applicable Policy

- Policy: static-first, skill-first, validate/verify gate
- Policy: evidence truth source は screenshot / HTML / review artifact / validate output
- Policy: prototyping completion は reviewer gate を通るまで完了扱いにしない
- Policy: design system は winner direction から抽出する

## Evidence Summary

- Evidence: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/**`
- Evidence: `packages/qfai/src/core/review/prototyping.ts`
- Evidence: `packages/qfai/src/core/harness/types.ts`
- Evidence: `packages/qfai/src/core/harness/history.ts`
- Evidence: `packages/qfai/src/core/harness/resultWriter.ts`
- Evidence: `packages/qfai/src/core/evidence/bundleWriter.ts`
- Evidence: `packages/qfai/src/core/validators/prototypingEvidence.ts`
- Evidence: `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts`
- Evidence: `packages/qfai/src/core/validate.ts`

## Relevant Requirements

- REQ-0001: Skill-only public interface -- user-facing prototyping invocation は `/qfai-prototyping [--auto]` のみ
- REQ-0002: CLI removal posture -- `qfai prototyping` を active interface として spec/policy/docs/test-ledger に残さない
- REQ-0003: Mandatory evidence capture -- declared screen ごとに screenshot と HTML snapshot を取得する
- REQ-0004: Canonical evidence paths -- evidence path は `.qfai/evidence/prototyping/screenshots/<screen-id>.png` と `.qfai/evidence/prototyping/html/<screen-id>.html`
- REQ-0005: Missing evidence handling -- どちらか一方でも欠落した screen は未完扱いとし、rerun 必須
- REQ-0006: Evaluator inputs -- L1/L2 evaluators は screenshots, HTML snapshots, evaluation rubric, evaluator calibration, prior reviewer-score context, designSystemChecklist を使う
- REQ-0007: Delegation Scope Table -- skill は UI implementation / Screenshot capture / Evaluation L1-L2 / Build の担当ロールを明示する
- REQ-0008: Initial funnel -- 5 divergent directions を生成し、`5->3->2->1` で収束する
- REQ-0009: L1 role -- 実装成立性、screen contract 欠落、blocking UI failure を評価する
- REQ-0010: L2 role -- design quality / originality / craft / functionality と design system を評価する
- REQ-0011: L3 role -- reviewer / verify gate として completion 可否を監査する
- REQ-0012: Validate gate -- `qfai validate --fail-on error` は prototyping completion の blocking gate である
- REQ-0013: UI evidence validator -- validate は declared screen ごとに screenshot / HTML の存在をチェックし、欠落時 `QFAI-UIE-001/002` を返す
- REQ-0014: Exploration contract requiredness -- `.qfai/contracts/design/exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml` は prototyping の正式参照対象とする
- REQ-0015: Winner contract requiredness -- `.qfai/contracts/design/selected-direction.yaml` と `.qfai/contracts/design/design-system.yaml` は winner 確定後の正式参照対象とする
- REQ-0016: UI contract requiredness -- `.qfai/contracts/ui/*.yaml` は declared screen / route の正式参照対象とする
- REQ-0017: Verify gate -- `/qfai-verify` は validate pass、review artifact、reviewer PASS/REVISE を completion gate として扱う
- REQ-0018: Breakthrough trigger -- `allItemsPass95=false` かつ score delta 停滞かつ diff lines 停滞で branch 2 本を強制生成する
- REQ-0019: No runtime resurrection -- internal helper や evidence schema は CLI/runtime orchestration 再導入の根拠として使ってはならない
- REQ-0020: Legacy coverage continuity -- 既存 traceability のため `US-0012-0001..0097` と `TC-0012-0001..0309` の ID 空間は維持する
- REQ-0021: Best-of-history -- latest iteration が自動勝者ではなく、incumbent と breakthrough branch を比較して mainline を選び続ける
- REQ-0022: Full-harness iteration schema -- `fullHarness.iterations[]` は `reviewerScores[]` と `allItemsPass95` を中心に記録する
- REQ-0023: Snapshot scoring trace -- `fullHarness.scoringTrace[]` は weighted total ではなく snapshot summary を記録する
- REQ-0024: Result writer summary -- full-harness output は latest snapshot summary と `iterationBudget` を返す
- REQ-0025: Termination semantics -- full-harness の収束判定は `allItemsPass95` または iteration budget 到達で決まる

## Entry points

- US range in this spec: US-0012-0001..US-0012-0097
- TC range in this spec: TC-0012-0001..TC-0012-0309
- Primary actors: QFAI user, frontend-engineer, product-surface-reviewer, product-experience-architect, qa-gatekeeper
- Notes: current active posture is skill-led prototyping plus validate/verify gating; mode helpers are internal implementation detail
