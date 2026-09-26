# Acceptance Criteria

## Criteria

```gherkin
Feature: Migration skill shipped and linked

# AC-0004-0001-01
# Parent: US-0004-0001
Scenario: Migration skill installed and linked
  Given an empty project directory, and separately a project still on the spec-pack layout
  When `qfai init` runs on each
  Then `qfai-migration-v1-to-v2/` with its `SKILL.md` and `scripts/` is installed under `.qfai/assistant/skills/` (`.qfai/assistant/skill/` with the `rule/ skill/ agent/ prompt/` assistant tree), and its link in each of `.claude/skills/`, `.agents/skills/`, `.codex/skills/` and `.github/skills/` resolves to it

# AC-0004-0001-02
# Parent: US-0004-0001
Scenario: Migration reuses init's writers
  Given the package implementation of the migration steps that repoint the host integration links and update the managed `.gitignore` block
  When that implementation is inspected
  Then the link step calls init's integration-directory writer and the `.gitignore` step calls init's managed-block writer, and neither step has a link-creation, link-removal or `.gitignore` write call of its own
```
