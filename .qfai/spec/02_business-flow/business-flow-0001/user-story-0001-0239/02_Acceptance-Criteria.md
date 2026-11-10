# Acceptance Criteria

## Criteria

```gherkin
Feature: Answer agent output in the reply form that fits it
  # AC-0001-0239-01
  Scenario: The form follows from what is answered
    Given the agent follows `.agents/rules/reply-forms.md` at a point that already puts output to the user
    When the user is to answer one decision, a draft, a set of items or a question of taste
    Then the decision is put as a choice, the draft as a mark-up sheet, and the question of taste as a comparison of two or three variants
    And a set the structured question tool carries in one question stays one multi-select question, a set with more items than the tool's option limit or with more than two outcomes per item is one sort, and no set is split into one question per item

  # AC-0001-0239-02
  Scenario: The host's page publisher carries a sheet where it is private to the user
    Given a mark-up, sort or comparison sheet to put
    When the structured question tool cannot carry it
    Then it is published on the host's page publisher, such as an Artifact on Claude Code, where that publisher is callable and its page is private to the user by default
    And a page whose default audience is not known to be the user alone is used only under a standing instruction that covers publishing it, and otherwise the sheet is put as text in the chat with nothing asked
    And a set presented as one takes the one carrier that carries every member

  # AC-0001-0239-03
  Scenario: Every form comes back as text in its grammar
    Given a sheet put on any carrier
    When the user answers it
    Then the answer is text in that form's grammar, meaning the same from a page or from the chat
    And each mark-up note is applied to the passage it names and nothing else, and an item a sort reply neither places nor drops is put again, and after a reply that ends the asking only a decision some document requires the user to record is put again

  # AC-0001-0239-04
  Scenario: The forms reshape existing questions only
    Given the shipped rules that put output to the user
    When an agent reads `user-questions.md`, `grilling.md` and `session-feedback.md`
    Then each points to `.agents/rules/reply-forms.md` where its question takes another form, and the fallbacks of `user-questions.md` and `grilling.md` name the page carrier ahead of chat text
    And the rule adds no question, step or gate, and under a no-question mode nothing is published or asked

  # AC-0001-0239-05
  Scenario: The rule ships and the entry points cite it
    Given a project initialised by `qfai init`
    When an agent reads `AGENTS.md` or the Copilot instructions
    Then each cites `.agents/rules/reply-forms.md`
    And the rule master is under `.agents/rules/` with the text the package carries, in 500 lines or fewer
```
