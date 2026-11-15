# Acceptance Criteria

## Criteria

```gherkin
Feature: Keep the parts of a business screen out of minimal-scope cuts
  # AC-0001-0309-01
  Scenario: The business-screen list outranks Article VII
    Given a project initialised by `qfai init`
    When an agent reads Article VII of the shipped constitution
    Then the article names the list of parts every business screen has in `interface-clarity.md` among what outranks it, beside the safety floor
    And it says a part on that list, on an application screen whose UI contract records no reason to leave it out, is never scope beyond the minimum, while how it is built remains subject to the article
    And the reviewer cards that refuse an excess cut of the safety floor refuse a cut of such a part too
```
