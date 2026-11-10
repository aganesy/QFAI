# Acceptance Criteria

## Criteria

```gherkin
Feature: Check a design for product fit and claims nobody has confirmed
  # AC-0001-0296-01
  Scenario: A review asks whether the screen fits another product's name
    Given the design direction, root `DESIGN.md` or a screen under review against the design anti-pattern list
    When the reviewer finds that the screen would still fit if another product's name replaced this one
    Then the finding names where the direction should become specific to this product: the copy, the one distinctive element or the visual
    And it is a reviewer's judgement that adds no `lap-*` entry

  # AC-0001-0296-02
  Scenario: An unsupported claim already on the screen is put to the user
    Given a metric, customer count, testimonial or "trusted by" row on the screen or in material the user supplied, which the project's documents do not support
    When the claim is met while root `DESIGN.md` is written or a screen is built or reviewed
    Then it is put to the user before anyone deletes or rewrites it
    And a claim the user confirms keeps its wording or becomes specific with the user's facts, and one the user rejects is removed
    And inside a restyle, a claim to remove or reword is reported as a change the contract needs
    And a claim an agent would write itself is never written

  # AC-0001-0296-03
  Scenario: With no user present, the claim waits for one
    Given an unsupported claim already on the screen, met under a no-question mode
    When the work reaches it
    Then the claim stays as it is, becomes one row in `open-questions.md`, and the final report lists it
    And inside the prototyping loop, the final report alone lists it
```
