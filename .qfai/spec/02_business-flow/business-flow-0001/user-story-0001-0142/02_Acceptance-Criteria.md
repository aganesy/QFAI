# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0142-01
# Parent: US-0001-0142
Scenario: `primarySpecId` error text + (SHOULD) input normalisation
  Given any non-conforming input for `primarySpecId`,
  When iterate validates the input,
  Then the error text MUST read literally `primarySpecId must be a 4-digit zero-padded string (e.g. "0001"); received <input>` (the literal-quote example matches the source pack §REQ-0119 wording).
  And (SHOULD per OQ-0112) `1` / `"1"` / `"01"` / `"0001"` MUST be normalised internally to `spec-0001`; when normalisation is shipped, the error appears only for inputs wholly unparseable as a positive integer ≤ 9999.
  And On the story tree the input is `prototyping.primaryUiContract` or `--primary-ui-contract`, and the flag takes precedence. Only the full `CON-UI-NNNN` form is accepted: any other input, a bare `NNNN` included, is exit `2` with an error naming the `CON-UI-NNNN` shape and the input received, and no input is normalised.
```
