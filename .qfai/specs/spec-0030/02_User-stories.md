# 02 User Stories

## US Catalog

- US-0030-0001: Calibration Example Pack Loading
- US-0030-0002: Scoring Alignment Configuration
- US-0030-0003: Accept/Refine/Pivot Policy Definition
- US-0030-0004: Reviewer Disagreement Handling
- US-0030-0005: Plateau Detection and Loop Exit
- US-0030-0006: 3-Layer Calibration Pack Alignment (v1.7.6 Remediation)

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

## US-0030-0006: 3-Layer Calibration Pack Alignment (v1.7.6 Remediation)

- Parent: CAP-0030
- Source: discussion-20260329195516830, DR-0080, REQ-0004-CAL
- Goal: As a QFAI maintainer, I want calibration packs to define thresholds per the 3-layer dimension (invariant, trend-derived, product-specific) so that calibration is consistent with the agreed evaluation architecture and legacy 4-axis packs are rejected with migration guidance.
- Non-goals: Automatic pack migration at runtime; calibration pack authoring tooling; critique adapter 3-layer convergence (spec-0029)
- Notes: DR-0080. Calibration packs with empty product-specific sections are accepted with "generic" defaults. Calibration threshold changes require maintainer approval with spec-level traceability.

### Example Seeds

| Perspective         | Example                                                                                    | Status |
| ------------------- | ------------------------------------------------------------------------------------------ | ------ |
| Happy path          | Calibration pack defines thresholds per 3-layer dimension; calibration validates correctly | seed   |
| Negative path       | Calibration references legacy 4-axis dimension; validator rejects with migration guidance  | seed   |
| Edge / boundary     | Calibration pack has empty product-specific section; accepted with "generic" defaults      | seed   |
| Permission / role   | Calibration threshold changes require maintainer approval                                  | seed   |
| State transition    | 4-axis calibration migrated to 3-layer; existing scores preserved                          | seed   |
| Idempotency / retry | Calibration run twice on same data; identical thresholds produced                          | seed   |
