# Acceptance Criteria

## Criteria

```gherkin
Feature: Shared assistant-path module
  # AC-0001-0036-01
  Scenario: Assistant-tree paths come from the shared module
    Given every assistant-tree path string the init path uses
    When the QFAI package source outside the migration code is searched with `grep -E '"\.qfai/assistant/(constitution|manifest|catalog|process)'`
    Then there are 0 matches, which guarantees structurally that paths are built only through the exports of the shared assistant-path module
    And the search excludes migration code, because it reads the retired layers on purpose
    And a search with the pattern `'"\.qfai/assistant/(rule|skill|agent|prompt)/'`, which names the tree's directories, has the same result
```
