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

  # AC-0001-0011-04
  Scenario: A table-only section holds its template's table and nothing else
    Given a story-tree document whose section holds only a table
    When the document is checked against its schema
    Then a column the template's table does not have is a violation
    And a pipe line directly above the table's header row is a violation

  # AC-0001-0011-05
  Scenario: A story-tree Markdown file without exactly one schema entry fails
    Given a Markdown file under `paths.specsDir` or `paths.contractsDir` that no mdschema manifest entry names, or that two entries name
    When the document lane or `qfai validate --profile sdd` runs over it
    Then the lane exits 1 naming the file, under every scope that includes it
    And `qfai validate` reports it as one `QFAI-DOCSCHEMA-001` error naming the file
    And a spelling of `paths.specsDir` or `paths.contractsDir` that `qfai validate` resolves to the same directory covers the same files
    And the lane and `qfai validate` read a `\` in either key as `/` on every platform, so one value names one directory for both
```
