# Acceptance Criteria

## Criteria

```gherkin
Feature: Mutation proofs that still replay
  # AC-0003-0030-01
  Scenario: A mutation proof whose code is gone is reported
    Given an example test whose comment under its EX annotation names a file, the original text the proof changed, the substitute, and the assertion that failed
    When `qfai doctor` runs
    Then the `tests.mutationProofs` check is a warning naming the test file and line when the named file does not exist or no longer contains the original text
    And it is `ok` when every proof's file still contains its original text
    And no such check is reported when no example test carries a proof
```
