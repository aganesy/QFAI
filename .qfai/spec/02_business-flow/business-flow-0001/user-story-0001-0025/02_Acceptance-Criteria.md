# Acceptance Criteria

## Criteria

```gherkin
Feature: Agent symlink 統合

# AC-0001-0025-01
# Parent: US-0001-0025
Scenario: Agent file symlinks
  Given a canonical agent card exists at `.qfai/assistant/agents/<name>.md` (`.qfai/assistant/agent/<name>.md` with the `rule/ skill/ agent/ prompt/` assistant tree)
  When `qfai init` runs
  Then `.claude/agents/<name>.md` and `.github/agents/<name>.agent.md` are created as file symlinks to that card

# AC-0001-0025-02
# Parent: US-0001-0025
Scenario: Codex agent profile の init 生成
  Given `.qfai/assistant/agents/<name>.md` and `assistant/manifest/agent-catalog.yml#agents[].kind` exist, or, with the `rule/ skill/ agent/ prompt/` assistant tree, `.qfai/assistant/agent/<name>.md` whose frontmatter carries `kind`
  When `qfai init` runs
  Then `.codex/agents/<name>.toml` is generated from the canonical frontmatter (`name` / `description`) and the canonical body, and an agent of `kind: reviewer` gets `sandbox_mode = "read-only"`
  And an existing profile is kept on a plain run and regenerated under `--force`. An agent whose `kind` cannot be determined gets no profile, and the run says so
```
