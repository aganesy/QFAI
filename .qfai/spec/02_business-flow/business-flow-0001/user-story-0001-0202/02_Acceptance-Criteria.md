# Acceptance Criteria

## Criteria

```gherkin
Feature: A stage skill picked up by free text hands over

# AC-0001-0202-01
# Parent: US-0001-0202
Scenario: A stage skill the host picked for free text edits nothing
  Given workflow mode `active`
  And a stage skill that was neither invoked by name nor handed a work order
  When the skill starts
  Then it edits nothing and passes the request to `qfai-run` in the same turn
  And the operator sees at most one line before `qfai-run` takes the request
  And under mode `off` or `shadow` no entry check runs, and the skill behaves as when invoked by name

# AC-0001-0202-02
# Parent: US-0001-0202
Scenario: A worker does only the work order it was handed
  Given workflow mode `active`
  And a stage skill handed a work order
  When the skill starts
  Then it checks the work order's run, stage and work-order IDs against the ones the run issued
  And when they match, it does only that work order and says nothing to the operator
  And when they match no issued work order, it edits nothing and returns the refusal to the harness

# AC-0001-0202-03
# Parent: US-0001-0202
Scenario: A stage invoked by name runs on its own
  Given a stage skill invoked by name
  When it runs
  Then it runs standalone and ends at that stage, starting no other stage
  And a request to take the work to the end becomes a whole run

# AC-0001-0202-04
# Parent: US-0001-0202
Scenario: Each stage-skill description opens with its trigger condition
  Given the `description:` of every skill a built-in plan names
  When it is read
  Then it opens with when to use the skill: invoked by name, or handed a QFAI work order
  And it does not walk through the skill's phases
  And it stays within 1024 characters and holds no `<` or `>`

# AC-0001-0202-05
# Parent: US-0001-0202
Scenario: A skill's orchestrated-mode rules live in one reference
  Given every skill a built-in plan names
  When its files are read
  Then its orchestrated-mode rules are in one `references/orchestrated-mode.md`
  And its `SKILL.md` cites that file with exactly one line
  And its `SKILL.md` body holds no other orchestrated-mode text

# AC-0001-0202-06
# Parent: US-0001-0202
Scenario: No stage skill blocks model invocation
  Given every skill a built-in plan names
  When its `SKILL.md` frontmatter is read
  Then it carries no `disable-model-invocation` key
  And a skill no built-in plan names is outside this criterion
```
