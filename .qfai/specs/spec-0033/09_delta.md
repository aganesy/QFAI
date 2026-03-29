# 09 Delta

## Change Summary

- Change ID: DELTA-S33-001
- Date: 2026-03-29
- Primary: spec-0033 initial creation
- Tags: v1.7.6, handoff, display-detection, stub-detection
- Summary: Initial spec creation for Handoff & Display/Stub Detection (CAP-0033)

## Rationale

- Long-running sessions need recovery mechanism
- Superficial implementations must be detected and flagged

## Candidates Considered

1. AST-based detection
2. Heuristic-based detection (adopted)
3. Hybrid heuristic + AST

## Adopted

- Adopted: Heuristic-based detection with configurable sensitivity
- Why: Sufficient accuracy for initial release, avoids AST complexity (SD-0033-001, DR-0076)
- Evidence: discussion-20260329175059391

## Rejected

- Candidate: AST-based detection
- Reason: Complexity disproportionate to benefit for initial release
- DO NOT: Implement AST parsing for display/stub detection in v1.7.6
- Temptation: AST provides more precise detection

- Candidate: Hybrid heuristic + AST
- Reason: Implementation burden too high for incremental accuracy gain
- DO NOT: Mix detection approaches in v1.7.6
- Temptation: Get best of both worlds

- Candidate: User-locked handoff artifacts
- Reason: Limits team collaboration and handoff between members
- DO NOT: Require user authentication for handoff artifact access
- Temptation: Prevent unauthorized session resumption

## Impact

- Affects: packages/qfai/src/core/handoff/ (new), packages/qfai/src/core/detection/ (new)
- Validation: qfai validate pass, integration tests for all TC-0033-* cases

## Follow-ups

- None (all OQs resolved)
