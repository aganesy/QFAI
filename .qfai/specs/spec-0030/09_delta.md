# 09 Delta

## Change Summary

- Change ID: DELTA-S30-001
- Date: 2026-03-29
- Primary: spec-0030 initial creation
- Tags: v1.7.6, calibration, scoring, plateau
- Summary: Initial spec creation for Harness Contracts & Calibration Pack (CAP-0030)

## Rationale

- Provides scoring alignment and evaluation policy infrastructure for full-harness loop
- Enables consistent scoring across runs and team members

## Candidates Considered

1. Database-backed calibration store
2. File-based calibration pack (adopted)
3. Remote API calibration service

## Adopted

- Adopted: File-based calibration pack
- Why: Independently updatable without code changes, version-controllable (SD-0030-003, NFR-0004)
- Evidence: DR-0074, discussion-20260329175059391

## Rejected

- Candidate: Database-backed calibration store
- Reason: Adds external DB dependency to CLI tool; violates TC-59
- DO NOT: Require external database for calibration storage
- Temptation: Database enables richer queries and multi-user access

- Candidate: Remote API calibration service
- Reason: Network dependency for core functionality; violates fail-open principle
- DO NOT: Require network connectivity for calibration loading
- Temptation: Centralized service enables real-time updates

## Impact

- Affects: packages/qfai/src/core/calibration/ (new module)
- Validation: qfai validate must pass, integration tests must cover all TC-0030-\* cases

## Follow-ups

- OQ-S30-001: Reviewer disagreement escalation policy (deferred to implementation)
- OQ-S30-002: Premium path cost ceilings (deferred to v1.8.x)
- Owner: agent
- Due: v1.7.6-impl / v1.8.x

## Change Summary (v1.7.6 Remediation)

- Change ID: DELTA-S30-002
- Date: 2026-03-30
- Primary: spec-0030 v1.7.6 remediation pass
- Tags: v1.7.6, calibration, 3-layer-model, DR-0080
- Summary: Add US-0030-0006, AC-0030-0011..0016, BR-0030-0016..0021, EX-0030-0016..0021, TC-0030-0017..0022 to align calibration pack schema with the 3-layer evaluation model (invariant, trend-derived, product-specific) per DR-0080. Legacy 4-axis packs rejected with migration guidance; empty product-specific section defaults to generic built-ins.

## Rationale

- DR-0080 mandates convergence to 3-layer model; calibration packs are the storage surface for per-layer thresholds
- Misaligned packs would produce inconsistent scoring between evaluation and calibration subsystems

## Impact

- Affects: packages/qfai/src/core/calibration/loader.ts (3-layer schema validation), types.ts (type definitions), new migration utility
- Validation: qfai validate must pass; TC-0030-0017..TC-0030-0022 must be covered

## Follow-ups

- OQ-S30-003: Provide canonical 3-layer calibration pack example in .qfai/calibration/ for new users
- Owner: agent
- Due: v1.7.6-impl

