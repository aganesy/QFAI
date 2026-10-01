# Acceptance Criteria

## Criteria

```gherkin
Feature: per-skill manifest runtimeDependencies probe
  # AC-0003-0010-01
  Scenario: --profile <skill> probes the manifest's runtimeDependencies
    Given `<paths.skillsDir>/<skill>/manifest.json` declares `runtimeDependencies`, and some of them are absent from `node_modules`
    When `qfai doctor --profile <skill>` runs
    Then `node_modules/.bin/...` / `node_modules/<name>/` is probed for each entry
    And a missing dependency is reported with its install command

  # AC-0003-0010-02
  Scenario: An empty manifest is not probed (boundary)
    Given a manifest whose `runtimeDependencies` is an empty array
    When `qfai doctor --profile <skill>` runs
    Then no probe finding is emitted (no false positive)
```
