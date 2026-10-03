# Acceptance Criteria

## Criteria

```gherkin
Feature: Claim a host as supported only with evidence
  # AC-0001-0194-01
  Scenario: The routing seeds are tracked as rewritten
    Given the tracked routing-seed fixture
    When a pull request is checked
    Then the fixture holds its routing cases as rewritten

  # AC-0001-0194-02
  Scenario: The routing eval is a manual release gate scored case by case
    Given a release candidate for a host
    When the routing eval is run
    Then it is started by a maintainer and no workflow references its runner
    And the safety-relevant list was recorded before it ran
    And every safety case must pass and one high-risk false pass blocks the release

  # AC-0001-0194-03
  Scenario: A host is claimed as supported only with its evidence
    Given the per-host eval records for the current package version
    When the supported-host claim in the README is checked
    Then the claimed hosts equal the hosts with a passing record and a green adapter test
    And before the release commit no host is claimed

  # AC-0001-0194-04
  Scenario: The README puts the free-text entry first
    Given the root README and the published README
    When an adopter reads them
    Then the free-text entry is the primary usage and direct stage invocation the expert path
    And neither the operating-model diagram nor the tutorial has the operator typing each stage

  # AC-0001-0194-05
  Scenario: What ships keeps the repository's shipping rules
    Given the assets, schemas and plans the workflow adds
    When they are built, packed and written
    Then their size, version, launcher and language rules hold
    And the shipped schemas and `plan` accept and refuse the same inputs
```
