# Traceability Matrix — SPEC-0001: Order draft creation

## Metadata

| Key     | Value      |
| ------- | ---------- |
| Spec ID | SPEC-0001  |
| Created | 2026-02-12 |
| Updated | 2026-02-12 |

## Full chain (REQ → BR → AC → CASE → SC → Status → Contracts)

| REQ           | BR           | AC           | CASE           | SC           | Status      | Contracts                  |
| ------------- | ------------ | ------------ | -------------- | ------------ | ----------- | -------------------------- |
| REQ-FUNC-0001 | BR-0001-0001 | AC-0001-0001 | CASE-0001-0001 | SC-0001-0001 | implemented | UI-0001, API-0001, DB-0001 |
| REQ-FUNC-0001 | BR-0001-0002 | AC-0001-0002 | CASE-0001-0002 | SC-0001-0002 | implemented | API-0001, DB-0001          |
| REQ-FUNC-0002 | BR-0001-0003 | AC-0001-0003 | CASE-0001-0003 | SC-0001-0003 | implemented | API-0001                   |

## Coverage summary

- Missing AC coverage: none
- Missing CASE coverage: none
- Missing SC coverage: none

## Notes

- This matrix is the compatibility SSOT for validator-based trace checks.
- Layered mapping detail is also tracked in `16_Traceability-ledger.md`.
