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
