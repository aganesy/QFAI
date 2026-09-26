# Acceptance Criteria

## Criteria

```gherkin
Feature: The shape table moves with the leak guards

# AC-0002-0023-01
# Parent: US-0002-0023
Scenario: The rule a contributor reads matches the patterns the guards enforce
  Given a pull request that teaches the three distributed-surface guards the DEC, OQ, BF, US, AC, EX and BR shapes
  When the shape table in .agents/rules/distributed-surface.local.md is read in that pull request
  Then it has a row for each of DEC-NNNN, OQ-NNNN, BF-NNNN, US-NNNN-NNNN, AC-NNNN-NNNN-NN, EX-NNNN-NNNN-NN and BR-NNNN
  And it states the sample band a shipped template may use: 0001 to 0009 on every four-digit segment, and 01 to 09 on a two-digit tail
  And every row the table held before is still there
  And the pull request edits no shipped template
  And a pull request that changes the guards' pattern set without the table, or the table without the guards, is rejected in review
```
