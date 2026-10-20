# Acceptance Criteria

## Criteria

```gherkin
Feature: Merge conflicted story-tree documents by sentence

  # AC-0001-0238-01
  Scenario: Merge what both sides changed in different places
    Given a merge left story-tree documents unmerged in the index
    When I run qfai sdd merge-docs
    Then each document is merged three ways by table row and by sentence, written without conflict markers, and the command exits 0

  # AC-0001-0238-02
  Scenario: Leave what cannot be settled
    Given both sides changed the same sentence differently, one side deleted the document, or the working file is no longer Git's conflict output
    When I run qfai sdd merge-docs
    Then that place stays between standard conflict markers or the document is left as it is, the rest is merged, and the command exits 1

  # AC-0001-0238-03
  Scenario: Check the merged documents
    Given a merged document that breaks its document schema, or a schema check that cannot run
    When I run qfai sdd merge-docs
    Then each finding in the merged documents, or the check that did not run, is reported and the command exits 1

  # AC-0001-0238-04
  Scenario: Stop when the command cannot run
    Given no Git work tree, or a configuration with issues
    When I run qfai sdd merge-docs
    Then no file is written and the command exits 2
```
