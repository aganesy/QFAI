# Acceptance Criteria

## Criteria

```gherkin
Feature: 15-file discussion-pack structure

# AC-0001-0013-01
# Parent: US-0001-0013
Scenario: discussion-pack が 15 必須ファイルを含む
  Given discussion-pack ディレクトリが存在する
  When 必須ファイルを検証する
  Then 01_Context.md から 99_delta.md までの 15 ファイルが存在する
```
