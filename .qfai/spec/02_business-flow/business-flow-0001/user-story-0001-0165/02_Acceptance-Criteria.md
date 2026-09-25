# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0165-01
# Parent: US-0001-0165
Scenario: Full-Harness Block Drop on Cycle 0
  Given a `prototyping.json` that carries a legacy `fullHarness` block from a prior pre-1.8.9 run,
  When `prototyping iterate` runs cycle 0,
  Then the cycle-0 hard reset removes the `fullHarness` block from the live `prototyping.json` so the post-1.8.9 evolution loop never re-reads stale `full-harness` / `perfect-100` / `weighted-total` runtime state.

# AC-0001-0165-02
# Parent: US-0001-0165
Scenario: Verify Articles Restate Article V Without TC
  Given a project on the story tree,
  When `/qfai-verify` reads `references/articles.md`,
  Then the file restates the constitution's Article V chain with no TC hop and no `tdd/test-list.md`, and its Tests hop answers a BF from E2E tests, an AC from integration or API tests, and an EX from any test.

# AC-0001-0165-03
# Parent: US-0001-0165
Scenario: Verify Loads Constitution and Settings From the Recut Assistant Tree
  Given a project with the `rule/ skill/ agent/ prompt/` assistant tree,
  When `/qfai-verify` loads its constitution, routing and review profiles,
  Then it reads the constitution from `.qfai/assistant/rule/`, takes routing and review profiles from the built-in defaults with the `qfai.config.yaml` overrides applied, and reads an agent's entry from its card frontmatter.
```
