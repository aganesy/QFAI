# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0002-0012-01
# Parent: US-0002-0012
Scenario: AC-0002-0012-01
  Given a comment line in `packages/qfai/src/**/*.ts` carrying an ID of one of the seven story-tree shapes with a numeric segment outside the sample band (`0001` to `0009`, and `01` to `09` for the two-digit tail)
  When `pnpm ci:lint` runs
  Then it exits 1 naming the file and the line
  And The same comment with every numeric segment inside the sample band passes, and an old composite `DEC-NNNN-NNNN` or `OQ-NNNN-NNNN` ID is reported by its existing class only
```
