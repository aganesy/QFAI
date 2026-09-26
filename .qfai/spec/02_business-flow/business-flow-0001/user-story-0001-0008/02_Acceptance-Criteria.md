# Acceptance Criteria

## Criteria

```gherkin
Feature: ID grammar

# AC-0001-0008-01
# Parent: US-0001-0008
Scenario: Each ID has one of seven shapes and is declared once
  Given a project on the story tree
  When every declared ID is collected
  Then each has one of the shapes `BF-NNNN`, `US-NNNN-NNNN`, `AC-NNNN-NNNN-NN`, `EX-NNNN-NNNN-NN`, `BR-NNNN`, `DEC-NNNN` or `OQ-NNNN`
  And no ID is declared twice in the tree

# AC-0001-0008-02
# Parent: US-0001-0008
Scenario: An ID carries the number of the directory it sits in
  Given a story directory inside a flow directory on the story tree
  When the IDs it declares are read
  Then the story ID starts with the flow's number
  And every AC and EX ID starts with the story ID
  And each directory name matches the ID it holds

# AC-0001-0008-03
# Parent: US-0001-0008
Scenario: The next ID is the highest plus one
  Given a project on the story tree
  When the next ID of a shape is chosen
  Then it is the highest ID of that shape the tree names under the same parent (the flow for a US, the story for an AC or EX), `decisions.md` rows included, plus one
  And a gap is never filled and a retired ID is never reissued
```
