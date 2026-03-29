# 07 Decisions

## Decisions

- 3 decisions in this spec.

## SD-0030-001: Simple majority rule for reviewer disagreement (interim)

- Status: Accepted (interim)
- Context: When multiple reviewers produce conflicting scores that map to different accept/refine/pivot classifications, the harness needs a deterministic aggregation mechanism. A full escalation policy is deferred to SDD (OQ-0004).
- Decision: Each reviewer's score is classified per the configured thresholds. The classification with the most votes becomes the aggregated decision. In case of a tie, the reviewer with the highest-confidence reviewer score breaks the tie.
- Consequences: Simple and deterministic. May not capture nuanced disagreements. Will be revisited when OQ-0004 escalation policy is designed in SDD.
- Related: OQ-0004, OQ-S30-001, AC-0030-0007, BR-0030-0009, BR-0030-0010

## SD-0030-002: Score delta threshold for plateau detection

- Status: Accepted
- Context: The refinement loop must detect when further iterations yield diminishing returns (plateau). A score-delta-based approach with a fixed lookback window provides a simple, predictable detection mechanism.
- Decision: Plateau is detected when the absolute difference between the max and min scores within the lookback window (default 3 iterations) is below the configured delta threshold (default 0.02). The lookback window size and delta threshold are configurable.
- Consequences: Fixed lookback is simple but may miss slow-drift plateaus outside the window. Acceptable for v1.7.6; adaptive lookback can be considered in a future version.
- Related: DR-0074, AC-0030-0008, BR-0030-0011, BR-0030-0012

## SD-0030-003: File-based calibration pack (no external DB)

- Status: Accepted
- Context: Calibration packs need a storage mechanism. Options considered: (a) external database, (b) embedded in code, (c) file-based YAML under version control. File-based aligns with POL-005 (version-controlled assets) and NFR-0004 (independently updatable).
- Decision: Calibration packs are stored as YAML files under `.qfai/calibration/`. They are loaded at session start and reloaded on modification. No external database dependency is introduced.
- Consequences: Simple, version-controllable, independently updatable. Team members can update calibration packs via standard git workflows. Scales to moderate-sized packs; very large packs may need future optimization.
- Related: AC-0030-0001, BR-0030-0003, BR-0030-0015, NFR-0004, POL-005
