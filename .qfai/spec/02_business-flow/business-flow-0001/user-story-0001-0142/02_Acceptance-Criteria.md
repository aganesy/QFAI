# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0142-01
# Parent: US-0001-0142
Scenario: `primaryUiContract` pin: full ID only
  Given a `--primary-ui-contract` or `prototyping.primaryUiContract` value,
  When iterate validates the input,
  Then on the story tree the input is `prototyping.primaryUiContract` or `--primary-ui-contract`, and the flag takes precedence. Only the full `CON-UI-NNNN` form is accepted: any other input, a bare `NNNN` included, is exit `2` with an error naming the `CON-UI-NNNN` shape and the input received, and no input is normalised.
```
