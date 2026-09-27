# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                 | Expected                                                                                                                                              |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0163-01 | AC-0001-0163-01 | Given a review artifact says `REVISE`                                                                                                                                 | Then verify blocks completion                                                                                                                         |
| EX-0001-0163-02 | AC-0001-0163-02 | Given a UI-bearing repo with prototyping evidence under `.qfai/evidence/prototyping/iter-03/{home.png, home.html, review.json}` When `/qfai-verify` inspects evidence | Then the iter-03 layout is accepted as the active SSOT and any required-path lookup against legacy `screenshots/` / `html/` directories is not raised |
