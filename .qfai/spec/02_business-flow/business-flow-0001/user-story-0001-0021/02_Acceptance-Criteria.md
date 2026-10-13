# Acceptance Criteria

## Criteria

```gherkin
Feature: Idempotent initialization
  # AC-0001-0021-01
  Scenario: A repeated init skips existing files
    Given `.qfai/` and `qfai.config.yaml` already exist
    When `qfai init` runs again
    Then existing files are skipped and only new files are added
    And the skipped files are reported on the console

  # AC-0001-0021-02
  Scenario: A run that writes a new assistant file and keeps a differing one says so
    Given a project whose `.qfai/assistant/` holds a file that differs from this release's copy, for example a `SKILL.md` that is a copy of the previous release's, and lacks a file the release adds
    When `qfai init` runs without `--force`
    Then the run writes the new file and keeps the differing one, as before
    And one line gives the number of new files written under `.qfai/assistant/` and the number of kept files that differ, names the kept `SKILL.md` and `STEP.md` files as the owners that may not list or cite the new file, and says `qfai init --force` rewrites all the kept files
    And a run with `--force`, a run that writes no new assistant file and a run that keeps no differing file print no such line
```
