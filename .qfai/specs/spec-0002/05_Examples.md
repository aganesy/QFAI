# 05 Examples

| EX-ID        | BR-Ref       | Given / Input                                                                                                                   | Expected                                                                                | Notes    |
| ------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- |
| EX-0002-0001 | BR-0002-0001 | discussion-pack with 15 files                                                                                                   | readiness pass on file presence                                                         | Happy    |
| EX-0002-0008 | BR-0002-0008 | UI-bearing pack records the brand theme the user chose, carries its screen explorations unranked and finalizes no design system | planner-first pass                                                                      | Happy    |
| EX-0002-0009 | BR-0002-0008 | UI-bearing pack marks one screen exploration as final                                                                           | completion refused: the explorations must be carried unranked                           | Negative |
| EX-0002-0010 | BR-0002-0009 | non-UI discussion pack without uiux directory                                                                                   | no sidecar-only blocking issue                                                          | Happy    |
| EX-0002-0011 | BR-0002-0010 | the package README, the discussion skill and its artifact rules each carry the optional-artifact sentence                       | all three offer `prototyping.yaml` to a visual-surface pack and none to a cli-only pack | Happy    |

> v1.8.9: EX-0002-0002..0007 (the legacy exploration-sidecar / OQ-blocker
> example fixtures proven by the now-retired `discussionDesignHardening`
> validator) were superseded by DESIGN.md-driven equivalents now owned by
> the post-1.8.9 prototyping spec, and have been removed from this active
> example catalog together with the corresponding AC / TC / TDD ledger rows.
