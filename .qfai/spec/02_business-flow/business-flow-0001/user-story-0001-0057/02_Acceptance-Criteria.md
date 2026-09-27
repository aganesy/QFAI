# Acceptance Criteria

## Criteria

```gherkin
Feature: Example, criterion, and rule links
  # AC-0001-0057-01
  Scenario: An example with a broken criterion reference is reported
    Given the story tree, and an EX row whose `AC-Ref` cell names no AC, several ACs, an AC the tree does not define, or an AC of another story
    When `qfai validate --profile sdd` runs
    Then an error names the EX ID and the `03_Example.md` that defines it

  # AC-0001-0057-02
  Scenario: A criterion no example names is reported
    Given the story tree, and an AC that no EX names in its `AC-Ref` cell
    When `qfai validate --profile sdd` runs
    Then an error names the AC ID and the `02_Acceptance-Criteria.md` that defines it

  # AC-0001-0057-03
  Scenario: Rules are read alike in every contract form
    Given the story tree, and business rules written in a YAML or JSON contract (`x-qfai-rules`), a SQL contract (`-- Rule` and `-- Examples:` lines) and a Markdown contract (a `## Rules` table)
    When `qfai validate --profile sdd` runs
    Then each rule is read with the same fields in every form — its ID, its statement and its examples — so a rule whose examples all exist raises no BR-to-EX error in any of the three
    And a file-level rule-refs list is read as references to rules, not as rules

  # AC-0001-0057-04
  Scenario: A rule without existing examples is reported
    Given the story tree, and a rule with no examples, or with an example naming an EX the tree does not define
    When `qfai validate --profile sdd` runs
    Then an error names the BR ID and the contract file
    And a SQL `-- Rule` line with no `-- Examples:` line after it is a rule with no examples

  # AC-0001-0057-05
  Scenario: An example no rule names is reported
    Given the story tree, and an EX that no rule names in its examples
    When `qfai validate --profile sdd` runs
    Then an error names the EX ID and the `03_Example.md` that defines it
    And a rule-refs entry naming a rule does not count as citing that rule's examples

  # AC-0001-0057-06
  Scenario: A reference to an undefined rule is reported
    Given the story tree, and a rule-refs entry naming a BR that no contract defines
    When `qfai validate --profile sdd` runs
    Then an error names the BR ID and the file that carries the reference

  # AC-0001-0057-07
  Scenario: A Business rules table is read as a Rules table
    Given the story tree, and a Markdown contract whose rules sit under `## Business rules`
    When `qfai validate --profile sdd` runs
    Then its table is read with the columns BR-ID, Statement and Examples, as a `## Rules` table is
    And a `Rule refs:` line in that section is an error naming the contract file
```
