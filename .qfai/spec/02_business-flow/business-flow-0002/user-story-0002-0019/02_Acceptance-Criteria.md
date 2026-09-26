# Acceptance Criteria

## Criteria

```gherkin
Feature: Runner parallelism derived from QFAI's own workload

# AC-0002-0019-01
# Parent: US-0002-0019
Scenario: Parallelism becomes explicit per project
  Given every project in the runner workspace declares only a name, an include pattern and a shared timeout today
  When the workspace is updated
  Then every project declares its pool, an isolation setting, a within-file concurrency setting and a hook timeout, and the root configuration declares the worker and file-parallelism settings
  And the declared starting value on the worker axis is ten
  And the declared starting value on the within-file concurrency axis is ten
  And each declared value is overridable rather than fixed

# AC-0002-0019-02
# Parent: US-0002-0019
Scenario: One slice name resolves on every surface that declares the slice set
  Given the runner workspace declares one project per slice
  And the package manifest declares a per-slice script for each slice
  And the test and node-floor CI jobs each declare a slice matrix
  And the gate-tests and gate-floor release jobs each declare a slice matrix
  And release verify declares SUITE_SLICES
  When all seven surfaces are compared
  Then the runner project set, the per-slice script set, all four matrix lists and SUITE_SLICES are equal
  And each of those sets holds seven names
  And no declared runner project matches zero files
  And neither `pr-fix` nor `pr-merge` has a project, script or matrix leg

# AC-0002-0019-03
# Parent: US-0002-0019
Scenario: The declared starting value is a hypothesis, and the measurement decides
  Given the source repository's numbers are justified as network-bound while this suite is filesystem- and subprocess-bound
  When a timing artifact under the evidence tree compares at least two worker settings on the largest project
  Then the adopted setting is the fastest measured, or within ten percent of it with a written reason
  And when the higher value measures slower or flakier, the contended structure is investigated first: a removable cause is repaired and the higher value kept, and only where no such cause is found is the lower value kept with the measurement recorded as the reason
  And revising the user's stated starting value requires the user's sign-off
  And the timings are quoted in the pull-request description as well as written to the evidence tree

# AC-0002-0019-04
# Parent: US-0002-0019
Scenario: Newly created races surface instead of being masked
  Given more workers means more concurrent writers against temporary trees and the spawned command-line binary
  When the workspace is tuned
  Then a search for a retry setting in the runner workspace returns zero results
  And each tuning change lands on its own pull request, largest project first
  And each such pull request records, before merge, three consecutive runs green on the lanes that tuning affects, with their run identifiers quoted
  And a rerun-to-green rate above one in twenty default-branch verdict runs afterwards reopens the setting
```
