# Acceptance Criteria

## Criteria

```gherkin
Feature: Hold the story tree and test titles to the glossary's terms
  # AC-0001-0317-01
  Scenario: The glossary table holds Term, Definition, Avoid and Context
    Given a story-tree project
    When `qfai validate --profile sdd` reads `01_policy/glossary.md`
    Then a `## Terms` table without exactly the columns Term, Definition, Avoid and Context raises `QFAI-DOCSCHEMA-001` at error
    And an optional `## Contexts` section holding one table of the columns Name and Purpose raises none
    And the glossary `qfai init` writes and the one the 1.x migration writes hold the four columns

  # AC-0001-0317-02
  Scenario: A rejected synonym in a story-tree document is an error
    Given a glossary row whose Avoid cell lists comma-separated words
    When `qfai validate` runs in the `sdd`, `verify` or `full` profile
    Then prose of a document under `paths.specsDir` or `paths.contractsDir` that holds one of those words as a whole word, in any case, raises `QFAI-STORY-022` at error naming the file, the line, the word and the row's term
    And the glossary itself, `decisions.md`, every decision page, `open-questions.md`, the deliberation records, code blocks and code spans raise none
    And a word inside an occurrence of a glossary term raises none, while a rejected word that holds a term is still reported
    And the other six profiles raise none
    And a phrase wrapped across a line break is reported at its first line
    And an empty Avoid cell raises none, and `validation.staleTerms` keeps its own warning, so a word in both lists raises both findings
    And under `--flow` only the documents the scope holds raise it

  # AC-0001-0317-03
  Scenario: A rejected synonym in a test title is an error
    Given a glossary row whose Avoid cell lists a word, and a JavaScript or TypeScript test file the story-test scan selects through `validation.traceability.testFileGlobs` or the acceptance layers under `paths.testsDir`
    When `qfai validate` runs in the `verify` or `full` profile
    Then a `describe`, `it`, `test` or `suite` call whose first argument is one string literal, comments aside and escapes decoded, holding that word raises `QFAI-STORY-022` at error at the call's line, naming the file, the word and the row's term
    And the same word in a comment, in the test body, in an `each` table or in a test file of another language raises none
    And under `--flow` a test file raises none

  # AC-0001-0317-04
  Scenario: A context the glossary does not declare is an error
    Given a glossary row whose Context cell is not empty
    When `qfai validate` runs in the `sdd`, `verify` or `full` profile
    Then a Context that no Name of the `## Contexts` table declares raises `QFAI-STORY-023` at error naming the term and the context
    And an empty Context cell and a declared context raise none
    And the other six profiles, and any run under `--flow`, raise none
```
