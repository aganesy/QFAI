# SPEC-0001: Order draft creation

QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001

## Metadata

| Key     | Value                   |
| ------- | ----------------------- |
| Spec ID | SPEC-0001               |
| Title   | Order draft creation    |
| Status  | Draft                   |
| Owner   | Product and Engineering |
| Created | 2026-02-12              |
| Updated | 2026-02-12              |

## 1. Goal

Allow operators to create order drafts safely and receive deterministic duplicate feedback.

## 2. Non-goals

- Final order confirmation and payment processing

## 3. Background / Context

- Draft creation is the first step of order operations.
- Duplicate submissions must be rejected consistently.

## 4. Scope

### 4.1 In scope

- Draft creation API behavior
- Duplicate detection and error response contract

### 4.2 Out of scope

- Post-draft workflows

## 5. Business Rules (BR)

- [BR-0001-0001][P0] Draft status starts as `draft` at creation time.
- [BR-0001-0002][P0] Customer and item combination must be unique for active drafts.
- [BR-0001-0003][P1] Duplicate failures must emit `DUPLICATE_ORDER_DRAFT`.

## 6. Acceptance Criteria (AC)

- [AC-0001-0001][P0] Valid input creates a draft and returns success response.
- [AC-0001-0002][P0] Duplicate customer and item input returns conflict response.
- [AC-0001-0003][P1] Duplicate error payload includes a stable error code.

## 7. Edge Cases / Risks

- Duplicate race between concurrent requests

## 8. Observability / Operability

- Log conflict responses with stable error code.
- Track duplicate rejection count.

## 9. Open Questions

- [OQ-SPEC-0001-0001] Should duplicate detection include archived drafts?

## 10. Revision History

| Date       | Change         |
| ---------- | -------------- |
| 2026-02-12 | Initial sample |
