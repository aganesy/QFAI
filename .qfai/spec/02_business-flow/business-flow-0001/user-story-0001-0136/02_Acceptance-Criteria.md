# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0136-01
# Parent: US-0001-0136
Scenario: `prototyping.json` validate-conformant emit
  Given a converged `iterate` invocation,
  When `iterate` writes `prototyping.json`,
  Then `iterations[i]` MUST carry non-null `commitSha` (sentinel `"uncommitted"` permitted), non-empty `proseCritique`, `scores`, `layoutAntiPatternsDetected`, `designMdViolations`, `pivotDirective`, `reviewerId`, AND `evidenceRefs[]` with one entry per `screens[].id`.
  And on convergence the top-level MUST carry `acceptedIterationIndex` AND `stopReason ∈ {"converged", "max-iterations", "license-verify-fail", "input-error"}`.
  And `qfai validate --profile prototyping --fail-on error` MUST PASS without orchestrator post-processing.
```
