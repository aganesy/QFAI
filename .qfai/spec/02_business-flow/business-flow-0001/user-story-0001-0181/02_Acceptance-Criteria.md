# Acceptance Criteria

## Criteria

```gherkin
Feature: Cross-skill documentation realignment to implementation

# AC-0001-0181-01
# Parent: US-0001-0181
Scenario: Cross-skill docs realigned to implementation with zero stale references
  Given the OQ-0152..0157 outcomes are implemented,
  When the implementing PR lands,
  Then `references/iteration-loop.md`, `references/generator-prompt.md`, `references/handoff.md`, `references/evidence-requirements.md`, and each affected SKILL.md MUST be rewritten in the same atomic PR to match the chosen implementations, and `qfai validate --report` MUST report every stale reference remaining at HEAD, at severity warning. spec-0015 owns this cross-skill documentation-governance obligation.
```
