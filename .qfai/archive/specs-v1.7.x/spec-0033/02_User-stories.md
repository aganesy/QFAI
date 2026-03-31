# 02 User Stories

## US Catalog

- US-0033-0001: Handoff Artifact Generation
- US-0033-0002: Session Resumption
- US-0033-0003: Display-Only Detection
- US-0033-0004: Stub-Only Detection
- US-0033-0005: Partial Implementation Detection

## US-0033-0001: Handoff Artifact Generation

- Parent: CAP-0033
- Goal: Generate a portable handoff artifact that captures full session state on interruption or at defined checkpoints
- Non-goals: Handoff as a collaboration/sharing mechanism, handoff artifact compression optimization
- Notes: Artifact must capture planner, generator, and evaluator state (REQ-0020). Credentials must be stripped (POL-003)

## US-0033-0002: Session Resumption

- Parent: CAP-0033
- Goal: Resume a session from a previously generated handoff artifact, continuing from the interruption point
- Non-goals: Merging multiple handoff artifacts, concurrent session resumption
- Notes: Must resume >99% of interruption scenarios (NFR-0007). Corrupted artifacts detected and handled gracefully (REQ-0021)

## US-0033-0003: Display-Only Detection

- Parent: CAP-0033
- Goal: Detect and flag generated outputs that contain only display/rendering logic with no functional implementation
- Non-goals: Auto-fixing display-only implementations, AST-based detection
- Notes: Heuristic-based detection per DR-0076. Evaluator flags the finding for developer review (REQ-0022)

## US-0033-0004: Stub-Only Detection

- Parent: CAP-0033
- Goal: Detect and flag generated outputs that consist entirely of stubs (e.g., `throw new Error('not implemented')`, empty function bodies)
- Non-goals: Auto-generating real implementations from stubs, AST-based detection
- Notes: Detection triggers the refine loop to request a real implementation (REQ-0023)

## US-0033-0005: Partial Implementation Detection

- Parent: CAP-0033
- Goal: Detect outputs that are mostly real implementation but contain isolated stub methods or display-only sections, reporting precise locations
- Non-goals: Line-level diff of stub vs real code, coverage-based detection
- Notes: Combines heuristics from US-0033-0003 and US-0033-0004 at method/function granularity
