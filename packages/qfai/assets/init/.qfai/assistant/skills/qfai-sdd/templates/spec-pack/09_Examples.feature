Feature: Examples for <spec>

  # Scenario tag rule (mandatory):
  # - each scenario must include @EX-XXXX
  # - each scenario must include @AC-XXXX
  # - each scenario must include one @layer-* tag
  # - include BR references in comments or Given/Then wording
  # Reference rule:
  # - examples may reference AC and BR
  # - examples must not be referenced by upper layers
  # Density rule:
  # - if an AC/BR has no example, treat it as unresolved and record a follow-up
  # - prefer Scenario Outline when you need multiple concrete variants

  @EX-0001 @AC-0001 @layer-api
  Scenario Outline: Example title
    # Related BR: BR-0001
    Given <precondition>
    When <action>
    Then <expected outcome>
    And the rule outcome is "<rule_outcome>"

    Examples:
      | rule_outcome |
      | accepted     |
      | rejected     |

  @EX-0002 @AC-0002 @layer-integration
  Scenario: Another example
    # Related BR: BR-0002
    Given <precondition>
    When <action>
    Then <expected outcome>
