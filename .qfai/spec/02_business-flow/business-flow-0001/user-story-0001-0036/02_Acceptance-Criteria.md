# Acceptance Criteria

## Criteria

```gherkin
Feature: assistantPaths.ts SSOT module
  # AC-0001-0036-01
  Scenario: Assistant-tree paths come only from assistantPaths.ts
    Given every assistant-tree path string the init path uses
    When `packages/qfai/src`, apart from `packages/qfai/src/migration`, is searched with `grep -E '"\.qfai/assistant/(constitution|manifest|catalog|process)'`
    Then there are 0 matches, which guarantees structurally that paths are built only through the exports of `assistantPaths.ts`
    And the migration code in `packages/qfai/src/migration` is left out of the search, because it reads the retired layers on purpose
    And with the `rule/ skill/ agent/ prompt/` assistant tree, the search pattern names that tree's directories, `'"\.qfai/assistant/(rule|skill|agent|prompt)/'`, and the result is the same
```
