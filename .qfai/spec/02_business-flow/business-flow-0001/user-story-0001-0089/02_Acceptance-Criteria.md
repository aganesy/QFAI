# Acceptance Criteria

## Criteria

```gherkin
Feature: Mock template emits anchor-form hrefs by default
  # AC-0001-0089-01
  Scenario: The template emits anchor-form links and the validator stays strict
    Given the shipped `qfai-discussion` mock template and the SKILL.md authoring guidance
    When an HTML mock is authored in `03_Story-Workshop.md`
    Then the links the template emits are anchor-form (`<a href="#<name>">`), and SKILL.md instructs anchor-form authoring
    And `QFAI-MOCK-010` continues to pass anchor hrefs (`#name`) and external `http(s)://` hrefs
    And the template emits no same-origin absolute href (`/path/`)

  # AC-0001-0089-02
  Scenario: A template edit without the matching validator edit raises `QFAI-MOCKHREF-001`
    Given the mock template and the `QFAI-MOCK-010` validator, which are kept in sync as one pair
    When one side is edited without the matching update to the other
    Then the reviewer-gate finding `QFAI-MOCKHREF-001` (severity error) is raised, naming the asymmetric edit
```
