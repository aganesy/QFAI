# Acceptance Criteria

## Criteria

```gherkin
Feature: ID grammar
  # AC-0001-0008-01
  Scenario: Each ID has one of seven shapes and is declared once
    Given a project on the story tree
    When every declared ID is collected
    Then each has one of the shapes `BF-NNNN`, `US-NNNN-NNNN`, `AC-NNNN-NNNN-NN`, `EX-NNNN-NNNN-NN`, `BR-<contract number>-NNNN`, `DEC-NNNN` or `OQ-NNNN`
    And no ID is declared twice in the tree

  # AC-0001-0008-02
  Scenario: An ID carries the number of the directory it sits in
    Given a story directory inside a flow directory on the story tree
    When the IDs it declares are read
    Then the story ID starts with the flow's number
    And every AC and EX ID starts with the story ID
    And each directory name matches the ID it holds

  # AC-0001-0008-03
  Scenario: The next ID is the highest plus one
    Given a project on the story tree
    When the next ID of a shape is chosen
    Then it is the highest ID of that shape the tree names under the same parent (the flow for a US, the story for an AC or EX), `decisions.md` rows included, plus one
    And a gap is never filled and a retired ID is never reissued

  # AC-0001-0008-04
  Scenario: A contract numbers its own business rules
    Given a contract under a kind directory of `paths.contractsDir` on the story tree, declaring a contract ID `<KIND>-NNNN`
    When the business rules it declares are read, or its next rule ID is chosen
    Then a rule takes the ID `BR-<contract number>-NNNN`, and one whose first segment is not the number of the contract that declares it is an error
    And the next rule ID of that contract is the highest `BR-<contract number>-NNNN` the tree names, `decisions.md` rows included, plus one
```
