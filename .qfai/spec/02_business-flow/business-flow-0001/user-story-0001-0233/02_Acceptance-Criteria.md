# Acceptance Criteria

## Criteria

```gherkin
Feature: Prepare project-local graph tools through init

  # AC-0001-0233-01
  Scenario: Prepare the selected runtimes
    Given a fresh or upgraded adopter with supported prerequisites
    When I run qfai init
    Then both selected tools are prepared locally or their failed preparation step is reported

  # AC-0001-0233-02
  Scenario: Preserve project settings and reminders
    Given existing project-local host settings
    When init composes graph integration
    Then unrelated settings and existing reminder behavior are preserved

  # AC-0001-0233-03
  Scenario: Repeat preparation safely
    Given a compatible completed installation
    When I rerun init
    Then verified tools are reused and missing managed components are repaired without duplicate integration entries

  # AC-0001-0233-04
  Scenario: Keep usable preparation after failure
    Given a usable installation and a required replacement
    When replacement preparation fails
    Then the replacement is not activated and the prior usable installation remains

  # AC-0001-0233-05
  Scenario: Preview without side effects
    Given a fresh or upgraded project
    When I run init with --dry-run
    Then the preparation plan is shown without performing its actions

  # AC-0001-0233-06
  Scenario: Use one integration for adopters and QFAI
    Given the package assets and preparation behavior
    When fresh adopters, older adopters and QFAI itself prepare graph tools
    Then the same integration obligations apply without a separate dogfood implementation
```
