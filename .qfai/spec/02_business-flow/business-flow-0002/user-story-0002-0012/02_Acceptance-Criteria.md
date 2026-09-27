# Acceptance Criteria

## Criteria

```gherkin
Feature: Shipped comment identifier guard
  # AC-0002-0012-01
  Scenario: A story-tree ID outside the sample band in a source comment fails the lint
    Given a comment line in `packages/qfai/src/**/*.ts` carrying an ID of one of the seven story-tree shapes with a numeric segment outside the sample band (`0001` to `0009`, and `01` to `09` for the two-digit tail)
    When `pnpm ci:lint` runs
    Then it exits 1 naming the file and the line
    And the same comment with every numeric segment inside the sample band passes, and an old composite `DEC-NNNN-NNNN` or `OQ-NNNN-NNNN` ID is reported by its existing class only
```
