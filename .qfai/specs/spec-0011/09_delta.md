# 09 Delta (Migration Record)

## Origin

- Consolidates: old spec-0014 (TDD unification), spec-0015 (Guardrail Hardening), spec-0016 (Dev Toolkit Hardening)
- Old spec-0014 unified 3 TDD skills into `/qfai-implement`
- Old spec-0015 added Phase 2 validators and 8-column template
- Old spec-0016 formalized 6-agent roster, completion contracts, evidence contracts, parallel dispatch rules

## Adopted

- AD-0011-0001: Single TDD entry point -- `/qfai-implement` with embedded micro-cycle (from spec-0014)
- AD-0011-0002: 8-column test-list.md -- TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence (from spec-0015)
- AD-0011-0003: 6-agent sub-agent roster -- formal agent definitions with responsibilities and prohibitions (from spec-0016)
- AD-0011-0004: 10-point completion gate -- machine-enforceable completion conditions (from spec-0016)
- AD-0011-0005: Evidence contract hardening -- per-item fresh evidence with RED/GREEN command+result (from spec-0016)
- AD-0011-0006: Failed first delegation hard-stop mitigation -- the first required real delegation doubles as the capability probe, and failure must stop immediately with remediation guidance (from spec-0011/10_Plan.md Risk mitigation)

## Rejected

- RJ-0011-0001: Old 3-skill TDD workflow (qfai-tdd-red, qfai-tdd-green, qfai-tdd-refactor)
  - DO NOT reintroduce separate TDD phase skills
  - Temptation: splitting implement back into separate skills for "modularity"
  - Reason: single entry point eliminates phase-skipping and ensures full cycle enforcement

- RJ-0011-0002: Status-only evidence
  - DO NOT accept evidence without command+result pairs
  - Temptation: marking items done with "looks good" or "should pass"
  - Reason: observable proof is required per evidence hard rules

## ID Renumbering

| Old ID                 | New ID       | Notes                 |
| ---------------------- | ------------ | --------------------- |
| spec-0014 US-0014-YYYY | US-0011-YYYY | TDD unification       |
| spec-0015 US-0015-YYYY | US-0011-YYYY | Guardrail hardening   |
| spec-0016 US-0016-YYYY | US-0011-YYYY | Dev toolkit hardening |
