# Acceptance Criteria

## Criteria

```gherkin
Feature: Prototyping mutation log
  # AC-0001-0146-01
  Scenario: iter-NN evidence mutation audit-log (REQ-0165)
    Given `iterate` or `certify` performing a destructive mutation (delete / overwrite) on any path under `.qfai/evidence/prototyping/iter-NN/*`,
    When the mutation occurs,
    Then a `.qfai/evidence/prototyping/mutation-log.jsonl` JSON-Lines entry shaped `{ ts, caller, path, action, priorSize, newSize }` MUST be appended for every such mutation, including each file moved by `iterate --cycle 0 --force`.
    And the mutation-log MUST be git-ignored by default.

  # AC-0001-0146-02
  Scenario: Unlogged iter-NN mutation reviewer-gate finding (REQ-0165)
    Given a PR introducing a code path that mutates iter-NN evidence,
    When the path does not call the mutation-log writer,
    Then Reviewer Gate MUST emit `R-EVIDENCE-MUTATION-UNLOGGED` (severity error).
```
