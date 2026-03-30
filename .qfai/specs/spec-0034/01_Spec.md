# 01 Spec

- Spec: spec-0034
- Parent: CAP-0034

## Consumer View

- Primary SSOT for execution: `spec-0034/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: design taste interview artifact, trend/reference research mandatory flow, 3-layer evaluation architecture convergence, scoring-ready schema enforcement, strategy artifact strong schema, screen contract multi-screen schema
- Out: full-harness entrypoint, prototyping skill rewrite, render evidence wiring, browser QA, UI-bearing detection unification, reviewer extension, migration normalization, docs normalization

## Applicable NFR

- NFR-0001: Backward compatibility (v1.7.6/v1.7.7 packs: warning only in migration window)
- NFR-0002: Non-UI project safety (UI-bearing validators must not fire on non-UI projects)
- NFR-0003: Validator determinism (same input produces same output, no semantic judgment)
- NFR-0004: Validator/reviewer separation (validators: structure/existence only; reviewers: quality)
- NFR-0005: SSOT convergence (all artifacts reference the same canonical model)
- NFR-0010: Scoring-ready completeness (all axes have 16 mandatory fields)

## Applicable Constraints

- TC-58: critique adapter supports multiple backends via generic command interface
- TC-59: calibration pack is file-based (no external DB)

## Applicable Policy

- QP-01: Quality gate enforcement (qfai validate --fail-on error)
- QP-05: Traceability chain maintenance (REQ -> Spec -> Code -> Test)
- CP-01: CI green gate maintenance

## Evidence Summary

- REQ: REQ-0001 to REQ-0013
- Source: discussion-20260330035428071

## Relevant Requirements

- REQ-0001: Design taste interview artifact (9 sections in uiux/11_design_taste_interview.md)
- REQ-0002: Taste interview skill integration (SKILL.md mandatory step)
- REQ-0003: Taste completeness validator (UIX-VAL-TASTE-MISSING / INCOMPLETE)
- REQ-0004: Trend scan mandatory flow (04_Sources.md with freshness metadata)
- REQ-0005: Trend scan validator (UIX-VAL-TREND-SCAN-MISSING / FRESHNESS-MISSING)
- REQ-0006: 3-layer evaluation model normalization (invariant / trend-derived / product-specific)
- REQ-0007: 4-axis legacy deprecation (migration window: warning -> error)
- REQ-0008: Scoring-ready schema enforcement (16 fields, validators)
- REQ-0009: Aggregate scoring rules (thresholds / floors / plateau / missing score policy)
- REQ-0010: Strategy artifact strong schema (8 fields)
- REQ-0011: Strategy weak format deprecation (migration window: warning -> error)
- REQ-0012: Screen contract schema upgrade (10 fields, multi-screen)
- REQ-0013: Screen contract schema validator (UIX-VAL-SCREEN-CONTRACT-SCHEMA-INCOMPLETE)

## Entry points

- US range in this spec: US-0034-0001..US-0034-0006
- Primary actors: QFAI discussion facilitator, framework developer, reviewer/calibrator, discussion consumer, downstream automation consumer
- Notes: D-01~D-06 from discussion-20260330035428071. Discussion-side canonical architecture convergence for v1.7.8

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: migration window duration for 4-axis -> 3-layer and weak strategy -> strong schema
- Conflict: NFR-0001 (backward compatibility) vs NFR-0005 (SSOT convergence) during migration
- Missing: aggregate scoring threshold values (REQ-0009)
- Trade-off: migration window length vs convergence speed

### Escalation Targets (Read-only, decision basis)

- \_policies/07_Constraints.md (TC-58, TC-59)
- \_policies/08_Decisions.md (DR-0087, DR-0088, DR-0091 — pending registration)
