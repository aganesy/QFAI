# Acceptance Criteria

## Criteria

```gherkin
Feature: Example, criterion, and rule links
  # AC-0001-0055-01
  Scenario: An example with a broken criterion reference is reported
    Given the story tree, and an EX row whose `AC-Ref` cell names no AC, several ACs, an AC the tree does not define, or an AC of another story
    When `qfai validate --profile sdd` runs
    Then an error names the EX ID and the `03_Example.md` that defines it

  # AC-0001-0055-02
  Scenario: A criterion no example names is reported
    Given the story tree, and an AC that no EX names in its `AC-Ref` cell
    When `qfai validate --profile sdd` runs
    Then an error names the AC ID and the `02_Acceptance-Criteria.md` that defines it

  # AC-0001-0055-03
  Scenario: Rules are read alike in every contract form
    Given the story tree, and business rules written in a YAML or JSON contract (`x-qfai-rules`), a SQL contract (`-- Rule` and `-- Examples:` lines) and a Markdown contract (a `## Business rules` table)
    When `qfai validate --profile sdd` runs
    Then each rule is read with the same fields in every form — its ID, its statement and its examples — so a rule whose examples all exist raises no BR-to-EX error in any of the three

  # AC-0001-0055-04
  Scenario: A rule without existing examples is reported
    Given the story tree, and a rule with no examples, or with an example naming an EX the tree does not define
    When `qfai validate --profile sdd` runs
    Then an error names the BR ID and the contract file
    And a SQL `-- Rule` line with no `-- Examples:` line after it is a rule with no examples

  # AC-0001-0055-05
  Scenario: An example no rule names is reported
    Given the story tree, and an EX that no rule names in its examples
    When `qfai validate --profile sdd` runs
    Then an error names the EX ID and the `03_Example.md` that defines it

  # AC-0001-0055-06
  Scenario: A Business rules table is read with three columns
    Given the story tree, and a Markdown contract whose rules sit under `## Business rules`
    When `qfai validate --profile sdd` runs
    Then its table is read with the columns BR-ID, Statement and Examples
    And a table with other columns is an error naming the contract file
```
