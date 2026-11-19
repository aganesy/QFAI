# Acceptance Criteria

## Criteria

```gherkin
Feature: Open questions in the source do not block preflight
  # AC-0001-0151-01
  Scenario: No usable source stops SDD preflight
    Given there is no deliberation record of the run or named in the work order, no import-lite input and no explicit user requirement
    When SDD preflight runs
    Then SDD stops because it has no usable source.

  # AC-0001-0151-02
  Scenario: A record with open questions remains source material
    Given a deliberation record with an unanswered Interview row and a question its discussion stage registered in `open-questions.md`
    When SDD preflight runs
    Then those open questions alone do not block SDD from reading the record as source material
    And SDD does not edit the record or rerun the discussion to clear its own gate.

  # AC-0001-0151-03
  Scenario: Preflight writes its summary only inside the output directory
    Given a project whose report directory, or a directory preflight writes under it, is a link to a directory outside it
    When SDD preflight runs
    Then it writes nothing there, stops and names the linked path
    And a summary file that is a link is replaced by the new summary, not written through.
```
