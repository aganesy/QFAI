# Acceptance Criteria

## Criteria

```gherkin
Feature: A run keeps and commits its deliberation record
  # AC-0001-0301-01
  Scenario: A run that asks or decides keeps one record
    Given a run whose stages put a question to the user or take a decision nothing written settles
    When the first of them writes it
    Then one file named by the UTC stamp and a slug of the subject is created under the deliberation directory
    And every later stage of the run writes into that file under a subheading of its own
    And a run that asks nothing and takes no such decision writes no record

  # AC-0001-0301-02
  Scenario: The record is committed with the change and is then final
    Given a change route with a deliberation record
    When `verify-commit` commits the change
    Then the same commit holds the record
    And no step edits the record after that commit

  # AC-0001-0301-03
  Scenario: A run without verify-commit commits only its record
    Given a route with no verify stage whose run wrote a deliberation record
    When its last step runs
    Then that step commits locally only the record and the `open-questions.md` rows the run wrote
    And it pushes nothing

  # AC-0001-0301-04
  Scenario: Evidence stays in the stage report and decisions go to the record
    Given a stage that ran gates and took a decision nothing written settles
    When it writes its stage report
    Then the stage report holds the gate results, receipts, review skips and quoted delegation instructions
    And the decision is in the run's deliberation record and in neither report

  # AC-0001-0301-05
  Scenario: Prototyping reads no record
    Given a project with deliberation records and a prototyping run
    When prototyping takes its direction
    Then it reads the root `DESIGN.md` and the UI contracts
    And it opens no deliberation record
```
