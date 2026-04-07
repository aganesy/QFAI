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

## EX-0012-0014: Mode Resolution with Discussion Recommendation

- BR-Ref: BR-0012-0011

| Input                                                                   | Expected                                                     |
| ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| prototyping.yaml: recommended_mode=low-cost, no user override           | effectiveMode="low-cost", source="discussion-recommendation" |
| prototyping.yaml: recommended_mode=low-cost, user override=full-harness | effectiveMode="full-harness", source="explicit-request"      |

## EX-0012-0015: Existence-Based Precedence

- BR-Ref: BR-0012-0012

| Input                                                                       | Expected                                |
| --------------------------------------------------------------------------- | --------------------------------------- |
| prototyping.yaml: `prototyping: null` (key exists, value null)              | Error: non-object namespaced block      |
| prototyping.yaml: no `prototyping` key, has `recommended_mode` at top level | Hard error: legacy top-level keys rejected (v1.7.14, DR-0112) |

## EX-0012-0016: Obligation Matrix

- BR-Ref: BR-0012-0014

| Surface | Mode         | requireRuntimeGate | requireUiFidelity | requireFullHarness |
| ------- | ------------ | ------------------ | ----------------- | ------------------ |
| web     | standard     | true               | true              | false              |
| web     | full-harness | true               | true              | true               |
| non-ui  | standard     | true               | false             | false              |
| non-ui  | low-cost     | false              | false             | false              |

## EX-0012-0017: Recommendation Artifact Status Values

- BR-Ref: BR-0012-0013

| Input                                               | Expected                                        |
| --------------------------------------------------- | ----------------------------------------------- |
| Valid prototyping.yaml in latest discussion-pack    | status="valid", recommendation object populated |
| prototyping.yaml exists but missing required fields | status="invalid", warnings populated            |
| Discussion-pack exists but no prototyping.yaml      | status="missing"                                |
| No discussion-pack found                            | status="no-pack"                                |

## EX-0012-0018: Calibration Config Normalization

- BR-Ref: BR-0012-0015

| Input                                                               | Expected                                                                                 |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Config with no prototyping stanza                                   | Defaults: accept=0.8, refine=0.5, maxIterations=15, plateauDelta=0.02, plateauLookback=3 |
| Config with prototyping.calibration.thresholds.accept=0.9           | accept=0.9, all other fields use defaults                                                |
| Config with prototyping.calibration.thresholds.accept=2.0 (invalid) | accept replaced with default 0.8                                                         |

## EX-0012-0019: fullHarness Converged vs Max-Iterations

- BR-Ref: BR-0012-0016

| terminationReason | Condition                                                     |
| ----------------- | ------------------------------------------------------------- |
| "converged"       | All dimension floors met + aggregate score > accept threshold |
| "max-iterations"  | maxIterations reached without convergence                     |
| null              | Full-harness not enabled or not started                       |

## EX-0012-0020: Mode Provenance Tracking

- BR-Ref: BR-0012-0018

| Scenario                                    | requested      | effective      | source                      | sourceSchema |
| ------------------------------------------- | -------------- | -------------- | --------------------------- | ------------ |
| User requests full-harness                  | "full-harness" | "full-harness" | "explicit-request"          | null         |
| Discussion recommends low-cost (namespaced) | null           | "low-cost"     | "discussion-recommendation" | "namespaced" |
| No input at all                             | null           | "standard"     | "system-default"            | null         |

## EX-0012-0021: Calibration Config Fields

- BR-Ref: BR-0012-0017

| Field             | Default | Valid Range      |
| ----------------- | ------- | ---------------- |
| thresholds.accept | 0.8     | 0.0-1.0          |
| thresholds.refine | 0.5     | 0.0-1.0          |
| maxIterations     | 15      | positive integer |
| plateauDelta      | 0.02    | non-negative     |
| plateauLookback   | 3       | non-negative     |

## EX-0012-0022: Surface Inference Priority

- BR-Ref: BR-0012-0019

| Input                                       | Expected                   |
| ------------------------------------------- | -------------------------- |
| prototyping.yaml surface="web"              | surface="web" (explicit)   |
| No surface field, evidence has uiRoutes > 0 | surface="web" (inferred)   |
| No surface field, no evidence signals       | surface=null (v1.7.14: no default, returns null) |
