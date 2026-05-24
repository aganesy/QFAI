# 01 Spec

- Spec: spec-0013
- Parent: CAP-0013
- Status: active

## Consumer View

- Primary SSOT for execution: `spec-0013/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - `/qfai-sdd` unified SDD workflow (Contracts-first -> Outline -> Slice -> Plan -> Delta)
  - Layered artifact generation: `_policies/01..10` + `spec-XXXX/01..10`
  - Contract-first mandatory outputs: `.qfai/contracts/(api|db|ui|design)/**`
  - UI-bearing discussion UIUX sidecar の downstream contract への正規化
  - Contract Index in `_policies/05_Contracts.md` with short IDs (DB-001, API-001, UI-001)
  - Discussion-pack preflight validation (latest pack, readiness checks)
  - Phase order enforcement (Contracts-first -> Outline -> Slice -> Plan -> Delta)
  - Reference direction rules (upper-to-lower forbidden, lower-to-upper allowed)
  - Required edges: US -> AC -> BR -> EX -> TC
  - Batch mode: no-argument invocation processes all capabilities
  - Spec Auto-Discovery Protocol (4-source unified diff detection)
  - RCP execution with 12-reviewer roster
  - Density Review Pass using `QFAI-COV-207` warnings
  - Preflight summary report (`.qfai/report/preflight_summary.md`)
  - Validate gate (`qfai validate --fail-on error`)
  - discussion-pack markdown readiness gate
  - optional side artifacts are ignored by preflight
  - Phase 0 freeze of root `DESIGN.md` sha256 into `.qfai/contracts/design/DESIGN.md.lock.yaml`
  - drop legacy design contracts (`exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `selected-direction.yaml`, `reference-pool.yaml`, `brand-design.yaml`)
  - emit only `design-system.yaml`, `prototype-handoff.yaml`, `DESIGN.md`, `DESIGN.md.lock.yaml`, and the design-system mirror validator as the active design-contract surface
- Out:
  - Writing production code or runnable tests
  - Skipping phase order or bypassing gates
  - Reintroducing rejected options without re-open approval

## Applicable NFR

- NFR-0001: Phase order -- Contracts-first -> Outline -> Slice -> Plan -> Delta must be preserved
- NFR-0002: Reference direction -- upper-to-lower references forbidden, lower-to-upper allowed
- NFR-0003: Required edges -- US -> AC -> BR -> EX -> TC chain completeness
- NFR-0004: Validate gate -- `qfai validate --fail-on error` must produce error=0
- NFR-0005: Contract alignment -- `_policies/05_Contracts.md` index and `.qfai/contracts/**` files must be aligned
- NFR-0006: Mermaid compliance -- `_policies/04_Business-Flow.md` must include Mermaid flowchart or sequenceDiagram

## Applicable Policy

- Policy: Drift Protocol mandatory
- Discussion-pack preflight is mandatory (stop if missing/incomplete)
- `10_Plan.md` is How-only SSOT; do not create `specs/plan.md`

## Evidence Summary

- Evidence: SKILL.md at `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`
- Consolidates: old spec-0011 (Spec Diff Protocol), spec-0038 (Auto-Discovery)

## Relevant Requirements

- REQ-0001: Unified SDD workflow -- single entrypoint for full SDD flow (preflight + shared/spec + plan)
- REQ-0002: Contract-first phase -- create/update contracts before shared/spec slices
- REQ-0003: Outline phase -- `_policies/01..10` layered artifacts
- REQ-0004: Slice phase -- `spec-XXXX/01..08` with slice gate (US->AC, AC->BR, TC->EX)
- REQ-0005: Plan phase -- `spec-XXXX/10_Plan.md` finalized after slice gate pass
- REQ-0006: Delta phase -- `spec-XXXX/09_delta.md` with adoption/rejection rationale, DO NOT / Temptation
- REQ-0007: Discussion-pack preflight -- validate latest pack readiness before SDD
- REQ-0008: Batch mode -- no-argument processes all capabilities from `_policies/03_Capabilities.md`
- REQ-0009: Spec Auto-Discovery -- 4-source diff detection integrated from spec-0038
- REQ-0010: Reference direction enforcement -- upper-to-lower forbidden, lower-to-upper allowed
- REQ-0011: Required edges -- US -> AC -> BR -> EX -> TC completeness
- REQ-0012: Validate gate -- `qfai validate --fail-on error --format github` with error=0
- REQ-0013: Density Review -- `QFAI-COV-207` warnings triaged from specs-coverage reports
- REQ-0014: Discussion-Pack Markdown Gate — SDD preflight は discussion-pack の必須 markdown readiness を検証し、欠落・未完成時のみブロックする
- REQ-0015: Optional Side Artifact Neutrality — SDD preflight は optional side artifact の欠落や旧形式の補助 prototyping artifact だけではブロックしない
- REQ-0016: Exploration-brief normalization — `uiux/30_exploration_brief.md` を `.qfai/contracts/design/exploration-brief.yaml` に正規化する
- REQ-0017: Evaluation-rubric normalization — `uiux/33_exploration_rubric.md` を `.qfai/contracts/design/evaluation-rubric.yaml` に正規化する
- REQ-0018: Evaluator-calibration normalization — `uiux/34_evaluator_calibration.md` を `.qfai/contracts/design/evaluator-calibration.yaml` に正規化する
- REQ-0019: UI contract normalization — `uiux/40_screen_contracts.md` を `.qfai/contracts/ui/*.yaml` に正規化する
- REQ-0020: Downstream boundary — `/qfai-sdd` 以降の skill は discussion pack を直接読まず、正規化済み specs/contracts を読む
- REQ-0021: `selected-direction.yaml` と `design-system.yaml` は prototyping でさらに更新され得る downstream design contracts だが、UI-bearing flow では `/qfai-sdd` 完了時点で downstream validate readiness のために存在していなければならない
- REQ-0115: UI contract template carries `primary_tasks: []` slot — `packages/qfai/assets/init/.claude/skills/qfai-sdd/templates/contracts/ui-spec.yaml` の `screens[]` 各エントリに `primary_tasks: []` slot を含める。requirements-analyst agent guide は各 screen に ≥ 1 primary_task を authoring するよう instruction を持つ。新 `qfai validate` lane (QFAI-AUD-001 aligned) は newly authored UI contracts の `primary_tasks` が non-empty であることを `/qfai-prototyping` 開始前に検証する

## Entry points

- US range in this spec: US-0013-0001..US-0013-0011
- Primary actors: QFAI user (developer), AI Agent (requirements-analyst, solution-architect, test-design-analyst)
- Notes: Receives discussion-pack as input; produces spec artifacts and downstream-ready contracts for later execution skills

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: spec depth vs delivery speed must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
