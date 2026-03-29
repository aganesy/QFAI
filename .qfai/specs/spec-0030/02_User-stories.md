# 02 User Stories

## US Catalog

- US-0030-0001: Calibration Example Pack Loading
- US-0030-0002: Scoring Alignment Configuration
- US-0030-0003: Accept/Refine/Pivot Policy Definition
- US-0030-0004: Reviewer Disagreement Handling
- US-0030-0005: Plateau Detection and Loop Exit

## US-0030-0001: Calibration Example Pack Loading

- Parent: CAP-0030
- Goal: As a harness orchestrator, I want to load calibration example packs at session start so that reviewers have concrete scoring alignment examples to reference during evaluation.
- Non-goals: Generating calibration packs from scratch; calibration packs are authored offline and loaded at runtime.
- Notes: REQ-0006. Calibration packs are file-based (SD-0030-003). If a pack is missing, the system falls back to built-in defaults with a warning.

## US-0030-0002: Scoring Alignment Configuration

- Parent: CAP-0030
- Goal: As a calibration author, I want to define scoring alignment assets so that all reviewers produce consistent scores across runs and team members.
- Non-goals: Dynamic score normalization at runtime; alignment is pre-configured.
- Notes: REQ-0007. Alignment assets include example inputs, expected scores, and rationale annotations. NFR-0004 ensures these assets are independently updatable.

## US-0030-0003: Accept/Refine/Pivot Policy Definition

- Parent: CAP-0030
- Goal: As a harness orchestrator, I want configurable accept/refine/pivot thresholds so that the loop can make data-driven decisions on whether to accept output, request refinement, or signal replanning.
- Non-goals: Automatic threshold tuning; thresholds are set by the calibration author.
- Notes: REQ-0008. Default thresholds: accept >= 0.8, refine >= 0.5, pivot < 0.5. All thresholds are overridable in qfai.config.yaml.

## US-0030-0004: Reviewer Disagreement Handling

- Parent: CAP-0030
- Goal: As a harness orchestrator, I want a mechanism to resolve reviewer disagreement so that the loop can proceed with a deterministic decision when reviewers produce conflicting scores.
- Non-goals: Full escalation policy (deferred to SDD per OQ-0004); this spec covers the interim majority-rule mechanism only.
- Notes: REQ-0009. Interim decision: simple majority rule (SD-0030-001). Ties are broken by the highest-confidence reviewer score.

## US-0030-0005: Plateau Detection and Loop Exit

- Parent: CAP-0030
- Goal: As a loop controller, I want plateau detection based on score delta and lookback window so that the refinement loop exits early when further iterations yield diminishing returns, respecting the NFR-0001 iteration cap.
- Non-goals: Adaptive lookback window sizing; lookback is fixed at 3 iterations.
- Notes: REQ-0010. Plateau is detected when the score delta across a 3-iteration lookback window falls below the configured threshold (default 0.02). The loop also hard-exits at the NFR-0001 cap of 15 iterations.
