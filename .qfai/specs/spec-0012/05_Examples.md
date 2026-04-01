# 05 Examples

## EX-0012-0001: Standard Mode All-Spec Prototyping

- BR-Ref: BR-0012-0002, BR-0012-0004
- Given 5 specs in `.qfai/specs/`, no explicit mode
- When prototyping runs
- Then standard mode processes all 5 specs with static + optional light validation

## EX-0012-0002: Spec Auto-Discovery Detection

- BR-Ref: BR-0012-0002
- Given 対象 spec modified on branch, 対象 spec stale by mtime
- When auto-discovery runs
- Then both 対象 spec and 対象 spec are flagged (union of sources A and C)

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

## EX-0012-0006: Coverage Placeholder for BR-0012-0001

- BR-Ref: BR-0012-0001
- Given the consolidated rule BR-0012-0001
- When layer coverage is evaluated
- Then at least one example exists for BR-0012-0001

## EX-0012-0007: Coverage Placeholder for BR-0012-0003

- BR-Ref: BR-0012-0003
- Given the consolidated rule BR-0012-0003
- When layer coverage is evaluated
- Then at least one example exists for BR-0012-0003

## EX-0012-0008: Coverage Placeholder for BR-0012-0006

- BR-Ref: BR-0012-0006
- Given the consolidated rule BR-0012-0006
- When layer coverage is evaluated
- Then at least one example exists for BR-0012-0006

## EX-0012-0009: Coverage Placeholder for BR-0012-0007

- BR-Ref: BR-0012-0007
- Given the consolidated rule BR-0012-0007
- When layer coverage is evaluated
- Then at least one example exists for BR-0012-0007

## EX-0012-0010: Skill Invocation — Correct Path

- BR-Ref: BR-0012-0009
- Given a developer wants to run prototyping
- When they invoke `/qfai-prototyping` via the AI agent skill interface
- Then the skill executes, processes all specs, and produces evidence artifacts

## EX-0012-0011: CLI Command Attempt — Not Found

- BR-Ref: BR-0012-0008
- Given a developer runs `qfai prototyping` in the terminal
- When the CLI processes the command
- Then it returns "unknown command" or equivalent error (command does not exist)

## EX-0012-0012: Active Document Mentioning CLI — Violation

- BR-Ref: BR-0012-0008
- Given a policy document states "run `qfai prototyping` to generate skeletons"
- When a spec reviewer scans active documents
- Then the document is flagged as a violation; must be corrected or labelled `[SUPERSEDED v1.7.12]`

## EX-0012-0013: Skill Contract Mode Section — Self-Contained

- BR-Ref: BR-0012-0010
- Given the SKILL.md contract for `/qfai-prototyping`
- When the mode section is inspected
- Then it lists low-cost, standard (default), and full-harness with their obligations, without referencing external policy documents for mode definitions
