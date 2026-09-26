# Acceptance Criteria

## Criteria

```gherkin
Feature: SKILL.md `## Default Autopilot Policy` section

# AC-0001-0175-01
# Parent: US-0001-0175
Scenario: SKILL.md `## Default Autopilot Policy` present with 3 named buckets
  Given a SKILL.md,
  When the Reviewer Gate checks it,
  Then a `## Default Autopilot Policy` section MUST be present listing three named buckets per DR-0269: (a) auto-decide (named defaults — output formatting, ID / sequence numbering, append-vs-create on subject overlap, equivalent-option pick), (b) ask-user (approval-required governance operations, destructive operations, version-pin changes, scope expansions — each with its prompt template; the first is a category each skill instantiates with the operations its own run cannot authorize for itself, per DR-0269 Amendment 2), (c) hard-required (brand intent, `primarySpecId` when absent). When the section is absent OR is present but missing one or more required buckets (heading-only / partial population — the "populated with three named buckets" requirement is not satisfied), the gate emits `R-AUTOPILOT-POLICY-MISSING` at severity error with a non-empty `justification:` naming the missing bucket(s). The three enumerations are the prototype: a SKILL.md MAY narrow any of the three buckets (drop an entry the skill cannot reach), and MAY instantiate a category entry with its own operations, but MUST NOT introduce an entry outside the prototype's categories. The ask-user categories are the four above plus, for a skill whose own operation is the interview, a decision a declared grilling session puts to the user.

# AC-0001-0175-02
# Parent: US-0001-0175
Scenario: Each Default Autopilot bucket under a workflow run
  Given a skill's Default Autopilot Policy and a workflow run
  When an item of each bucket comes up
  Then an `ask-user` item is satisfied only by a `human_decision` that answers it
  And a `hard-required` input is satisfied by `request_scope` or by the run's binding
  And an `auto-decide` item needs no authorization
  And `--auto` satisfies none of them

# AC-0001-0175-03
# Parent: US-0001-0175
Scenario: A run binding supplies the flow a stage works on
  Given a stage skill whose `hard-required` bucket holds the business flow it works on
  When it runs under a work order whose target binds one business flow
  Then the binding counts as the supplied flow, and nothing is asked
  And invoked by name with no flow it can resolve, it still stops at preflight for the flow
```
