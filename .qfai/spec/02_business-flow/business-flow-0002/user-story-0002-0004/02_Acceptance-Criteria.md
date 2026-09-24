# Acceptance Criteria

## Criteria

```gherkin
Feature: 配布 change detection と green-on-skip verdict

# AC-0002-0004-01
# Parent: US-0002-0004
Scenario: 配布 detection と green-on-skip
  Given 配布 orchestrator の detection job と verdict job
  When Markdown のみの diff / source の diff / 認識外パスの diff / shallow clone の 4 入力で detection を走らせ、続いて空 matrix で verdict を評価する
  Then the selected lane sets are minimal / full / full / full, and detection uses a name-only diff filtered as JSON without a third-party action. Full history is requested only by the detection job, document scope job and pull-request validation job. On diff failure or shallow clone, detection emits a warning annotation and fails open to the full set. The verdict job is in the same file, has empty permissions and an always-run condition, and exits 0 on an empty matrix
```
