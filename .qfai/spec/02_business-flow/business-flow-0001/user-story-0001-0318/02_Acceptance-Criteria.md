# Acceptance Criteria

## Criteria

```gherkin
Feature: Settle the domain terms before the interview and the specification
  # AC-0001-0318-01
  Scenario: The step runs between research and interview, and first in every specification stage
    Given the shipped route plans
    When `npx qfai workflow plan` returns a plan with a discussion stage or an `sdd` stage
    Then the discussion stage runs `common-domain-language` after `discussion-research` and before `discussion-interview`
    And every `sdd` stage runs `common-domain-language` before `sdd-triage`
    And the step is marked pass-through in every plan

  # AC-0001-0318-02
  Scenario: The step file says what it reads, writes and checks
    Given a project initialised by `qfai init`
    When an agent reads `.qfai/assistant/step/common-domain-language/STEP.md`
    Then it reads the glossary with its Avoid and Context columns, the request and the research or the record
    And in the discussion stage it writes only Interview rows and one `open-questions.md` row per settled term, and in the specification stage it writes the glossary rows
    And the specification stage runs the `sdd-triage` preflight before its first write and writes nothing when it stops
    And it writes into the glossary each settled-term row whose term the consumed record settled, deletes that row and keeps a row another discussion left, and passes through only when, in that stage, no such row waits and, in either stage, no term is new, a synonym or read two ways
    And it drafts a definition only from a use it cites, and asks for a new business term's definition with no recommended answer
    And it tries each definition on an edge case, and puts a change to an existing definition to the user
    And its Passes when section names what it reads first and when it passes

  # AC-0001-0318-03
  Scenario: The two skills list the step
    Given a project initialised by `qfai init`
    When an agent reads the `qfai-discussion` and `qfai-sdd` skills
    Then `qfai-discussion` lists `discussion-research`, `common-domain-language` and `discussion-interview` in that order
    And `qfai-sdd` lists `common-domain-language` first
```
