# Acceptance Criteria

## Criteria

```gherkin
Feature: Shipped runner label indirection
  # AC-0002-0005-01
  Scenario: Runner labels come from a variable the header table documents
    Given every runner selector of the shipped workflow set and the header block of each file
    When the selector values and the header tables are inspected
    Then every selector reads a repository variable whose default is a public GitHub-hosted label, and no organization-private label literal appears anywhere in the set. Each shipped file's header table states the variable it reads, that variable's default, the failure mode in which GitHub queues the job indefinitely rather than failing fast on a wrong value, the `packageManager` manifest field precondition, the layer the file covers, the condition that makes it inert, and its fail-open behaviour
```
