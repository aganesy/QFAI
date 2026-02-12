@SPEC-0001
Feature: Traceability references for sample spec pack

  @SC-0001-0001
  Scenario: Reference SC-0001-0001
    Given a sample acceptance test exists
    When traceability scans feature files
    Then SC-0001-0001 is discoverable

  @SC-0001-0002
  Scenario: Reference SC-0001-0002
    Given a sample acceptance test exists
    When traceability scans feature files
    Then SC-0001-0002 is discoverable

  @SC-0001-0003
  Scenario: Reference SC-0001-0003
    Given a sample acceptance test exists
    When traceability scans feature files
    Then SC-0001-0003 is discoverable
