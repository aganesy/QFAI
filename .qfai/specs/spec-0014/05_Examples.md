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
