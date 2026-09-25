# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0145-01
# Parent: US-0001-0145
Scenario: Subagent iter-context hint (SHOULD)
  Given a cycle ≥ 1 invocation,
  When `iterate` finalises the cycle,
  Then `iter-NN/iterate-context.json` SHOULD be written with shape `{ priorCycle: N, priorScores: {...}, openBlockers: [...], priorTailwindContract: "..." }`.
  And the file is advisory and orthogonal to `prototyping.json` (REQ-0012-0063); absence MUST NOT fail certify.
```
