# 09 Delta

## Change Summary

- Change ID: DELTA-S29-001
- Date: 2026-03-29
- Primary: spec-0029 initial creation
- Tags: v1.7.6, critique-adapter, fail-open
- Summary: Initial spec creation for External Critique Adapter (CAP-0029)

## Rationale

- New capability for v1.7.6 premium prototyping mode
- Provides external critique infrastructure for full-harness evaluator

## Candidates Considered

1. HTTP-only provider interface
2. Generic command interface (adopted)
3. Plugin-based provider interface

## Adopted

- Adopted: Generic command interface
- Why: Supports local scripts, Docker containers, and remote services equally (SD-0029-001)
- Evidence: DR-0075, discussion-20260329175059391

## Rejected

- Candidate: HTTP-only provider interface
- Reason: Excludes local script providers, limits flexibility
- DO NOT: Limit provider interface to HTTP protocol only
- Temptation: HTTP is the most common and familiar protocol

- Candidate: Plugin-based provider interface
- Reason: Over-engineering for initial release; adds runtime complexity
- DO NOT: Implement a plugin discovery/loading mechanism for v1.7.6
- Temptation: Want maximum extensibility from the start

## Impact

- Affects: packages/qfai/src/core/critique/ (new module)
- Validation: qfai validate must pass, integration tests must cover TC-0029-0001 through TC-0029-0008

## Follow-ups

- OQ-S29-001: Provider benchmarking after implementation (deferred)
- Owner: agent
- Due: v1.7.6-impl

## Change Summary (v1.7.6 Remediation)

- Change ID: DELTA-S29-002
- Date: 2026-03-30
- Primary: spec-0029 v1.7.6 remediation pass
- Tags: v1.7.6, critique-adapter, 3-layer-model, DR-0080
- Summary: Add US-0029-0005, AC-0029-0009..0013, BR-0029-0009..0014, EX-0029-0009..0014, TC-0029-0009..0014 to reconcile evaluation architecture to 3-layer model (invariant, trend-derived, product-specific) per DR-0080.

## Rationale (DELTA-S29-002)

- DR-0080 mandates convergence from legacy 4-axis to 3-layer model
- spec-0029 critique adapter is the primary evaluation output surface that must reflect the 3-layer model

## Impact (DELTA-S29-002)

- Affects: packages/qfai/src/core/critique/types.ts (response schema layer keys), adapter.ts (scoring logic)
- Validation: qfai validate must pass; TC-0029-0009..TC-0029-0014 must be covered

## Follow-ups (DELTA-S29-002)

- OQ-S29-002: Verify migration tooling handles partial legacy data (edge cases beyond EX-0029-0012)
- Owner: agent
- Due: v1.7.6-impl
