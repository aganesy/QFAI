# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                        | Expected                                                                                                                                              |
| --------------- | --------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0157-01 | AC-0001-0157-01 | The code review of a route returns `REVISE`                                  | The route does not complete until every finding is fixed or answered                                                                                  |
| EX-0001-0157-03 | AC-0001-0157-01 | The fix for a code review finding changes a test's assertions                | The reviewer that raised the finding reviews only the fix's diff, once; each finding of that re-review is fixed or answered with no further re-review |
| EX-0001-0157-04 | AC-0001-0157-01 | The fix for a code review finding rewords a comment and changes no behaviour | No re-review runs, and the finding counts as fixed                                                                                                    |
