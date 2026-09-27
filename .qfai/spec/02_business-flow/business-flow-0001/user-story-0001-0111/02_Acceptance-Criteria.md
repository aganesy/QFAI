# Acceptance Criteria

## Criteria

```gherkin
Feature: Declared layout anti-pattern review
  # AC-0001-0111-01
  Scenario: A layout anti-pattern caps the information-architecture score
    Given any `iter-NN/review.json` where `layoutAntiPatternsDetected.length > 0`
    When it is validated
    Then `scores.informationArchitecture` is in `{weak, acceptable}`
    And `strong` or `exceptional` raises `QFAI-PROT-021`

  # AC-0001-0111-02
  Scenario: Only declared layout anti-pattern IDs are accepted
    Given any `iter-NN/review.json`
    When it is validated
    Then every entry in `layoutAntiPatternsDetected[]` is an identifier declared in `packages/qfai/assets/validators/layoutAntiPatterns.json`, which is what `loadKnownLapIds` reads
    And a token no entry declares raises `QFAI-PROT-002`
    And the registry file is the only list of accepted identifiers, so no second copy of it is written out
```
