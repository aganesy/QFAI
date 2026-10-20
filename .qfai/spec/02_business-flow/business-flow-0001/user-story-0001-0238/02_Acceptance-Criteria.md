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
    Given both sides changed the same sentence differently, or one side deleted the document
    When I run qfai sdd merge-docs
    Then that place stays between standard conflict markers or the document is left as it is, the rest is merged, and the command exits 1

  # AC-0001-0238-03
  Scenario: Check the merged documents
    Given a merged document that breaks its document schema
    When I run qfai sdd merge-docs
    Then each QFAI-DOCSCHEMA-001 finding in the merged documents is reported and the command exits 1
```
