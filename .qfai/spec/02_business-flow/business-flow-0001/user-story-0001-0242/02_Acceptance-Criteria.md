# Acceptance Criteria

## Criteria

```gherkin
Feature: Parse the diagrams a step wrote

  # AC-0001-0242-01
  Scenario: Parse the diagrams a step wrote
    Given the sdd-flow step wrote Markdown files holding Mermaid diagrams
    When the step reaches its gate
    Then the step installs the parser into a directory of its own, runs the shipped Mermaid parser on the files it wrote, fixes each diagram that fails, and reports the check as not run when the parser cannot be installed
```
