# Acceptance Criteria

## Criteria

```gherkin
Feature: Check each term against the glossary while grilling
  # AC-0001-0245-01
  Scenario: A term that clashes with the glossary is raised when it appears
    Given a grilling session, user or delegated, at any stage
    When the user or an author uses a term that conflicts with, or is a synonym of, a term the project glossary defines
    Then the griller raises it ahead of the round's other questions, in the round it appears in or the next one when it appears in an answer, and proposes the glossary's term
    And questions whose answer turns on the term's meaning wait for the next round
    And a plain synonym is corrected and noted without a question, while a term with two plausible meanings is a decision
    And a term that matches the glossary raises nothing, and a term the glossary does not hold is asked about only when a decision turns on its meaning

  # AC-0001-0245-02
  Scenario: A settled term is written at once where the stage writes
    Given a term the session settles
    When the round that settled it ends
    Then the term is written right away, not at the end of the session: to the project glossary where the stage writes the policy layer, and otherwise as an `open-questions.md` row naming the term and its definition
    And its definition says what the term is, never a rule, a value set or a procedure
    And a change to what the project glossary already defines is a critical decision, and its row is rewritten only after the user approves it

  # AC-0001-0245-03
  Scenario: The grilling skill carries the check
    Given the shipped `qfai-grilling` skill
    When a stage invokes it
    Then it points to the glossary check in `.agents/rules/grilling.md`
```
