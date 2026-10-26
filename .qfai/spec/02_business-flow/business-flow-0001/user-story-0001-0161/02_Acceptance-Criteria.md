# Acceptance Criteria

## Criteria

```gherkin
Feature: Agent Cards
  # AC-0001-0161-01
  Scenario: Agent Card Completeness
    Given the five cards under `.qfai/assistant/agent/`
    When checked
    Then they are `fullstack-engineer`, of `kind: worker`, and `requirements-reviewer`, `architecture-reviewer`, `implementation-reviewer` and `product-surface-reviewer`, of `kind: reviewer`
    And each card's frontmatter carries `name` (the agent ID), `kind`, `domain`, `mission`, `replaces`, `owned_artifacts`, `tool_profile`, `permission_profile` and `specialization_tags`. No `agent-catalog.yml` or `developer_instructions` copy of a card body exists.

  # AC-0001-0161-07
  Scenario: The shipped catalogue holds one worker and every agent the package names
    Given the package's shipped catalogue and its shipped skills, steps, rules and cards
    When the package's asset checks read them
    Then the catalogue holds exactly one card of `kind: worker`, and every agent the shipped files name is a card of the catalogue
    And `qfai validate` counts no card of a kind, so a card a project kept from an earlier release raises no finding
```
