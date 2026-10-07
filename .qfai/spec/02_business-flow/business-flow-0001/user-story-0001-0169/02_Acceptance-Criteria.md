# Acceptance Criteria

## Criteria

```gherkin
Feature: SKILL.md `## Default Autopilot Policy` section
  # AC-0001-0169-01
  Scenario: The shared baseline states the 3 named buckets and a skill lists only what it adds
    Given the shared operating baseline and a `qfai-*` SKILL.md,
    When the Reviewer Gate checks them,
    Then the baseline's `## Default Autopilot Policy (Shared)` section MUST state three named buckets per DR-0269: (a) auto-decide (named defaults — output formatting, ID / sequence numbering, append-vs-create on subject overlap, equivalent-option pick), (b) ask-user (approval-required governance operations, destructive operations, version-pin changes, scope expansions — each with its prompt template; the first is a category each skill instantiates with the operations its own run cannot authorize for itself, per DR-0269 Amendment 2), (c) hard-required (brand intent, and the inputs declared for the skill). When that section is absent or is missing one or more of the buckets, the gate emits `QFAI-POLICY-001` at severity error against the baseline, with a non-empty `justification:` naming the missing bucket(s). The three enumerations are the prototype every skill works under: a SKILL.md's own `## Default Autopilot Policy` section lists only what the skill adds, MAY instantiate a category entry with its own operations, and MUST NOT introduce an entry outside the prototype's categories. When a skill's section does not name a hard-required input declared for that skill, the gate emits `QFAI-POLICY-001` against the SKILL.md, naming the input. A hard-required entry outside them raises `QFAI-AUTOPILOT-001` at severity error. The ask-user categories are the four above plus, for a skill whose own operation is the interview, a decision a declared grilling session puts to the user.
```
