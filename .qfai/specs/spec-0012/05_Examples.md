# 05 Examples

## EX-0012-0001: Standard Mode All-Spec Prototyping

- BR-Ref: BR-0012-0002, BR-0012-0004
- Given 5 specs in `.qfai/specs/`, no explicit mode
- When prototyping runs
- Then standard mode processes all 5 specs with static + optional light validation

## EX-0012-0002: Spec Auto-Discovery Detection

- BR-Ref: BR-0012-0002
- Given spec-0001 modified on branch, spec-0002 stale by mtime
- When auto-discovery runs
- Then both spec-0001 and spec-0002 are flagged (union of sources A and C)

## EX-0012-0003: Non-UI Coverage Matrix

- BR-Ref: BR-0012-0002
- Given a CLI project with `surface: non-ui`
- When Coverage Matrix is generated
- Then UI-specific rows are marked n/a

## EX-0012-0004: Full-Harness Convergence

- BR-Ref: BR-0012-0004
- Given full-harness mode with max 5 iterations
- When all dimension floors are met at iteration 3
- Then loop terminates with "converged" status

## EX-0012-0005: Placeholder Page REVISE

- BR-Ref: BR-0012-0005
- Given a page with only "Lorem ipsum" content
- When reviewer evaluates
- Then it returns REVISE (placeholder-only is not accepted)
