# Acceptance Criteria

## Criteria

```gherkin
Feature: Story-tree layout described by mdschema
  # AC-0001-0011-01
  Scenario: Every story-tree Markdown file has one schema entry and one template
    Given the mdschema manifest and the `qfai-sdd` templates
    When each Markdown file of the story tree is matched against them
    Then each of the sixteen fixed files and the Markdown CLI contract matches exactly one manifest entry, paired with one template
    And `documentsWithoutOneEntry` in `check-mdschema.mjs` reports no file

  # AC-0001-0011-02
  Scenario: The sample story tree passes both document lints
    Given the sample story tree built from the `qfai-sdd` templates
    When `pnpm lint:mdschema` and `pnpm lint:mermaid` run on it
    Then both report no failure

  # AC-0001-0011-03
  Scenario: Validation reports each document that breaks its schema
    Given a story tree whose documents the mdschema manifest routes to a schema
    When `qfai validate --profile sdd` runs on it
    Then each violation of a document's schema is one `QFAI-DOCSCHEMA-001` error naming the document, the line and the column
    And a document carrying the opt-out marker is reported rather than skipped, by `qfai validate` and by the document lane alike
    And a check that could not run is one `QFAI-DOCSCHEMA-002` error rather than a pass
```
