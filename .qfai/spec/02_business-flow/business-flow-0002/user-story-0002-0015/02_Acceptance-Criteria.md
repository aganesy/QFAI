# Acceptance Criteria

## Criteria

```gherkin
Feature: One setup definition with a file-derived Node version

# AC-0002-0015-01
# Parent: US-0002-0015
Scenario: Setup exists once and is consumed, not restated
  Given the frozen-lockfile install literal appears six times across the own CI workflow today
  When the setup preamble is extracted into a single repository-internal definition
  Then that literal appears zero times in the workflow and exactly once in the shared definition
  And every own-CI job that needs the toolchain consumes the shared definition rather than restating it
  And the shared definition enables the package-manager shim, sets up Node with the cache and an explicit cache-dependency path, re-shims, and installs with a frozen lockfile

# AC-0002-0015-02
# Parent: US-0002-0015
Scenario: The version is file-derived here, and the mechanism does not leak into the shipped surface
  Given the Node version is duplicated as a workflow-level literal today
  When the shared setup definition reads the version from a file in the repository
  Then no workflow-level Node version literal remains but the publishing job's declared exception
  And the class of stale-version comment the shipped template exhibits becomes structurally impossible here
  And the shared definition lives outside the shipped asset tree, so pack verification still rejects an actions directory under the shipped GitHub configuration
```
