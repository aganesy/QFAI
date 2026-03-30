# 01 Spec

- Spec: spec-0037
- Parent: CAP-0037

## Consumer View

- Primary SSOT for execution: `spec-0037/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: reviewer template extension for taste/trend evaluation, old-to-intermediate-to-final migration path, docs/state normalization with canonical maturity vocabulary, non-UI validator safety (cross-cutting)
- Out: full anti-preference traceability beyond taste/axes/review (see RJ-004), AST-based detection, new UI components

## Applicable NFR

- NFR-0001: Backward compatibility — migration must not break existing packs without warning
- NFR-0002: Non-UI safety — zero UI-bearing validator fires on non-UI projects
- NFR-0005: SSOT convergence — all artifacts reference the same canonical model
- NFR-0006: Test coverage — every new validator has minimum 3 fixture tests (pass/fail/non-UI)
- NFR-0008: Feature maturity consistency — no contradictory maturity states across docs
- NFR-0009: Migration docs — upgrade guidance provided for every detectable stale version

## Applicable Policy

- QP-04: Feature maturity vocabulary (complete / foundation-only / preview / correction target)
- QP-05: Non-UI explicit n/a path
- TP-01: New validator test minimum (3 fixtures)
- TP-02: Migration path test (old / intermediate / final)

## Evidence Summary

- REQ: REQ-0024 to REQ-0031
- Discussion: discussion-20260330035428071

## Relevant Requirements

- REQ-0024: Reviewer template extension for taste/trend reflection quality
- REQ-0025: 3-version migration path (old no-sidecar, v1.7.6-v1.7.7 intermediate, v1.7.8 final)
- REQ-0026: Feature maturity vocabulary normalization across README/CHANGELOG/steering/source
- REQ-0027: Master convergence document (new steering doc per OQ-0008/AD-008)
- REQ-0028: Non-UI validator safety (cross-cutting, all new validators)
- REQ-0029: Anti-preference traceability (taste -> axes -> review, scoped per OQ-0007/AD-007)
- REQ-0030: Master convergence document (canonical design baseline)
- REQ-0031: Full-harness entrypoint validator (premium mode)

## Entry points

- US range in this spec: US-0037-0001..US-0037-0004
- Primary actors: discussion reviewer, QFAI adopter, QFAI user/developer, CLI project user
- Notes: US-0037-0004 (non-UI safety) is cross-cutting and must be implemented alongside all other specs' validator work

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: migration warning vs error threshold boundary at v1.7.8 vs v1.8.0
- Conflict: NFR-0001 (backward compat) vs NFR-0005 (SSOT convergence) for legacy packs
- Missing: exact stale-asset detection heuristics for intermediate versions
- Trade-off: migration strictness vs adopter friction

### Escalation Targets (Read-only, decision basis)

- \_policies/08_Decisions.md (DR-0059 migration guidance, DR-0080 3-layer model, DR-0083 versioning strategy)
- \_policies/07_Constraints.md
