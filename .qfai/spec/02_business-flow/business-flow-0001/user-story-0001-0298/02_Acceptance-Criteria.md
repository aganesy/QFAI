# Acceptance Criteria

## Criteria

```gherkin
Feature: Each run keeps one deliberation record
  # AC-0001-0298-01
  Scenario: A run that asks or decides writes one record
    Given a run, which is one `qfai-run` plan or one stage skill invoked by name
    When the run puts a question to the user or takes a decision that no specification, contract, rule or convention settles
    Then it writes one record directly under `paths.deliberationDir`, by default `.qfai/deliberation/`, named `<YYYYMMDDhhmmss>-<slug>.md` with the time in UTC
    And every stage of the run writes under its own subheading in that file
    And a run that does neither writes no record

  # AC-0001-0298-02
  Scenario: A record has three headings and six-column tables
    Given a deliberation record
    When it is read
    Then it holds the headings Subject, Interview and Agent decisions
    And each table has exactly the columns Background, Option 1, Option 2, Option 3, Option 4 (other) and Chosen option number

  # AC-0001-0298-03
  Scenario: Each question to the user is one Interview row
    Given a question the run put to the user
    When the record is written
    Then the question is one row of the Interview table
    And a free answer is quoted word for word in Option 4
    And a question with no candidate values leaves Options 1 to 3 empty, holds the answer in Option 4 and chooses 4
    And a source the options rest on is a URL in the Background cell

  # AC-0001-0298-04
  Scenario: Each choice the agent made is one Agent decisions row
    Given a choice that no specification, contract, rule or convention settles and whose answer changes an artifact's meaning, behaviour, structure or policy, or a decision of a session between agents
    When the agent takes it
    Then it considers at least three options and records the choice as one row of the Agent decisions table
    And a choice a convention settles, a formatting choice, or a choice with one possible answer is no row

  # AC-0001-0298-05
  Scenario: A record is a memo nothing links to
    Given a deliberation record
    When the story tree, the decision register and the contracts are read
    Then no row, story, contract or business rule cites the record, and the record cites no ID
    And once the run commits it, the record is edited only to repair its table layout, never its content, and a correction is a new record
    And a later row that overturns an earlier row of the same record says so in its Background

  # AC-0001-0298-06
  Scenario: A record is written in the project's language
    Given a run that writes a record
    When the project states the language it keeps its documents in
    Then the record is written in that language
    And where the project states none, it is written in the language the user works in
```
