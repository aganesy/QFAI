# Acceptance Criteria

## Criteria

```gherkin
Feature: ディレクトリ構造診断

# AC-0003-0002-01
# Parent: US-0003-0002
Scenario: Directory structure diagnosis
  Given the directory `paths.specsDir` names does not exist
  When `qfai doctor` runs
  Then the `paths.specsDir` check reports the directory missing as a warning
```
