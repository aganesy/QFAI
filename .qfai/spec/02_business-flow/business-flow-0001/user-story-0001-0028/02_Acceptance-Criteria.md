# Acceptance Criteria

## Criteria

```gherkin
Feature: Git symlink setting and Windows support
  # AC-0001-0028-01
  Scenario: Init enables core.symlinks inside a Git repository
    Given `qfai init` runs
    When init starts
    Then inside a Git repository it runs `git config core.symlinks true`
    And outside a Git repository it changes no `core.symlinks` setting

  # AC-0001-0028-02
  Scenario: A failed symlink on Windows stops init with Developer Mode guidance
    Given a Windows machine with Developer Mode disabled
    When `qfai init` tries to create a symlink
    Then an error message is shown that explains how to enable Developer Mode
    And the run stops

  # AC-0001-0028-03
  Scenario: A symlink that cannot be created stops init before it writes anything
    Given a Windows machine with Developer Mode disabled
    When `qfai init` starts without `--dry-run`
    Then it tries one symlink in a scratch directory outside the project before it writes any file
    And the refusal stops the run with the Developer Mode message and no file of the project is written
    And a probe that fails for another reason does not stop the run

  # AC-0001-0028-04
  Scenario: Init names the config file it changes and says when other worktrees share it
    Given `qfai init` runs inside a linked worktree of a repository whose `core.symlinks` is not enabled
    When init sets `core.symlinks`, or previews the change with `--dry-run`
    Then the output names the config file
    And one output line says that the file is shared by every worktree of the repository, the main checkout included
    And the same run in the main checkout prints no such line
```
