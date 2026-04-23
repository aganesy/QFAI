# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR-ID        | Title                              | AC-Refs                    | Rule                                                                                                                                                 | Notes                                     | NFR-Refs |
| ------------ | ---------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------- |
| BR-0002-0001 | 15 ファイル必須構成                | AC-0002-0001               | discussion-pack は 01_Context.md ~ 99_delta.md の 15 ファイルを必須とする                                                                            | QFAI-DPACK-002                            |          |
| BR-0002-0002 | OQ exit gate                       | AC-0002-0002               | 11_OQ-Register.md の `Disposition: open` が 0 件でなければ discussion は完了できない                                                                  | QFAI-DPACK-004                            |          |
| BR-0002-0003 | exploration-first sidecar family   | AC-0002-0003               | UI-bearing pack は `30/31/32/33/34/40/50` の sidecar family を生成する                                                                               | discussionDesignHardening                 | NFR-0003 |
| BR-0002-0004 | exploration brief required headings | AC-0002-0004               | `30_exploration_brief.md` は Product Intent / Must-preserve Interactions / Brand Signals / Differentiation Targets を含む                           | discussionDesignHardening                 |          |
| BR-0002-0005 | rubric required headings           | AC-0002-0005               | `33_exploration_rubric.md` は Design Quality / Originality / Craft / Functionality を含む                                                            | discussionDesignHardening                 |          |
| BR-0002-0006 | calibration required headings      | AC-0002-0006               | `34_evaluator_calibration.md` は Good Critique / Too Lenient / Blandness Fail / Originality Fail を含む                                             | discussionDesignHardening                 |          |
| BR-0002-0007 | review bundle best-of-history      | AC-0002-0007               | `50_review_input_bundle.md` は best-of-history handling を含む                                                                                        | renderCritique / prototyping handoff      |          |
| BR-0002-0008 | planner-first no winner            | AC-0002-0008               | discussion は selected direction / winning direction / finalized design system を確定しない                                                           | prototyping が direction を選ぶ           | NFR-0004 |
| BR-0002-0009 | non-UI safe skip                   | AC-0002-0009               | non-UI pack は UI sidecar 不在だけでは fail しない                                                                                                   | nonUiOverfire safety                      | NFR-0003 |
| BR-0002-0010 | prototyping.yaml requiredness      | AC-0002-0010               | latest discussion pack が UI-bearing の場合のみ `prototyping.yaml` requiredness を明示する                                                           | README / SKILL canonical wording          |          |

## Notes

- 旧 discussion-time strategy / taste interview / design-system / evaluation / single-winner sidecar family は active sidecar family ではない。
- discussion sidecar は authoring artifact であり、downstream execution truth は `/qfai-sdd` 後の contracts と `/qfai-prototyping` winner outputs にある。
