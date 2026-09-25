# 06 Test Cases

## Test Case Table (required)

| TC-ID        | Level | AC-Refs      | EX-Ref       | Steps                                                                                         | Expected                                                                                                                                      | Notes                 |
| ------------ | ----- | ------------ | ------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| TC-0002-0001 | L3    | AC-0002-0001 | EX-0002-0001 | discussion-pack fixture with 15 files; run readiness                                          | required-file issue is not reported                                                                                                           | 15 files pass         |
| TC-0002-0008 | L3    | AC-0002-0008 | EX-0002-0008 | read the shipped discussion completion conditions for a UI-bearing pack                       | no selected screen exploration or finalized design system is a completion condition, and the brand direction is recorded as the user's choice | explorations unranked |
| TC-0002-0009 | L3    | AC-0002-0008 | EX-0002-0009 | read the shipped completion conditions against a pack that marks one screen exploration final | they refuse completion: the explorations must be carried unranked                                                                             | negative posture      |
| TC-0002-0010 | L3    | AC-0002-0009 | EX-0002-0010 | non-UI pack without sidecars                                                                  | no UI-only blocking issue                                                                                                                     | non-ui safe skip      |
| TC-0002-0011 | L3    | AC-0002-0010 | EX-0002-0011 | inspect the package README, the discussion skill and its artifact rules                       | each carries the same sentence: optional for a pack with a visual prototyping surface, none for a cli-only pack                               | wording consistency   |

## Notes

- legacy single-winner selection, legacy comparison, legacy evaluation contract, legacy winner contract 前提の test case は active path から除外された。
- discussion の active validator surface は new sidecar completeness, required headings, planner-first posture, and non-ui safe skip である。
- v1.8.9: the legacy `discussionDesignHardening` validator and its proving tests were retired together with the exploration-sidecar family. The historical 0002..0007 range of test-case IDs in this spec (the validator's behavior catalog) was superseded by DESIGN.md-driven equivalents now owned by the post-1.8.9 prototyping spec, and the corresponding rows have been removed from this active table together with the matching TDD ledger rows. The remaining entries cover the validator-agnostic discussion surfaces (planner-first posture, non-UI safe skip, canonical wording).
