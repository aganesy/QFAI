# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                      | Expected                                                                                                                                                                                                                                                                                         |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EX-0001-0116-04 | AC-0001-0116-03 | The prototype exposes a sidebar with 6 entries and a topbar with 2 entries, when the Reviewer runs its Playwright session. | It attempts to navigate every primary menu entry, and `menuReachabilityFeel` in the review payload describes which entries reached intended targets and which did not (e.g. "sidebar/Reports leads to 404"); unreachable entries surface as qualitative critique and do NOT hard-fail the cycle. |
