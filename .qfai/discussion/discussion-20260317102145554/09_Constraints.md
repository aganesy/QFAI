# 09 Constraints

## Technical Constraints

| ID    | Constraint                                                                           | Rationale                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| TC-01 | Implementation must be in TypeScript within the existing monorepo (`packages/qfai/`) | Consistency with existing codebase; shared build and test infrastructure                                                           |
| TC-02 | Non-implementation skills must remain backward compatible                            | Only implementation-phase skills are affected; design, review, and other workflow skills must continue to function unchanged       |
| TC-03 | Phase 1 validator must use the existing error infrastructure                         | Validators must report errors through the established error handling and reporting mechanisms; no new error subsystem introduction |
| TC-04 | `test-list.md` must reside at `.qfai/specs/spec-XXXX/tdd/test-list.md`               | Conforms to the existing spec directory layout convention defined in SRC-0004                                                      |

## Operational Constraints

| ID    | Constraint                               | Rationale                                                                                                                                 |
| ----- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| OC-01 | 1 version = 1 PR policy                  | All v1.6.0 changes must ship in a single pull request to maintain atomic versioning                                                       |
| OC-02 | All wrapper formats must be synchronized | `.agents`, `.claude`, and `.codex` wrappers must be updated in the same PR to avoid inconsistent skill availability across tool platforms |
| OC-03 | Serial execution by default              | Parallelization is allowed only for provably independent slices; default execution order is serial to prevent state corruption            |

## Budget and Deadline Constraints

| ID    | Constraint                    | Rationale                                                                                                                               |
| ----- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| BD-01 | No specific external deadline | v1.6.0 is an internal milestone; delivery is driven by quality gates (all tests pass, no orphan references) rather than a calendar date |

## Legal Constraints

None applicable. No regulatory, licensing, or contractual requirements are affected by v1.6.0 changes.
