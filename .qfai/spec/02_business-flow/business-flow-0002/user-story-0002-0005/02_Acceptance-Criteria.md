# Acceptance Criteria

## Criteria

```gherkin
Feature: Shipped runner label indirection
  # AC-0002-0005-01
  Scenario: Runner labels come from a variable the header table documents
    Given every runner selector of the shipped workflow set and the header block of each file
    When the selector values and the header tables are inspected
    Then every selector reads a repository variable whose default is a public GitHub-hosted label, and no organization-private label literal appears anywhere in the set. Each shipped file's header table states the variable it reads, that variable's default, the failure mode in which GitHub queues the job indefinitely rather than failing fast on a wrong value, the `packageManager` manifest field precondition, the layer the file covers, the condition that makes it inert, and its fail-open behaviour

  # AC-0002-0005-02
  Scenario: The light runner variable has a documented value that every light job fits
    Given the jobs of the shipped set that read the light runner variable, and the header of each file that has one
    When the commands, containers and timeouts of those jobs and the header text are inspected
    Then each such header recommends `ubuntu-slim` for a private repository on GitHub-hosted runners, says that the shipped default stays a public label and the choice is the adopter's, and names what stays off that runner: a job that installs dependencies, needs Docker or can run longer than 15 minutes
    And every light job runs only commands the runner image carries, uses no container and declares a timeout within the limit, so a command outside that set fails the structural tests
```
