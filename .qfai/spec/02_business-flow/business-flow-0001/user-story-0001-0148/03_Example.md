# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                       | Expected                                                                      |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| EX-0001-0148-01 | AC-0001-0148-03 | A deliberation record whose Interview has a row the user left unanswered, and specs that already exist, when SDD starts                                     | SDD continues, and the unanswered question becomes an `open-questions.md` row |
| EX-0001-0148-03 | AC-0001-0148-01 | A project with no deliberation record of the run or named in the work order, no import-lite input and no explicit user requirement, when SDD preflight runs | Preflight is blocked, selects no input and names at least one blocker         |
