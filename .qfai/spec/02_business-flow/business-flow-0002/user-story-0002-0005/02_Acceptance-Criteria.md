# Acceptance Criteria

## Criteria

```gherkin
Feature: 配布 runner label 間接化

# AC-0002-0005-01
# Parent: US-0002-0005
Scenario: runner label 間接化 + header 表
  Given 配布 workflow set の全 runner selector と各ファイルの header block
  When selector 値と header table を検査する
  Then every selector reads a repository variable whose default is a public GitHub-hosted label, and no organization-private label literal appears anywhere in the set. Each shipped file's header table states the variable it reads, that variable's default, the failure mode in which GitHub queues the job indefinitely rather than failing fast on a wrong value, the `packageManager` manifest field precondition, the layer the file covers, the condition that makes it inert, and its fail-open behaviour
```
