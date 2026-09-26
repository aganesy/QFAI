# Acceptance Criteria

## Criteria

```gherkin
Feature: Test annotation layers

# AC-0001-0010-01
# Parent: US-0001-0010
Scenario: A test annotates the ID its layer verifies
  Given a test file of a project on the story tree
  When its layer is read from its directory
  Then an E2E test annotates a BF
  And an integration or API test annotates an AC
  And every other test annotates an EX

# AC-0001-0010-02
# Parent: US-0001-0010
Scenario: Only BF, AC and EX annotations count as coverage
  Given a test of a project on the story tree annotated only with the `QFAI:SPEC-NNNN:` prefix or a contract ID
  When coverage is computed
  Then that annotation covers no item
```
