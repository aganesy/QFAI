# Acceptance Criteria

## Criteria

```gherkin
Feature: Low-cost per-iteration evidence
  # AC-0001-0110-01
  Scenario: Default cycle writes only review payloads
    Given `qfai prototyping iterate` runs without `--capture`
    When a reviewer completes a screen assessment
    Then the required per-screen artifact is `iter-NN/UI-NNNN/<screen>.review.json`
    And no PNG, HTML snapshot, or scripted interaction transcript is required from that cycle

  # AC-0001-0110-02
  Scenario: Capture remains optional
    Given `qfai prototyping iterate` runs with `--capture`
    When capture completes for a declared screen
    Then PNG and HTML artifacts may accompany the review payload under the opt-in capture contract
    And the reviewer still operates Playwright and owns the qualitative review
```
