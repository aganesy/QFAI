# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0127-01
# Parent: US-0001-0127
Scenario: 10-cycle iteration budget — terminator index === 9
  Given `MAX_ITERATIONS = 10` and `MAX_ITERATION_INDEX = 9` in `core/prototyping/iteration.ts`,
  When the iteration loop runs,
  Then the run executes cycle 0 plus cycles 1..9 (max 10 iterations) on a single per-spec lineage (per UI contract on the story tree) and writes the terminator at `index === 9` when convergence is not reached earlier.
  And a single `--cycle 9` invocation on a non-converged loop whose `iterations.length === 10` MUST surface exit 65 directly (max-iterations terminator) without routing through the `expectedNextCycle === 10` cycle-mismatch path (cycle-9 idempotency is a terminator-routing concern, not an autonomous-run / no-prompts concern, so it belongs here rather than under AC-0001-0122-01).

# AC-0001-0127-02
# Parent: US-0001-0127
Scenario: Validators reject out-of-range cycle index
  Given any evidence pack written by `/qfai-prototyping`,
  When `QFAI-PROT-005` / `QFAI-PROT-006` runs,
  Then any cycle index > 9 or any cycle count ≠ recorded `MAX_ITERATIONS` raises a non-zero validator finding.
```
