# Acceptance Criteria

## Criteria

```gherkin
Feature: Distributed-surface guards learn the story-tree ID shapes

# AC-0002-0009-01
# Parent: US-0002-0009
Scenario: Guards reject the story-tree ID shapes
  Given the shipped surface, and copies of it that each carry one planted ID of the shapes `DEC-NNNN`, `OQ-NNNN`, `BF-NNNN`, `US-NNNN-NNNN`, `AC-NNNN-NNNN-NN`, `EX-NNNN-NNNN-NN` or `BR-NNNN`
  When the post-build guard and the smoke test run over each
  Then the clean surface passes both, a planted ID with any numeric segment outside the sample band fails both and names its file, and a planted ID whose every numeric segment lies in the sample band passes both
  And the pre-build lint, the post-build guard and the smoke test hold the same pattern set
```
