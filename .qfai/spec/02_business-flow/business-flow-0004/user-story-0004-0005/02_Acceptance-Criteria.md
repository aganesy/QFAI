# Acceptance Criteria

## Criteria

```gherkin
Feature: Merge every record into the two project tables

# AC-0004-0005-01
# Parent: US-0004-0005
Scenario: Decision records, log entries, triage records and change requests become rows
  Given a project on the spec-pack layout with decision records, decision log entries, triage rows, change requests and a retired spec pack
  When step 2 runs
  Then each becomes exactly one decisions.md row of four cells under a new DEC-NNNN ID, naming its old ID
  And each row's Status is the one the status map gives its old status
  And no flow or story is made from the retired spec pack

# AC-0004-0005-02
# Parent: US-0004-0005
Scenario: Open questions keep their standing, and an unanswered one keeps blocking
  Given a project on the spec-pack layout with open, deferred, resolved and unadjudicated open questions
  When step 2 runs
  Then each becomes exactly one open-questions.md row under a new OQ-NNNN ID
  And an unadjudicated question becomes a TODO row whose Content opens with Unadjudicated:
```
