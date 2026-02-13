Feature: Business flow for <spec>

  # Reference rule:
  # - this file should not reference lower layers.
  # - downstream layers may reference this flow.

  Scenario: Happy path flow
    Given a user starts the workflow
    When the user completes the required steps
    Then the business outcome is achieved

