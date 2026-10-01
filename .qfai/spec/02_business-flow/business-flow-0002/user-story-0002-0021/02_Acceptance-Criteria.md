# Acceptance Criteria

## Criteria

```gherkin
Feature: Layer-to-CI-lane mapping in the layer rule
  # AC-0002-0021-01
  Scenario: The mapping lives beside the taxonomy without adding vocabulary
    Given the shipped rule/test-layers.md
    When the CI lane mapping section is read from that rule
    Then the section names no layer token or layer heading
    And it states that it adds no layer token and does not activate per-level routing
    And it does not direct annotations outside the validator's test scan
    And no sibling mapping file exists in the asset tree or repository-root tree

  # AC-0002-0021-02
  Scenario: CI guidance must not become layer vocabulary
    Given the layer taxonomy in the shipped rule/test-layers.md
    When the mapping section has landed
    Then every layer code the mapping section names also appears in the taxonomy

  # AC-0002-0021-03
  Scenario: The repository-root rule resolves to the packaged asset
    Given the repository-root assistant rule entry is a symbolic link to the packaged asset rule
    When the mapping section is authored under the packaged asset rule/test-layers.md
    Then reading the repository-root path returns the same bytes, with no synchronization step
    And the link check reports no drift
    And a repository-root path that is a regular file where the link check expects a link fails that check
```
