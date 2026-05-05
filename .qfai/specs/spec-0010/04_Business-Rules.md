# 04 Business-Rules

| BR-ID        | AC-Refs      | Rule                                                                                            |
| ------------ | ------------ | ----------------------------------------------------------------------------------------------- |
| BR-0010-0001 | AC-0010-0001 | UI-bearing discussion packs use the exploration-first sidecar family only.                      |
| BR-0010-0002 | AC-0010-0002 | Exploration brief must expose exploration constraints, not implementation detail.               |
| BR-0010-0003 | AC-0010-0003 | Rubric must evaluate originality explicitly; generic polish-only scoring is insufficient.       |
| BR-0010-0004 | AC-0010-0004 | Evaluator calibration must include negative examples of lenient critique.                       |
| BR-0010-0005 | AC-0010-0005 | Review input bundle must state best-of-history handling for downstream critique loops.          |
| BR-0010-0006 | AC-0010-0006 | Discussion may define inputs for selection, but winner selection itself belongs to prototyping. |
| BR-0010-0007 | AC-0010-0007 | UI-bearing discussion packs MUST emit a root `DESIGN.md` with color / typography / radius / shadow token tables before downstream consumption. |
| BR-0010-0008 | AC-0010-0008 | Legacy sidecar emission (`33_exploration_rubric.md`, `34_evaluator_calibration.md`, `30_exploration_brief.md`, `31_reference_pool.md`, `32_design_anti_goals.md`) is forbidden and must trigger a regression-class validator finding. |
