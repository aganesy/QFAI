# 05 Examples

## EX-0014-0001: Full Verify Pass

- BR-Ref: BR-0014-0001, BR-0014-0002
- Given a project with all gates configured
- When `/qfai-verify` runs format, lint, typecheck, tests, build, and `qfai validate`
- Then all gates PASS and evidence summary is produced

## EX-0014-0002: Error Waiver Rejected

- BR-Ref: BR-0014-0003
- Given a waiver for `QFAI-COV-201` (error severity)
- When waiver is checked
- Then it is rejected: "Error-level waiver rejected; fix root cause"

## EX-0014-0003: Non-UI Zero UIX Issues

- BR-Ref: BR-0014-0006
- Given a CLI project with no uiux/ sidecar
- When UIX-VAL validators run
- Then zero issues reported (non-UI surface detected, validators skipped)

## EX-0014-0004: Fix Loop Iteration

- BR-Ref: BR-0014-0001
- Given lint gate fails with 3 issues
- When fix loop runs: fix issues -> re-run lint -> PASS
- Then lint gate transitions from FAIL to PASS

## EX-0014-0005: Migration Detection

- BR-Ref: BR-0014-0006
- Given a project with pre-v1.7.3 sidecar format
- When migration check runs
- Then warning with step-by-step upgrade guidance is produced

## EX-0014-0006: Coverage Placeholder for BR-0014-0004

- BR-Ref: BR-0014-0004
- Given the consolidated rule BR-0014-0004
- When layer coverage is evaluated
- Then at least one example exists for BR-0014-0004

## EX-0014-0007: Coverage Placeholder for BR-0014-0005

- BR-Ref: BR-0014-0005
- Given the consolidated rule BR-0014-0005
- When layer coverage is evaluated
- Then at least one example exists for BR-0014-0005

## EX-0014-0008: Truthful Evidence — Captured (Pass)

- BR-Ref: BR-0014-0007
- Given a gate that executes successfully
- When evidence is recorded with state `captured` and actual command output in the body
- Then evidence passes truthfulness validation

## EX-0014-0009: Placeholder Evidence (Fail)

- BR-Ref: BR-0014-0007
- Given evidence with body text "TODO: paste output here"
- When evidence truthfulness validation runs
- Then it rejects with: "Evidence body contains placeholder text; replace with actual output"

## EX-0014-0010: Browser QA With Findings (Pass)

- BR-Ref: BR-0014-0008
- Given browser QA runner executes against a project with accessibility issues
- When the runner completes with 2 findings (e.g., missing alt text, low contrast ratio)
- Then findings are recorded truthfully with execution metadata and the gate result reflects the issues found

## EX-0014-0011: Browser QA Empty Findings (Warning)

- BR-Ref: BR-0014-0008
- Given browser QA runner executes but returns 0 findings with no execution metadata
- When evidence is checked
- Then a warning is emitted: "Browser QA returned 0 findings with no execution metadata; verify runner is functional"

## EX-0014-0012: Canonical Validator Set Enforced (Pass)

- BR-Ref: BR-0014-0009
- Given a verify workflow configured with the 3-layer evaluation model
- When all executed validators belong to the canonical set
- Then verification proceeds without validator-family errors

## EX-0014-0013: Non-Canonical Validator Rejected (Fail)

- BR-Ref: BR-0014-0009
- Given a validator not registered in the canonical set attempts to execute
- When the verify workflow checks validator registration
- Then the validator is rejected with: "Validator not in canonical family; register or remove"

## EX-0014-0014: Phase1 Ratchet in Verify

- BR-Ref: BR-0014-0013

| Input                                         | Expected                                  |
| --------------------------------------------- | ----------------------------------------- |
| phase1ReleaseDate 10 days ago + UIX-VAL error | Error downgraded to warning during verify |
| phase1ReleaseDate 40 days ago + UIX-VAL error | Error stays as error                      |

## EX-0014-0015: Verify Canonical Validator Set

- BR-Ref: BR-0014-0014

| Input                             | Expected                                              |
| --------------------------------- | ----------------------------------------------------- |
| Run verify on well-formed project | 12 canonical validators execute, no legacy validators |

## EX-0014-0016: Docs/Runtime Drift Detected (v1.7.15)

- BR-Ref: BR-0014-0015, BR-0014-0016
- Given SKILL.md claims "specCoverage must be non-zero-seeded" but the corresponding validator rule PROT-305 has been disabled or removed from prototypingEvidence.ts
- When verify runs the docs/runtime drift gate
- Then drift is detected: "SKILL.md claim 'specCoverage must be non-zero-seeded' has no matching runtime error condition" and verify fails

## EX-0014-0017: Docs/Runtime Drift Clean (v1.7.15)

- BR-Ref: BR-0014-0015
- Given all SKILL.md claims (reviewer required, convergence >=2 iterations, specCoverage non-zero-seeded, etc.) each have a matching runtime validator rule (PROT-295, PROT-308, PROT-305, etc.)
- When verify runs the docs/runtime drift gate
- Then zero drift findings, gate passes
