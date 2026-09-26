# Acceptance Criteria

## Criteria

```gherkin
Feature: Research Skill Packaging

# AC-0001-0185-01
# Parent: US-0001-0185
Scenario: SKILL.md loading with progressive disclosure
  Given a valid SKILL.md with YAML frontmatter
  When the agent loads the skill
  Then only metadata (name, description, allowed-tools) is read initially
  And the full body is loaded only when the research task begins

# AC-0001-0185-02
# Parent: US-0001-0185
Scenario: SKILL.md with invalid frontmatter
  Given a SKILL.md with malformed YAML frontmatter
  When the agent attempts to load the skill
  Then the agent reports a parse error with details
  And the agent falls back to default research behavior
```
