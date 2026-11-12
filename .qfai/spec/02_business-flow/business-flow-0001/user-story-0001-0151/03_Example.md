# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                   | Expected                                                                                                                                                   |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0151-01 | AC-0001-0151-01 | SDD preflight finds no deliberation record of the run or named in the work order, no import-lite input and no explicit user requirement | Preflight stops and identifies that no usable source exists; it does not invent a story tree                                                               |
| EX-0001-0151-02 | AC-0001-0151-02 | A deliberation record with settled answers, one unanswered Interview row and an open `open-questions.md` row                            | Preflight passes the record to SDD as source material; SDD states unresolved matters in its final report or as open questions and does not edit the record |
