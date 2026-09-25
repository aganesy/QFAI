# Acceptance Criteria

## Criteria

```gherkin
Feature: 配布 runner label 間接化

# AC-0002-0005-01
# Parent: US-0002-0005
Scenario: runner label 間接化 + header 表
  Given 配布 workflow set の全 runner selector と各ファイルの header block
  When selector 値と header table を検査する
  Then 全 selector が repository variable を読み、その default が public GitHub-hosted label であり、organization-private label literal は set のどこにも現れない。各配布ファイルの header table は読む variable 名・その default・誤値時に GitHub が fail fast せず無期限 queue する失敗モード・`packageManager` manifest field の前提条件を記載している
```
