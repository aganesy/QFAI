# Acceptance Criteria

## Criteria

```gherkin
Feature: Story-tree layout described by mdschema
  # AC-0001-0011-01
  Scenario: Every story-tree Markdown file has one schema entry and one template
    Given the mdschema manifest and the `qfai-sdd` templates
    When each Markdown file of the story tree is matched against them
    Then each of the fifteen fixed files, every optional decision page and the Markdown CLI contract matches exactly one manifest entry, paired with one template
    And the manifest coverage check reports no file with missing or multiple entries

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
    And the document-schema checker run from the command line exits 2 for an mdschema run it stopped at its time limit, rather than passing or failing the document

  # AC-0001-0011-04
  Scenario: A table-only section holds its template's table and nothing else
    Given a story-tree document whose section holds only a table, including a decision page
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
    And the lane parses `qfai.config.yaml` with the YAML parser `qfai validate` uses, and exits 2 naming the problem where `qfai validate` reports the file as unreadable or either key as invalid
  # AC-0001-0011-06
  Scenario: The tech.md template and its schema's findings show the line to write
    Given the `tech.md` template, which writes every value as an example to replace, `<example: value>`, in the shape its schema accepts
    When each example is replaced by its value, or a line a required-text rule asks for is left out
    Then the document raises no `QFAI-DOCSCHEMA-001`, no `QFAI-ASSETS-003` and no `QFAI-STORY-013`
    And a missing line is reported with the example line the rule gives in place of its pattern, and a rule that gives none keeps its pattern
  # AC-0001-0011-07
  Scenario: Every schema's findings name the line or heading to write
    Given a story-tree document checked against its shipped schema
    When it leaves out a line a required-text rule asks for, or a heading the schema requires
    Then the finding shows the rule's example line, which passes the schema in the rule's template, in place of the pattern
    And a missing heading whose pattern accepts one fixed line is named by that line, and any other heading keeps its pattern
    And every section of a shipped schema gives a description, which a forbidden-text finding states in place of its pattern

  # AC-0001-0011-08
  Scenario: The changed scope holds a branch to what it changed, measured at the merge base
    Given a project tree with story-tree documents and a base ref to compare against
    When the document lane runs under `--scope changed`
    Then a tracked document the branch added or whose text it changed is checked, a change of indentation included, and a document whose only change is its line endings is not
    And a checked document that fails is the branch's failure when it was absent or conformed at the merge base, when its root heading matched there and no longer does, or when it carries the opt-out marker, and is otherwise reported as pre-existing without failing the run
    And a document whose path holds a character outside ASCII is in the scope like any other
    And an untracked story-tree document is checked before staging if Git does not ignore it
    And a branch diff, worktree diff, or untracked-file listing that fails widens the run to every document with a warning naming the failed Git operation

  # AC-0001-0011-09
  Scenario: The Markdown schema checker explains invalid command arguments
    Given the shipped Markdown schema checker
    When it receives an unknown flag, an unsupported `--scope` value, a `--root` path that does not name a directory, `--scope files` without a path, or `--base` with no value
    Then it exits 2 and writes the corresponding usage error to stderr
```
