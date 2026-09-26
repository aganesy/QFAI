# Acceptance Criteria

## Criteria

```gherkin
Feature: Agent Cards

# AC-0001-0167-01
# Parent: US-0001-0167
Scenario: Agent Card Completeness
  Given the 19 cards under `.qfai/assistant/agent/`
  When checked
  Then each card's frontmatter carries `name` (the agent ID), `kind`, `domain`, `mission`, `replaces`, `owned_artifacts`, `tool_profile`, `permission_profile` and `specialization_tags`. No `agent-catalog.yml` or `developer_instructions` copy of a card body exists.

# AC-0001-0167-02
# Parent: US-0001-0167
Scenario: Specialist Responsibilities Preserved
  Given consolidated agents
  When checked
  Then prior specialist responsibilities remain represented in the merged agent definitions.

# AC-0001-0167-03
# Parent: US-0001-0167
Scenario: Built-in Routing Defaults and Project Overrides
  Given a project with an installed QFAI package,
  When a skill resolves its routing and its review profile,
  Then , with no override in `qfai.config.yaml`, it uses the defaults built into the package. An override under `routing:` replaces the whole default entry for the same skill, and an override under `reviewProfiles:` replaces the whole default profile of the same name. An override that matches no default is added. The project holds no routing file and no review-profile file.
  And an override that names an agent with no card fails `qfai validate` with `QFAI-AGENT-008`, and `qfai.config.yaml` has no key that overrides an optional review mode.

# AC-0001-0167-04
# Parent: US-0001-0167
Scenario: Migration Skill Routing
  Given the routing defaults QFAI ships and the shipped `/qfai-migration-v1-to-v2` skill,
  When the routing for that skill is read,
  Then it has three phases in order: `plan`, with `requirements-analyst` and `solution-architect` mandatory and `solution-architect` blocking; `execution`, with `devops-ci-engineer` mandatory; and `review`, with `completion-reviewer` and `architecture-reviewer` mandatory and both blocking. Its review profile is `architecture-heavy`.
  And the skill's `roles:` names every agent the entry binds and every reviewer `architecture-heavy` selects, and its `routing-profile:` is `architecture-heavy`, so `qfai validate` reports no `QFAI-AGENT-015` to `QFAI-AGENT-019` finding for it.

# AC-0001-0167-05
# Parent: US-0001-0167
Scenario: The routing defaults route the two entry skills
  Given the routing and review-profile defaults built into the package
  When the entries for `qfai-run` and `qfai-maintain` are read
  Then `qfai-run` has the orchestrator role and no authoring or reviewing phase
  And `qfai-maintain` has an authoring phase and an independent reviewer, on the `default` review profile
  And the review-profile defaults gain no profile
```
