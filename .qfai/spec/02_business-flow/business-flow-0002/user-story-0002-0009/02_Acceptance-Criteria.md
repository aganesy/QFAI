# Acceptance Criteria

## Criteria

```gherkin
Feature: Distributed-surface guards learn the story-tree ID shapes
  # AC-0002-0009-01
  Scenario: Guards reject the story-tree ID shapes
    Given the shipped surface, and copies of it that each carry one planted ID of the shapes `DEC-NNNN`, `OQ-NNNN`, `BF-NNNN`, `US-NNNN-NNNN`, `AC-NNNN-NNNN-NN`, `EX-NNNN-NNNN-NN`, `BR-NNNN`, a contract ID `CLI-NNNN`, `API-NNNN`, `DB-NNNN` or `UI-NNNN`, or the lower-case `cli-NNNN`, `api-NNNN`, `db-NNNN` or `ui-NNNN` that starts a contract file name
    When the post-build guard and the smoke test run over each
    Then the clean surface passes both, a planted ID with any numeric segment outside the sample band fails both and names its file, and a planted ID whose every numeric segment lies in the sample band passes both unless it is a business-rule ID or a contract file name that the spec tree of this repository declares, which fails both
    And the pre-build lint, the post-build guard and the smoke test hold the same pattern set, and read the declared IDs from one module
```
