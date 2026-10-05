# Acceptance Criteria

## Criteria

```gherkin
Feature: Cross-skill documentation realignment to implementation
  # AC-0001-0174-01
  Scenario: Cross-skill docs realigned to implementation with zero stale references
    Given a change to cross-skill behaviour is implemented,
    When the implementing PR lands,
    Then `references/iteration-loop.md`, `references/generator-prompt.md`, `references/handoff.md` and each affected SKILL.md MUST be rewritten in the same atomic PR to match the chosen implementations, and `qfai validate --report` MUST report every stale reference remaining at HEAD, at severity warning.
```
