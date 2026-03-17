# Delta Log

## Adopted Decisions

| ID | Decision | Rationale | Date |
|----|----------|-----------|------|
| D-001 | Test file path resolved from project root | Most natural for developers; spec-relative would require ../../ paths | 2026-03-17 |
| D-002 | DR-ID and Evidence added to REQUIRED_COLUMNS | Both needed for exception accountability and traceability | 2026-03-17 |
| D-003 | TC Layer from 06_Test-Cases.md | Source of truth for TC classification; avoids circular dependency with test-list.md | 2026-03-17 |
| D-004 | TDDLIST_INVALID_ID added in v1.6.1 | Prevents malformed IDs from accumulating; low implementation cost | 2026-03-17 |
| D-005 | All Phase 2 checks are error severity | Directly enable completion fraud; warning is too weak | 2026-03-17 |

## Rejected Options

| ID | Option | Reason for Rejection | Recurrence Prevention |
|----|--------|---------------------|-----------------------|
| R-001 | Spec-dir relative path for Test file | Requires ../../ paths; error-prone and unnatural | Document project-root convention in specs/README.md |
| R-002 | DR-ID only as required column (not Evidence) | Evidence tracking is equally important for traceability | Template and docs include both columns |
| R-003 | All TCs as coverage target (not just unit/component) | Integration/E2E TCs are tracked via ATDD ledger, not test-list.md | Layer filtering documented in REQ-0014 |
| R-004 | Defer TDDLIST_INVALID_ID to v1.6.2 | Low cost, high value; no reason to defer | Included in v1.6.1 scope |

## Drift Events

No drift events recorded.
