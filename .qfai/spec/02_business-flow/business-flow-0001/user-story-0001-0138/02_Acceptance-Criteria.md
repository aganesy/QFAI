# Acceptance Criteria

## Criteria

```gherkin
Feature: Canonical primary UI-contract pin
  # AC-0001-0138-01
  Scenario: `primaryUiContract` pin: full ID only
    Given a `--primary-ui-contract` or `prototyping.primaryUiContract` value,
    When `/qfai-prototyping` reads the pin,
    Then on the story tree the input is `prototyping.primaryUiContract` or `--primary-ui-contract`, and the flag takes precedence. Only the full `UI-NNNN` form is accepted: any other input, a bare `NNNN` included, is exit `2` with an error naming the `UI-NNNN` shape and the input received, and no input is normalised.
```
