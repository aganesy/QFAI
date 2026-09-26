# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0123-01
# Parent: US-0001-0123
Scenario: Per-spec iter-dir namespacing — review.json only
  Given `.qfai/evidence/prototyping/iter-NN/spec-NNNN/`,
  When listed,
  Then it contains exactly files matching `<screen>.review.json` (one per declared screen). No `.png`, no `.html`, no `.interaction.json`, no other sidecar.
  And path helpers (`iterationDirPerSpec`, `iterationReviewPathPerSpec`, `findIterationReviewFiles`, `findStaleIterDirs`, `deleteStaleIterDirs`) descend into `spec-NNNN` while preserving `/^iter-\d{2,}$/` cleanup semantics.
  And On the story tree the directory is `iter-NN/CON-UI-NNNN/` with the same contents, and the path helpers descend into `CON-UI-NNNN` with the same cleanup semantics.
```
