# Acceptance Criteria

## Criteria

```gherkin
Feature: Review-only default evidence

# AC-0001-0113-01
# Parent: US-0001-0113
Scenario: Default cycle writes only review payloads
  Given `qfai prototyping iterate` runs without `--capture`
  When a reviewer completes a screen assessment
  Then the required per-screen artifact is `iter-NN/CON-UI-NNNN/<screen>.review.json`
  And no PNG, HTML snapshot, or scripted interaction transcript is required from that cycle

Scenario: Capture remains optional
  Given `qfai prototyping iterate` runs with `--capture`
  When capture completes for a declared screen
  Then PNG and HTML artifacts may accompany the review payload under the opt-in capture contract
  And the reviewer still operates Playwright and owns the qualitative review
```
