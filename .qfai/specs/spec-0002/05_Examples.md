# 05 Examples

| EX-ID        | BR-Ref       | Given / Input                                                                 | Expected                                          | Notes    |
| ------------ | ------------ | ----------------------------------------------------------------------------- | ------------------------------------------------- | -------- |
| EX-0002-0001 | BR-0002-0001 | discussion-pack with 15 files                                                 | readiness pass on file presence                   | Happy    |
| EX-0002-0002 | BR-0002-0002 | OQ Register contains `Disposition: open`                                      | blocking error                                    | Negative |
| EX-0002-0003 | BR-0002-0003 | UI-bearing pack with 30/31/32/33/34/40/50 present                             | sidecar completeness pass                         | Happy    |
| EX-0002-0004 | BR-0002-0004 | `30_exploration_brief.md` missing `## Brand Signals`                          | heading-missing error                             | Negative |
| EX-0002-0005 | BR-0002-0005 | `33_exploration_rubric.md` contains the 4 canonical axes                      | rubric validation passes                          | Happy    |
| EX-0002-0006 | BR-0002-0006 | `34_evaluator_calibration.md` contains good critique / too lenient examples   | calibration pass                                  | Happy    |
| EX-0002-0007 | BR-0002-0007 | `50_review_input_bundle.md` explains best-of-history                          | review bundle pass                                | Happy    |
| EX-0002-0008 | BR-0002-0008 | discussion artifacts omit selected direction and finalized design system      | planner-first pass                                | Happy    |
| EX-0002-0009 | BR-0002-0008 | discussion artifact claims a single winner is final                           | planner-first violation                           | Negative |
| EX-0002-0010 | BR-0002-0009 | non-UI discussion pack without uiux directory                                 | no sidecar-only blocking issue                    | Happy    |
| EX-0002-0011 | BR-0002-0010 | UI-bearing discussion pack with canonical wording for `prototyping.yaml` need | requiredness wording aligns with README and SKILL | Happy    |
