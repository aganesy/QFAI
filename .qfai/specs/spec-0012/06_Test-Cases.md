# 06 Test Cases

## TC-0012-0001: All Specs in Coverage Matrix

- EX-Ref: EX-0012-0001
- AC-Refs: AC-0012-0001
- Verify every spec has a row in the Coverage Matrix.

## TC-0012-0002: 4-Source Diff Detection

- EX-Ref: EX-0012-0002
- AC-Refs: AC-0012-0002
- Verify changed specs detected from branch, local, mtime, and delta.md sources.

## TC-0012-0003: Default Mode Is Standard

- EX-Ref: EX-0012-0001
- AC-Refs: AC-0012-0003
- Verify standard mode is used when no explicit mode is specified.

## TC-0012-0004: Full-Harness Requires Opt-In

- EX-Ref: EX-0012-0004
- AC-Refs: AC-0012-0004
- Verify full-harness is not activated without explicit user opt-in.

## TC-0012-0005: API Gate Zero 404

- EX-Ref: EX-0012-0001
- AC-Refs: AC-0012-0005
- Verify API endpoint checks produce zero 404 results.

## TC-0012-0006: Placeholder Page REVISE

- EX-Ref: EX-0012-0005
- AC-Refs: AC-0012-0006
- Verify placeholder-only pages are marked REVISE.

## TC-0012-0007: Non-UI Skips UI Obligations

- EX-Ref: EX-0012-0003
- AC-Refs: AC-0012-0007
- Verify non-ui surfaces skip UI route checks and visual fidelity gates.

## TC-0012-0008: Evidence Dual Artifacts

- EX-Ref: EX-0012-0001
- AC-Refs: AC-0012-0008
- Verify both markdown and JSON evidence exist with uiFidelity for L2.

## TC-0012-0009: Full-Harness Loop Convergence

- EX-Ref: EX-0012-0004
- AC-Refs: AC-0012-0009
- Verify loop terminates at convergence or max iterations with termination reason.
