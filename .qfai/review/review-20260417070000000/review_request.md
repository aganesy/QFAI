# Review Request — SDD spec-0012 v1.7.15 rev10

- **Target**: `.qfai/specs/spec-0012/` (Semantic Closure Hardening)
- **Target kind**: spec
- **Version**: v1.7.15 rev10
- **Date**: 2026-04-17
- **Routing profile**: default
- **Triggered by**: `/qfai-sdd` — SDD Review Cycle Protocol (RCP)

## Review Scope

| Workstream | Description |
|---|---|
| WS-1 | fullHarness terminal state machine (in-progress must not carry terminationReason) |
| WS-2 | Canonical screen contract sourceRef (slug-derived anchors removed) |
| WS-3 | 8-category evidenceRefs validation (non-empty + concrete-ref) |
| WS-4 | declaredRef semantic constraint (.qfai/specs/ prefix + anchor required) |
| WS-5 | Sync (traceability, delta, plan, steering) |

## Artifacts in Scope

- `.qfai/specs/spec-0012/01_Spec.md` .. `10_Plan.md`
- `.qfai/specs/_policies/05_Contracts.md`, `10_delta.md`
- `tests/e2e/qfai-traceability.md` (US-0012-0072..0076)
- `tests/integration/qfai-traceability.md` (TC-0012-0243..0271)
- `.qfai/evidence/sdd-spec-0012.md` (rev10 section)

## Validate Evidence

- `.qfai/report/validate.log`: `error=31 warning=88 info=3` (all 31 pre-existing, rev10-specific=0)
- `QFAI-COV-201..206`: all 0
- `QFAI-ATDD-111/112/113`: all 0

## Reviewers

| # | Reviewer | Condition |
|---|---|---|
| R01 | completion-reviewer | Always |
| R02 | architecture-reviewer | Architecture-affecting: WS-1 terminal state machine, WS-2 sourceRef, WS-3 evidenceRefs, WS-4 declaredRef |
