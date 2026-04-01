# 01 Spec

- Spec: spec-0008
- Parent: CAP-0008

## Consumer View

- Primary SSOT for execution: `spec-0008/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - ATDD skill (`/qfai-atdd`) workflow definition
  - E2E / API / Integration acceptance test orchestration aligned with US / TC / CON-API obligations
  - Test Volume Estimator (signal table with evidence)
  - Coverage obligations checklist (US -> E2E, TC -> Integration, CON-API -> API)
  - Annotation obligations (`QFAI:SPEC-XXXX:US-YYYY`, `QFAI:SPEC-XXXX:TC-YYYY`, `QFAI:CON-API-XXXX`)
  - Forbidden reference enforcement (TC annotations in E2E/API tests are forbidden)
  - Sub-agent delegation (test-design-analyst, acceptance-test-engineer, completion-reviewer, qa-gatekeeper, implementation-reviewer)
  - Evidence file production (`.qfai/evidence/atdd-<spec-id>.md`)
  - Stage gates (P0-P8) enforcement
  - Reviewer Gate with independent non-edit reviewer
- Out:
  - Unit / Component test implementation (belongs to `/qfai-implement`)
  - Product feature changes beyond ATDD execution needs
  - Spec artifact authoring (belongs to `/qfai-sdd`)

## Applicable NFR

- NFR-0001: Coverage completeness -- all required US covered by E2E, all required TC by Integration, all required CON-API by API tests
- NFR-0002: Annotation consistency -- every generated ATDD test includes correct QFAI annotations per layer
- NFR-0003: Forbidden reference enforcement -- zero TC annotations in E2E/API test files
- NFR-0004: Evidence completeness -- evidence file includes work orders, coverage checklist, execution logs, and reviewer notes

## Applicable Policy

- Policy: Drift Protocol mandatory, test-layer policy from `steering/test-layers.md`
- Volume floors/ratios are planning signals, not gates

## Evidence Summary

- Evidence: SKILL.md at `packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/SKILL.md`
- Consolidates old spec-0013 (UI/UX review ATDD-relevant parts)

## Relevant Requirements

- REQ-0001: ATDD skill workflow -- orchestrate E2E/API/Integration acceptance tests aligned with spec obligations
- REQ-0002: Test Volume Estimator -- compute US/TC/CON signals with evidence table
- REQ-0003: Coverage obligations checklist -- E2E covers US, Integration covers TC, API covers CON-API
- REQ-0004: Annotation obligations -- layer-specific QFAI annotations in every generated test
- REQ-0005: Forbidden reference enforcement -- TC annotations forbidden in E2E/API, CON-API guarantee belongs to API tests
- REQ-0006: Stage gates (P0-P8) -- sequential gate enforcement from plan preparation through reviewer confirmation
- REQ-0007: Sub-agent delegation -- mandatory delegation to TestVolumeEstimator, layer implementers, Reviewer, RuntimeGatekeeper
- REQ-0008: Evidence production -- mandatory evidence file with coverage matrix, work orders, execution logs

## Entry points

- US range in this spec: US-0008-0001..US-0008-0005
- Primary actors: QA Engineer, AI Agent (Orchestrator), CI/CD pipeline
- Notes: ATDD skill produces acceptance tests only; unit/component tests belong to `/qfai-implement`

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: coverage depth vs execution time must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
