# Acceptance Criteria

## Criteria

```gherkin
Feature: Removed compatibility namespaces
  # AC-0001-0159-02
  Scenario: Verify Articles Restate Article V Without TC
    Given a project on the story tree,
    When `/qfai-verify` reads `references/articles.md`,
    Then the file restates the constitution's Article V chain with no TC hop and no `tdd/test-list.md`, and its Tests hop answers a BF from E2E tests, an AC from integration or API tests, and an EX from any test.

  # AC-0001-0159-03
  Scenario: Verify Loads Constitution and Settings From the Recut Assistant Tree
    Given a project with the `rule/ skill/ agent/ prompt/` assistant tree,
    When `/qfai-verify` loads its constitution, routing and review profiles,
    Then it reads the constitution from `.qfai/assistant/rule/`, takes routing and review profiles from the built-in defaults with the `qfai.config.yaml` overrides applied, and reads an agent's entry from its card frontmatter.
```
