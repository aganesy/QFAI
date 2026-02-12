# Plan: Order draft creation

Spec ID: spec-0001  
Plan ID: PLAN-0001  
Status: Draft  
Created: 2026-02-12  
Updated: 2026-02-12  
Owner (AI/Role): Engineering  
Reviewer (AI/Role): QA

## Metadata

- Repository: aganesy/QFAI
- Target version: vX.Y.Z
- Related docs:
  - spec.md: `.qfai/specs/spec-0001/spec.md`
  - scenario.feature: `.qfai/specs/spec-0001/scenario.feature`
  - case-catalogue.md: `.qfai/specs/spec-0001/case-catalogue.md`
  - contracts: `.qfai/contracts/**`

## Context & Scope

### 2.1 Context

- Problem statement: order draft creation must be deterministic and reject duplicates.
- Background: this is the first executable slice for order processing.
- Why now: downstream implementation phases require a concrete How SSOT.

### 2.2 In scope

- Draft create path
- Duplicate conflict handling
- Stable error code output

### 2.3 Out of scope

- Payment and final order confirmation

### 2.4 Constraints

- Product/Business constraints: duplicate policy is strict.
- Tech constraints: uniqueness enforced in persistence layer.
- Ops/Compliance constraints: error code contract must be stable.
- Timeline constraints: deliver in two incremental slices.

## Goals / Non-goals

### 3.1 Goals (must achieve)

- Cover AC-0001-0001 to AC-0001-0003 with verifiable tests.

### 3.2 Non-goals (explicitly not doing)

- Building post-draft workflows.

## Architecture Outline

### 4.1 System context

- UI submits draft create request.
- API validates and persists.
- DB enforces uniqueness.

### 4.2 Module boundaries

- API module: input validation and error mapping.
- Persistence module: uniqueness and storage.

### 4.3 Data model / migrations

- Entities: order draft.
- Constraints/invariants: customer + item unique for active drafts.
- Migration plan: none for sample.

### 4.4 API / Interfaces (contracts)

- Endpoints/messages: draft create request and response.
- Error contract: `DUPLICATE_ORDER_DRAFT`.
- Auth/RBAC: inherited from project policy.

### 4.5 Cross-cutting concerns

- Logging/Tracing: record duplicate conflicts.
- Metrics: count create success/failure.
- Config: no new runtime config.
- Security: validate input boundaries.
- Performance: keep duplicate check indexed.

## Verification Strategy

### 5.1 Test Layers & Responsibilities

- L1 Unit: validation and mapping logic.
- L2 Component: module contracts.
- L3 Integration: API + DB duplicate behavior.
- L4 API: endpoint status and payload.
- L5 E2E: not primary for this slice.

### 5.2 Traceability Mapping

| Item         | Source (SC/CASE/BR/AC/Contract) | Layer       | Notes                |
| ------------ | ------------------------------- | ----------- | -------------------- |
| duplicate-01 | SC-0001-0002 / CASE-0001-0002   | integration | conflict behavior    |
| error-code   | SC-0001-0003 / CASE-0001-0003   | api         | stable error payload |

### 5.3 Acceptance Test Implementation Rules

- Keep SC to CASE mapping explicit.
- Do not convert every scenario to E2E.

### 5.4 Test Data & Environment

- Seed one existing draft for duplicate checks.
- Reset data per test run.

### 5.5 Quality Gates (CI/Suite)

- Local: format/lint/types/tests.
- PR: full validation and asset checks.
- Merge: same as PR.

### 5.6 Volume Signals (NOT gates)

- Watch overuse of e2e.
- Prefer api/integration for this capability.

## Implementation Plan

### 6.1 Steps (independently testable increments)

1. Step 1:
   - Output: create draft success path.
   - Tests (layers): api + unit.
2. Step 2:
   - Output: duplicate conflict and stable error contract.
   - Tests (layers): integration + api.

### 6.2 Dependencies / sequencing constraints

- Duplicate contract depends on persistence uniqueness.

### 6.3 Rollout / Migration

- No migration for sample artifact.

### 6.4 Observability updates

- Add duplicate-rejection metric.

## Risks & Mitigations

| Risk           | Impact                | Mitigation                       | Owner   |
| -------------- | --------------------- | -------------------------------- | ------- |
| duplicate race | inconsistent response | db uniqueness + conflict mapping | backend |

## Open Questions / Blockers

### 8.1 Blockers

- none

### 8.2 Non-blockers

- OQ-SPEC-0001-0001 pending product follow-up.

## Done Checklist

- [ ] Required sections are filled
- [ ] Traceability mapping is completed
- [ ] CI suite strategy is written
- [ ] Blockers are resolved
