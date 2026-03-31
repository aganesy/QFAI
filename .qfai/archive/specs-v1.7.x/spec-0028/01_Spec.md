# 01 Spec

- Spec: spec-0028
- Parent: CAP-0028

## Consumer View

- Primary SSOT for execution: `spec-0028/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: `/qfai-prototyping` static-first mode resolver foundation
  (vocabulary and resolution logic; production wiring deferred to v1.7.6),
  runtime-heavy checks opt-in re-placement, render evidence schema and capture status vocabulary,
  visual-review/browser evidence backend abstraction,
  browser QA phase and structured output design, tests/docs/report impact alignment
- Out: external critique provider (v1.8), full-harness orchestration (v1.8), calibration pack (v1.8), cost observability (v1.8), long-running handoff (v1.8), evidence schema versioning detail (v1.7.6, OQ-0001), browser QA output normalization shape (v1.7.6, OQ-0002)

## Applicable NFR

- NFR-0028-0001: Default prototyping path completes without browser/backend installed; blocking error count = 0 (must)
- NFR-0028-0002: Optional capability uses fail-open/skipped semantics; no hard fail escalation on capability absence (must)
- NFR-0028-0003: Mode-specific expectations (standard/low-cost/full-harness) documented at reviewer and implementer granularity (must)
- NFR-0028-0004: Render evidence schema supports partial capture with individual status per element (must)
- NFR-0028-0005: Browser QA output includes phase and repair suggestion as minimum mandatory fields (must)
- NFR-0028-0006: Compatibility correction introduces 0 new universal dependencies for non-web projects (must)
- NFR-0028-0007: Scope control maintained per release slice; no more than 4 internal slices (should)
- NFR-0028-0008: Review/validation responsibilities do not mix; screenshot quality and critique correctness are not hard gates (must)

## Applicable Policy

- Default path preserves static-first; runtime-heavy checks are not restored to universal default
- Optional capability defaults to fail-open/skipped when absent
- Browser availability, external tool install success, screenshot semantic quality, critique correctness are not hard gates
- Browser QA returns structured outputs; report expresses actionable repair information
- Runtime correction, evidence, backends, and browser QA maintain slice-level separation for independent revert
- Optional backend registration does not expose secrets in evidence or report output

## Evidence Summary

- Discussion: discussion-20260329130000123
- Review: (to be created in SDD review cycle)
- Validate: `.qfai/report/validate.log` (target: `error=0`)
- Coverage: `.qfai/report/specs-coverage/spec-0028.md`

## Relevant Requirements

- REQ-0028-0001: `/qfai-prototyping` default mode completes with static-first obligations only (from REQ-0001)
- REQ-0028-0002: API non-404, DB existence, UI route reachability are opt-in, not default hard gate (from REQ-0002)
- REQ-0028-0003: Prototyping DONE conditions redefined around source/route/state/contract-level obligations (from REQ-0003)
- REQ-0028-0004: Render evidence represents screenshot, viewport metadata, DOM/HTML snapshot reference (from REQ-0004)
- REQ-0028-0005: Render evidence capture status distinguishes captured/skipped/failed (from REQ-0005)
- REQ-0028-0006: Visual-review/browser evidence backend registered through provider abstraction (from REQ-0006)
- REQ-0028-0007: Backend capability declaration has optional registration and fail-open/skipped semantics (from REQ-0007)
- REQ-0028-0008: Browser QA handles smoke/interaction/visual/accessibility phases independently (from REQ-0008)
- REQ-0028-0009: Browser QA output returns structured findings and repair suggestions (from REQ-0009)
- REQ-0028-0013: Browser QA runner implements actual phase execution and returns structured findings (from REQ-0009, v1.7.6 remediation)
- REQ-0028-0010: Mode-specific expectations (standard/low-cost/full-harness) are explicit (from REQ-0010)
- REQ-0028-0011: Non-web/non-visual projects work without browser availability or external tool install (from REQ-0011)
- REQ-0028-0012: Docs/report/tests explain new static/runtime boundary and optional capability semantics (from REQ-0012)

## Entry points

- US range in this spec: US-0028-0001..US-0028-0006
- Primary actors: QFAI user (`/qfai-prototyping` executor), QFAI maintainer, CI/CD pipeline
- Notes: This spec implements Runtime & Evidence Foundation for v1.7.5 — correcting default path to static-first, introducing render evidence schema, provider abstraction for backends, browser QA structured outputs, and non-web project safety

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: static-first vs runtime-heavy boundary classification is unclear for a specific obligation
- Conflict: provider abstraction design conflicts with existing backend implementation assumptions
- Missing: mode-specific expectation table lacks entries for a newly identified mode variant
- Trade-off: fail-open semantics vs evidence completeness for partially available backends

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/05_Contracts.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
