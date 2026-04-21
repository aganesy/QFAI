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
  - UI prototype implementation, sub-agent delegation, reviewer handoff
  - Mandatory screenshot evidence: `.qfai/evidence/prototyping/screenshots/<screen-id>.png`
  - Mandatory HTML snapshot evidence: `.qfai/evidence/prototyping/html/<screen-id>.html`
  - L1 / L2 evaluator workflow driven by skill instructions and references
  - L3 reviewer / quality gate workflow through `/qfai-verify`
  - `qfai validate --fail-on error` による機械検査
  - `QFAI-UIE-001` / `QFAI-UIE-002` による screen 単位 evidence 欠落検知
  - `uiux/12_design_system.md` の存在時に適用される design-system checks
  - v1.7.16 legacy validation slice:
    - `executionPlan`
    - `scoringTrace[].screenshotDir`
    - Lighthouse gate
    - designSystemCompliance
    - calibration overrides
- Out:
  - `qfai prototyping` CLI command
  - `runPrototypingExecution()` / `runFullHarness()` / `panelScore.ts` / `measurement.ts` を前提とした runtime orchestration
  - mode selection engine (`low-cost` / `standard` / `full-harness`) を public contract として扱うこと
  - 機械採点を completion の唯一の truth source とすること

## Applicable NFR

- NFR-0001: Skill-first execution -- prototyping completion is orchestrated by `/qfai-prototyping`, not by a package CLI entrypoint
- NFR-0002: Evidence completeness -- declared screen ごとに screenshot と HTML snapshot の両方が揃う
- NFR-0003: Fail-closed evidence gate -- screenshot または HTML が欠落した screen は未評価扱いとなり rerun 必須
- NFR-0004: Validator determinism -- validate は evidence 存在と schema 整合を機械的に再現可能な形で判定する
- NFR-0005: Reviewer accountability -- L1/L2 findings と reviewer PASS/REVISE が artifacts に残る
- NFR-0006: Non-UI safety -- `ui_bearing: false` spec は prototyping execution 対象外
- NFR-0007: Backward-compatible validation slice -- v1.7.16 の `executionPlan` / `screenshotDir` / Lighthouse / designSystemCompliance / calibration override validators は残してよいが、public runtime を再導入しない

## Applicable Policy

- Policy: static-first, skill-first, validate/verify gate
- Policy: evidence truth source は screenshot / HTML / review artifact / validate output
- Policy: prototyping completion は reviewer gate を通るまで完了扱いにしない

## Evidence Summary

- Evidence: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/**`
- Evidence: `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts`
- Evidence: `packages/qfai/src/core/validate.ts`
- Evidence: `packages/qfai/src/core/report.ts`

## Relevant Requirements

- REQ-0001: Skill-only public interface -- user-facing prototyping invocation は `/qfai-prototyping [--auto]` のみ
- REQ-0002: CLI removal posture -- `qfai prototyping` を active interface として spec/policy/docs/test-ledger に残さない
- REQ-0003: Mandatory evidence capture -- declared screen ごとに screenshot と HTML snapshot を取得する
- REQ-0004: Canonical evidence paths -- evidence path は `.qfai/evidence/prototyping/screenshots/<screen-id>.png` と `.qfai/evidence/prototyping/html/<screen-id>.html`
- REQ-0005: Missing evidence handling -- どちらか一方でも欠落した screen は 0 点相当の未完扱いとし、rerun 必須
- REQ-0006: Evaluator inputs -- L1/L2 evaluators は screenshots, HTML snapshots, axisDefs, previousScore, designSystemChecklist を使う
- REQ-0007: Delegation Scope Table -- skill は UI implementation / Screenshot capture / Evaluation L1-L2 / Build の担当ロールを明示する
- REQ-0008: Iteration cycle -- Capture → Evaluate → Aggregate Findings → Fix and Re-capture → Re-evaluate を 1 iteration の自然言語手順として定義する
- REQ-0009: L1 role -- 実装成立性、screen contract 欠落、blocking UI failure を評価する
- REQ-0010: L2 role -- 3-layer evaluation family、design system、visual/experience quality を評価する
- REQ-0011: L3 role -- reviewer / verify gate として completion 可否を監査する
- REQ-0012: Validate gate -- `qfai validate --fail-on error` は prototyping completion の blocking gate である
- REQ-0013: UI evidence validator -- validate は declared screen ごとに screenshot / HTML の存在をチェックし、欠落時 `QFAI-UIE-001/002` を返す
- REQ-0014: Design system requiredness -- `uiux/12_design_system.md` は UI-bearing prototyping で参照対象とする
- REQ-0015: Verify gate -- `/qfai-verify` は validate pass、review artifact、reviewer PASS/REVISE を completion gate として扱う
- REQ-0016: v1.7.16 validation slice retention -- `executionPlan`, `scoringTrace[].screenshotDir`, Lighthouse gate, designSystemCompliance, calibration override validators は validate/reference 用 artifact contract として残してよい
- REQ-0017: No runtime resurrection -- REQ-0016 は CLI/runtime orchestration 再導入の根拠として使ってはならない
- REQ-0018: Legacy coverage continuity -- 既存 traceability のため `US-0012-0001..0093` と `TC-0012-0001..0305` の ID 空間は維持する

## Entry points

- US range in this spec: US-0012-0001..US-0012-0093
- TC range in this spec: TC-0012-0001..TC-0012-0305
- Primary actors: QFAI user, frontend-engineer, product-surface-reviewer, product-experience-architect, qa-gatekeeper
- Notes: current active posture is skill-led prototyping plus validate/verify gating

## Escalation Hook (Read _policies only when needed)

### When to Escalate

- Ambiguous: evidence rules or reviewer obligations conflict
- Conflict: validate gate and skill guidance disagree
- Missing: screen contract / design system / review artifact prerequisites are unclear

### Escalation Targets (Read-only, decision basis)

- `_policies/01_Objective.md`
- `_policies/02_Initiative.md`
- `_policies/07_Constraints.md`
- `_policies/08_Decisions.md`
