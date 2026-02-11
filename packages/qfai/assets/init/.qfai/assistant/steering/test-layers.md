# Test Layers Policy

This document is the SSOT for test-layer semantics.

## Layer definitions

### L1 Unit

- Scope: isolated functions and classes without external I/O.
- Goal: deterministic rule validation and edge cases.
- Avoid: network, database, filesystem, and end-to-end concerns.

### L2 Component

- Scope: in-process module composition with fakes/stubs for external boundaries.
- Goal: verify internal wiring and local integration behavior.
- Avoid: real infrastructure and service-boundary contracts.

### L3 Integration

- Scope: real infrastructure integration (for example DB/queue/filesystem) within service boundaries.
- Goal: verify data consistency, transactions, and infra interactions.
- Avoid: full cross-service user journeys.

### L4 API

- Scope: service-boundary contracts (HTTP/gRPC/etc), auth, and error contracts.
- Goal: guarantee interface compatibility and access-control behavior.
- Avoid: broad UI-to-system journeys.

### L5 E2E

- Scope: representative full-system journeys across UI/API/data.
- Goal: verify critical user paths with minimal, stable coverage.
- Avoid: turning all scenarios into E2E tests.

## Mapping rules

- SC tags:
  - `@layer-e2e` -> L5
  - `@layer-api` -> L4
  - `@layer-integration` -> L3
  - no layer tag -> L4 by default
- CASE entries:
  - each CASE must be assigned to at least one layer (L1-L4, L5 only for representative flows)
- Contracts:
  - contract compliance must be validated at L4

## Volume policy

- Floors and ratios are signals, not completion gates.
- Coverage Ledger completeness is the completion gate (or an approved exception).

If a volume signal is unmet:

1. STOP auto-adjustment.
2. Raise a Change Request with 3 options and recommendation.
3. Wait for explicit user approval.
4. Update upstream artifacts via owner-phase rerun when required.

## Anti-patterns

- Do not map SC to Unit tests mechanically.
- Do not convert all SC items into E2E.
- Do not inflate tests only to satisfy floor numbers.
