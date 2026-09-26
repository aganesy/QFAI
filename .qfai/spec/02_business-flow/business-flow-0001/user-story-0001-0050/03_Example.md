# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                       | Expected                                                                                                                                                                                                                                 |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0050-01 | AC-0001-0050-01 | Given a Reviewer-Gate report JSON containing `{"code": "R-PROMPT-SCANNER-DRIFT", "justification": "   "}` (whitespace-only) When `qfai validate` ingests it | Then validate exits with severity error (advisory-failing); a corrected justification naming (a) `findDesignMdViolations.ts`, (b) `generator-prompt.md`, and (c) the Tailwind preflight clause whose match could not be confirmed passes |
