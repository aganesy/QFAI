# Acceptance Criteria

## Criteria

```gherkin
Feature: Shipped change detection and a green-on-skip verdict
  # AC-0002-0004-01
  Scenario: Shipped detection fails open and the verdict goes green on skip
    Given the detection job and the verdict job of the shipped orchestrator
    When detection runs on four inputs, a Markdown-only diff, a source diff, a diff of an unrecognised path and a shallow clone, and the verdict is then evaluated on an empty matrix
    Then the selected lane sets are minimal / full / full / full, and detection uses a name-only diff filtered as JSON without a third-party action. Full history is requested only by the detection job, document scope job and pull-request validation job. On diff failure or shallow clone, detection emits a warning annotation and fails open to the full set. The verdict job is in the same file, has empty permissions and an always-run condition, and exits 0 on an empty matrix
```
