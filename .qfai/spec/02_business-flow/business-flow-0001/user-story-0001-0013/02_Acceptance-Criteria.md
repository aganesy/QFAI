# Acceptance Criteria

## Criteria

```gherkin
Feature: Nine-file discussion-pack structure
  # AC-0001-0013-01
  Scenario: The discussion pack holds the nine required files
    Given a discussion-pack directory
    When its required files are checked
    Then `01_Context.md`, `03_Story-Workshop.md`, `04_Sources.md`, `05_Scope.md`, `06_REQ.md`, `07_NFR.md`, `08_Glossary.md`, `09_Constraints.md` and `11_OQ-Register.md` exist
```
