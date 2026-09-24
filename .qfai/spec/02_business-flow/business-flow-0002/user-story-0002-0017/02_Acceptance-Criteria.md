# Acceptance Criteria

## Criteria

```gherkin
Feature: Layer-separated test lanes without a new check name

# AC-0002-0017-01
# Parent: US-0002-0017
Scenario: The layer split stays inside the existing file
  Given every check name is a repository setting that no agent can configure
  When the test layers are separated into their own jobs and matrix legs by cost and duration
  Then the own-CI workflow file count is unchanged
  And the aggregate check name is unchanged
  And a new workflow file would create a check name nobody has configured, so it is rejected in review

# AC-0002-0017-02
# Parent: US-0002-0017
Scenario: Splitting release checks preserves the publication barrier
  Given verify selects the sliced or whole suite shape for the tagged tree
  When the publication jobs evaluate their prerequisites
  Then verify and gate must have succeeded
  And every gate selected by that shape must have succeeded
  And only gates outside the selected suite and checks shapes may be skipped
  And a missing, failed, cancelled, skipped or unknown required result refuses publication
  And an unknown shape or cancelled run refuses publication
  And GitHub Release remains push-only while npm publication also supports manual dispatch

# AC-0002-0017-03
# Parent: US-0002-0017
Scenario: Release checks run independently without abandoning older tags
  Given verify reads the tagged manifests as data
  When all four operation scripts and all suite slice scripts are declared
  Then SSOT sync, lint, types and the build chain each need only verify
  And each job uses an isolated checkout of the verified tag and the shared setup
  And the build, pack verification and leakage scan remain ordered in one workspace
  And the local aggregate still invokes exactly the original checks in their original order
  And a tag missing any operation script uses its complete existing aggregate
  And a whole-suite tag never enters the operation path
  And an unknown checks shape or an unsuccessful required operation refuses upload

# AC-0002-0017-04
# Parent: US-0002-0017
Scenario: A changed code-path topology requires a matching pin
  Given the committed pin records instances, installs, jobs declaring a build and declared-timeout sum
  When the checked-in pinner recomputes those four figures from the workflow tree
  Then an equal pin passes the hygiene lane
  And a mismatch fails the lane naming both the committed and recomputed figures
  And re-pinning in the same change with before-and-after numbers restores the passing result
```
