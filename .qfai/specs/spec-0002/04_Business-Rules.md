# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR-ID        | Title                                | AC-Refs      | Rule                                                                                                                                                                 | Notes                                     | NFR-Refs |
| ------------ | ------------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------- |
| BR-0002-0001 | 15 ファイル必須構成                  | AC-0002-0001 | discussion-pack は 01_Context.md ~ 99_delta.md の 15 ファイルを必須とする                                                                                            | QFAI-DPACK-002                            |          |
| BR-0002-0008 | planner-first, explorations unranked | AC-0002-0008 | discussion selects no screen exploration and finalizes no design system; the brand direction it records is the user's choice                                         | prototyping ranks the screen explorations | NFR-0004 |
| BR-0002-0009 | non-UI safe skip                     | AC-0002-0009 | non-UI pack は UI sidecar 不在だけでは fail しない                                                                                                                   | nonUiOverfire safety                      | NFR-0003 |
| BR-0002-0010 | prototyping.yaml optionality         | AC-0002-0010 | README and SKILL state `prototyping.yaml` as optional for a pack with a visual prototyping surface and absent from a cli-only pack; readiness requires it of no pack | README / SKILL canonical wording          |          |

> v1.8.9: BR-0002-0002..0007 (the legacy exploration-sidecar / OQ-blocker rules
> proven by the now-retired `discussionDesignHardening` validator) were
> superseded by DESIGN.md-driven equivalents now owned by the post-1.8.9
> prototyping spec, and have been removed from this active rule table
> together with the corresponding AC / EX / TC / TDD ledger rows.

## Notes

- 旧 discussion-time strategy / taste interview / design-system / evaluation / single-winner sidecar family は active sidecar family ではない。
- discussion sidecar は authoring artifact であり、downstream execution truth は `/qfai-sdd` 後の contracts と `/qfai-prototyping` winner outputs にある。
