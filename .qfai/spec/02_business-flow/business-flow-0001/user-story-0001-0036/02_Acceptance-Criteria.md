# Acceptance Criteria

## Criteria

```gherkin
Feature: assistantPaths.ts SSOT module

# AC-0001-0036-01
# Parent: US-0001-0036
Scenario: assistantPaths.ts SSOT 経由
  Given every assistant-tree path string the init path uses
  When `packages/qfai/src` is searched with `grep -E '"\.qfai/assistant/(constitution|manifest|catalog|process|steering)'`
  Then there are 0 matches, which guarantees structurally that paths are built only through the exports of `assistantPaths.ts`
  And with the `rule/ skill/ agent/ prompt/` assistant tree, the search pattern names that tree's directories, `'"\.qfai/assistant/(rule|skill|agent|prompt)/'`, and the result is the same
```
