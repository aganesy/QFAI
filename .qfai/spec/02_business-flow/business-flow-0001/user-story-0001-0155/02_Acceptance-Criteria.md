# Acceptance Criteria

## Criteria

```gherkin
Feature: Validate Gate Integration

# AC-0001-0155-01
# Parent: US-0001-0155
Scenario: Validate Gate error=0
  Given SDD completion
  When `qfai validate --fail-on error` runs
  Then error count is 0.

# AC-0001-0155-02
# Parent: US-0001-0155
Scenario: Validate Pipeline Validator Registration Integrity
  Given the current story-tree structure, contract-reference, test-obligation, coverage-depth and drift validators
  When the validate pipeline (`packages/qfai/src/core/validate.ts`) is loaded
  Then each validator's public export and direct pipeline registration hold as one complete outcome, including invocation in its owning profile.

# AC-0001-0155-03
# Parent: US-0001-0155
Scenario: Scoped Completion Gate Per Business Flow
  Given the story tree,
  When `/qfai-sdd` gates the business flows it wrote or changed before completion,
  Then it runs `qfai validate --profile sdd --fail-on error --flow BF-NNNN` for each of those flows, so that a parallel worker gates only on its own flow, and it does not pass `--spec <spec-id>`.
```
