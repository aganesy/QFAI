# Acceptance Criteria

## Criteria

```gherkin
Feature: Canonical primary UI-contract pin
  # AC-0001-0138-01
  Scenario: `primaryUiContract` pin: full ID only
    Given a `primaryUiContract` named in the request or `prototyping.primaryUiContract` in config
    When `/qfai-prototyping` reads the pin
    Then the request takes precedence over the config. Only the full `UI-NNNN` form is accepted: any other value, a bare `NNNN` included, is refused with an error naming the `UI-NNNN` shape and the value received, and no value is normalised.
```
