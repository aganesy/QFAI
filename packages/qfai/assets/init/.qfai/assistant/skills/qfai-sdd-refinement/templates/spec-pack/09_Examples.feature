Feature: Examples for <spec>

  # Scenario tag rule (mandatory):
  # - each scenario must include @EX-XXXX
  # - each scenario must include @AC-XXXX
  # - each scenario must include one @layer-* tag
  # Reference rule:
  # - examples may reference AC and BR
  # - examples must not be referenced by upper layers

  @EX-0001 @AC-0001 @layer-api
  Scenario: Example title
    Given <precondition>
    When <action>
    Then <expected outcome>

  @EX-0002 @AC-0001 @layer-integration
  Scenario: Another example
    Given <precondition>
    When <action>
    Then <expected outcome>

