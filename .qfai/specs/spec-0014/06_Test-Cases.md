# 06 Test Cases

## TC-0014-0001: Full-Scan Always Executes

- EX-Ref: EX-0014-0001
- AC-Refs: AC-0014-0001
- Verify that verify runs full-scan regardless of prior evidence state.

## TC-0014-0002: All Gates Run and Recorded

- EX-Ref: EX-0014-0001
- AC-Refs: AC-0014-0002
- Verify QFAI and repo gates are both executed with commands and results recorded.

## TC-0014-0003: Fix Loop Until PASS

- EX-Ref: EX-0014-0004
- AC-Refs: AC-0014-0003
- Verify failing gates trigger fix loop that iterates until PASS.

## TC-0014-0004: UIX-VAL Determinism

- EX-Ref: EX-0014-0003
- AC-Refs: AC-0014-0004
- Verify same input produces same UIX-VAL output on repeated runs.

## TC-0014-0005: Non-UI Zero Issues

- EX-Ref: EX-0014-0003
- AC-Refs: AC-0014-0005
- Verify zero UIX issues on non-UI projects.

## TC-0014-0006: Error Waiver Rejected

- EX-Ref: EX-0014-0002
- AC-Refs: AC-0014-0006
- Verify error-level waivers are rejected.

## TC-0014-0007: Evidence Summary Completeness

- EX-Ref: EX-0014-0001
- AC-Refs: AC-0014-0007
- Verify evidence includes Change Classification, gate results, commands, and next actions.

## TC-0014-0008: Static Policy Checks

- EX-Ref: EX-0014-0001
- AC-Refs: AC-0014-0008
- Verify drift-protocol.md, test-layers.md exist and SKILL.md files include DRIFT-PROTOCOL tag.

## TC-0014-0009: Migration Detection and Guidance

- EX-Ref: EX-0014-0005
- AC-Refs: AC-0014-0005
- Verify stale sidecar detection produces migration guidance warning.

## TC-0014-0010: Coverage Placeholder for EX-0014-0006

- EX-Ref: EX-0014-0006
- AC-Refs: AC-0014-0001
- Verify that migrated example EX-0014-0006 is covered by at least one test case.

## TC-0014-0011: Coverage Placeholder for EX-0014-0007

- EX-Ref: EX-0014-0007
- AC-Refs: AC-0014-0001
- Verify that migrated example EX-0014-0007 is covered by at least one test case.

## TC-0014-0012: Truthful Evidence State — Captured Pass

- EX-Ref: EX-0014-0008
- AC-Refs: AC-0014-0009
- Verify evidence with state `captured` and actual command output passes truthfulness validation.

## TC-0014-0013: Placeholder Evidence Rejection

- EX-Ref: EX-0014-0009
- AC-Refs: AC-0014-0009
- Verify evidence containing placeholder text ("TODO", "TBD", "N/A placeholder", "paste output here") is rejected.

## TC-0014-0014: Browser QA With Findings Accepted

- EX-Ref: EX-0014-0010
- AC-Refs: AC-0014-0010
- Verify browser QA findings are recorded truthfully with execution metadata when the runner detects issues.

## TC-0014-0015: Browser QA Empty Findings Warning

- EX-Ref: EX-0014-0011
- AC-Refs: AC-0014-0010
- Verify that browser QA returning 0 findings with no execution metadata triggers a warning.

## TC-0014-0016: Canonical Validator Set Enforcement

- EX-Ref: EX-0014-0012
- AC-Refs: AC-0014-0011
- Verify the 3-layer evaluation model's canonical validator family is enforced during verification.

## TC-0014-0017: Non-Canonical Validator Rejection

- EX-Ref: EX-0014-0013
- AC-Refs: AC-0014-0011
- Verify that a validator not registered in the canonical set is rejected with an error.

## TC-0014-0012: Canonical UIX in Verify Path

- EX-Ref: EX-0014-0001
- AC-Refs: AC-0014-0012
- Type: normal

| Step | Action                                                               | Expected                          |
| ---- | -------------------------------------------------------------------- | --------------------------------- |
| 1    | Run qfai validate on a well-formed project                           | Validation completes              |
| 2    | Check validator pipeline for UIX entrypoint                          | runCanonicalUixValidators invoked |
| 3    | Check for runAllUixValidators or runLegacyUixCompatibilityValidators | Neither invoked                   |

## TC-0014-0013: Legacy Validators Excluded from Production

- EX-Ref: EX-0014-0001
- AC-Refs: AC-0014-0013
- Type: boundary

| Step | Action                                 | Expected                                     |
| ---- | -------------------------------------- | -------------------------------------------- |
| 1    | Import from validators/index.ts        | validateDdpFields NOT exported               |
| 2    | Import from validators/legacy/index.ts | validateDdpFields available (migration only) |
| 3    | Run qfai validate                      | No DDP-era issue codes (QFAI-DDP-\*) emitted |

## TC-0014-0014: Phase1 Ratchet in Verify

- EX-Ref: EX-0014-0014
- AC-Refs: AC-0014-0012
- Type: normal

| Step | Action                               | Expected                    |
| ---- | ------------------------------------ | --------------------------- |
| 1    | Set phase1ReleaseDate to 10 days ago | Config ready                |
| 2    | Run verify with UIX-VAL error        | Error downgraded to warning |

## TC-0014-0015: Verify Canonical Validator Set

- EX-Ref: EX-0014-0015
- AC-Refs: AC-0014-0012
- Type: normal

| Step | Action                      | Expected                        |
| ---- | --------------------------- | ------------------------------- |
| 1    | Run verify                  | 12 canonical validators execute |
| 2    | Check for legacy validators | None invoked                    |

## TC-0014-0018: Docs/Runtime Drift Detected (v1.7.15)

- EX-Ref: EX-0014-0016
- AC-Refs: AC-0014-0014
- Type: error

| Step | Action | Expected |
|---|---|---|
| 1 | Modify SKILL.md to claim a constraint with no matching runtime rule | SKILL.md updated |
| 2 | Run verify docs/runtime drift gate | Drift detected, verify fails with specific claim/rule mismatch report |

## TC-0014-0019: Docs/Runtime Drift Clean (v1.7.15)

- EX-Ref: EX-0014-0017
- AC-Refs: AC-0014-0015
- Type: normal

| Step | Action | Expected |
|---|---|---|
| 1 | Ensure all SKILL.md claims have matching runtime validator rules | Claims aligned |
| 2 | Run verify docs/runtime drift gate | Zero drift findings, gate passes |
