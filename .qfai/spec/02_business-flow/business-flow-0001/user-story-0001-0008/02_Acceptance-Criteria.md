# Acceptance Criteria

## Criteria

```gherkin
Feature: ID grammar
  # AC-0001-0008-01
  Scenario: Each ID has the shape of its kind and is declared once
    Given a project on the story tree
    When every declared ID is collected
    Then each has one of the shapes `BF-NNNN`, `US-NNNN-NNNN`, `AC-NNNN-NNNN-NN`, `EX-NNNN-NNNN-NN`, `BR-<contract number>-NNNN`, `DEC-yyyymmddhhMMss` or `DEC-NNNN`, and `OQ-yyyymmddhhMMss` or `OQ-NNNN`
    And no ID is declared twice in the tree

  # AC-0001-0008-02
  Scenario: An ID carries the number of the directory it sits in
    Given a story directory inside a flow directory on the story tree
    When the IDs it declares are read
    Then the story ID starts with the flow's number
    And every AC and EX ID starts with the story ID
    And each directory name matches the ID it holds

  # AC-0001-0008-03
  Scenario: The next ID is the highest plus one, and a record takes its time as its ID
    Given a project on the story tree
    When the next ID of a BF, US, AC, EX or BR is chosen
    Then it is the highest ID of that shape the tree names under the same parent (the flow for a US, the story for an AC or EX), every row of the decision register included, plus one
    And a gap is never filled and a retired ID is never reissued
    And `qfai sdd next-id <kind> [<parent-ID>] --base <local-ref>` prints that ID for BF, US, AC, EX or BR, reading both the working tree and the story tree of the base ref's commit, takes the higher of the two, and writes nothing
    And a `decisions.md` or `open-questions.md` row takes as its ID the UTC time it is written, which no count decides

  # AC-0001-0008-04
  Scenario: A contract numbers its own business rules
    Given a contract under a kind directory of `paths.contractsDir` on the story tree, declaring a contract ID `<KIND>-NNNN`
    When the business rules it declares are read, or its next rule ID is chosen
    Then a rule takes the ID `BR-<contract number>-NNNN`, and one whose first segment is not the number of the contract that declares it is an error
    And the next rule ID of that contract is the highest `BR-<contract number>-NNNN` the tree names, every row of the decision register included, plus one

  # AC-0001-0008-09
  Scenario: Planned AC and EX additions fit the retired-inclusive capacity
    Given planned additions to a story's AC or EX scope under the unchanged two-digit grammar
    When the owner checks capacity before writing
    Then it reports the kind and story, retired-inclusive high-water number H or 0 for an empty scope, remaining capacity 99-H and requested additions
    And it includes valid IDs in the tree and decisions and observed published parallel heads and known reservations available through the project's existing method, with a fixed observation and its coverage limits
    And unobserved concurrency stays disclosed and the calculation reserves no ID
    And a batch larger than the remainder stops before invalid declarations or partial allocation, without filling gaps, reusing retired IDs or emitting 100
    And newly published claims or collisions require another owner check before publication
    And an existing exhausted AC or EX allocation diagnostic names the kind, parent, upper bound 99, remaining 0 and the owning partition guidance without producing a candidate or new command
```
