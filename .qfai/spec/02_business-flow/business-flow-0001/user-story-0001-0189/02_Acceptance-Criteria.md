# Acceptance Criteria

## Criteria

```gherkin
Feature: Evaluation Harness for Research Quality

# AC-0001-0189-01
# Parent: US-0001-0189
Scenario: Golden task evaluation with expected outcome
  Given a golden task with expected sources and citations
  When the evaluation harness runs the task
  Then citation precision, coverage, freshness, and security hygiene are scored
  And results are compared against expected grading criteria
```
