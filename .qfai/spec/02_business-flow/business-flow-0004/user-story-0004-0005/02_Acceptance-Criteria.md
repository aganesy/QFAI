# Acceptance Criteria

## Criteria

```gherkin
Feature: Merge every record into the two project tables
  # AC-0004-0005-01
  Scenario: Decided records, log entries, triage records and change requests become decision rows
    Given a project on the spec-pack layout with decision records, decision log entries, triage rows, change requests and a retired spec pack
    When step 2 runs
    Then each decided record becomes exactly one root decisions.md row of the three cells ID, Content and Approach, naming its old ID
    And each new row takes a timestamp ID from the run's start time in UTC, one second apart, after every timestamp ID the register already holds
    And existing origin records and the highest timestamp ID are read from every page and the root
    And rerunning a completed step appends no duplicate origin and rewrites no existing row
    And a record not decided yet, a change request neither approved nor rejected included, becomes an open-questions.md row instead
    And no flow or story is made from the retired spec pack

  # AC-0004-0005-02
  Scenario: Open questions stay open, and an unanswered one keeps blocking
    Given a project on the spec-pack layout with open, deferred, resolved and unadjudicated open questions
    When step 2 runs
    Then each question still open becomes exactly one open-questions.md row of three cells under a new timestamp OQ ID
    And a resolved or superseded question becomes a decision row, not a question row, numbered in the same sequence as every other decision row of the run
    And an unadjudicated question becomes a row whose Content opens with Unadjudicated:
```
