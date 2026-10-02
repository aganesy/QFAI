# Acceptance Criteria

## Criteria

```gherkin
Feature: Per-cycle UI-contract review evidence
  # AC-0001-0119-01
  Scenario: Per-spec iter-dir namespacing — review.json only
    Given `.qfai/evidence/prototyping/iter-NN/spec-NNNN/`,
    When listed,
    Then it contains exactly files matching `<screen>.review.json` (one per declared screen). No `.png`, no `.html`, no `.interaction.json`, no other sidecar.
    And path helpers (`iterationDirPerSpec`, `iterationReviewPathPerSpec`, `findIterationReviewFiles`, `findStaleIterDirs`, `deleteStaleIterDirs`) descend into `spec-NNNN` while preserving `/^iter-\d{2,}$/` cleanup semantics.
    And on the story tree the directory is `iter-NN/UI-NNNN/` with the same contents, and the path helpers descend into `UI-NNNN` with the same cleanup semantics.
```
