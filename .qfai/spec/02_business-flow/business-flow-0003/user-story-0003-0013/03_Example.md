# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                   | Expected                                                                                  |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| EX-0003-0013-01 | AC-0003-0013-01 | `<paths.specsDir>/01_policy/` に明示的な `DG-0001` が1件と `MUST` だけを含む別の文がある                                                                | `DG-0001` のみ検出され、`MUST` の文は項目にならない                                       |
| EX-0003-0013-02 | AC-0003-0013-01 | `qfai guardrails list`                                                                                                                                  | `DG-0001` と `non-goal`、文面、根拠、再検討条件、ソースが出力される                       |
| EX-0003-0013-03 | AC-0003-0013-02 | ガードレール 0 件で `qfai guardrails list`                                                                                                              | `- (none)` が出力される                                                                   |
| EX-0003-0013-04 | AC-0003-0013-01 | On the story tree, `qfai guardrails list` with explicit `DG-0001` and `DG-0002` entries under `<paths.specsDir>/01_policy/` and `<paths.contractsDir>/` | Both entries retain their ID, type, rationale, reconsideration condition, and source file |
| EX-0003-0013-06 | AC-0003-0013-01 | `qfai guardrails list --format json` with out-of-order `DG-0001`, `DG-0002`, and `DG-0003` entries of different types                                   | Entries are normalized and ordered by type, then ID, while preserving their source fields |
