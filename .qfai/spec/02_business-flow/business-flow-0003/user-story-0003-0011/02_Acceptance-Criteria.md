# Acceptance Criteria

## Criteria

```gherkin
Feature: Shipped workflow checks
  # AC-0003-0011-07
  Scenario: A missing document-schema lane is reported
    Given a project whose `.github/workflows/qfai-docs.yml` is absent, whether never installed or removed after install
    When `qfai doctor` runs
    Then the `workflows.docsLane` check is an error naming the file and the packaged copy to restore it from
    And with the file present the check is `ok`

  # AC-0003-0011-08
  Scenario: Doctor warns about the repository facts the shipped workflows rely on
    Given a project that has none of those facts in place: `pnpm-lock.yaml` without a valid `"packageManager"` in `package.json`; two lockfiles; `engines.node` without a `.nvmrc` or `.node-version`; a workflow under `.github/workflows/` pinning a Node below `engines.node`
    When `qfai doctor` runs
    Then each unmet fact is a `warning` and never an `error`, so a project without CI is not blocked
    And the `workflows.packageManager` message names `pnpm-lock.yaml` and the `packageManager` value to set
    And the `workflows.lockfiles` message names the lockfiles, the package manager the shipped workflows install with and the lockfile they ignore
    And the `workflows.nodeVersionFile` message names `engines.node` and the Node the shipped workflows use instead
    And the `workflows.nodePin` message names each workflow file and the pinned version
    And a fact that is met, or one that does not apply to the project, raises no finding

  # AC-0003-0011-09
  Scenario: Init names how many of those facts are unmet
    Given a project where at least one of those facts is unmet
    When `qfai init` runs
    Then it prints one line, starting `Shipped workflows:`, with the count and a pointer to `qfai doctor`
    And a project where every fact is met gets no such line

  # AC-0003-0011-10
  Scenario: A document-schema checker binary that does not run, or runs only from a download, is reported
    Given an installed QFAI package whose `@jackchuka/mdschema` binary starts from the platform package, one whose binary starts only from the copy its install script downloaded, and one whose binary cannot start
    When `qfai doctor` runs
    Then the `workflows.mdschemaBinary` check is `ok` when `mdschema --help` exits 0 from the platform package, and no binary found from the inspected project's root is started
    And it is a warning naming the reason when the binary exits 0 only from the downloaded copy
    And it is an error naming the reason and the fix when the binary cannot start

  # AC-0003-0011-11
  Scenario: A shipped workflow that differs from the shipped text is reported
    Given a project whose `.github/workflows/` holds a shipped workflow whose text differs from the copy in the package, one that matches it, one that matches it apart from line endings, and a shipped workflow that is not installed
    When `qfai doctor` runs
    Then each differing workflow is a `warning` and never an `error`, naming the installed file and the packaged file to copy from
    And a matching workflow, one that differs only in line endings and an absent one raise no finding
    And doctor writes no workflow file

  # AC-0003-0011-12
  Scenario: Doctor reports the jobs the installed shipped workflows start per pull request event
    Given a project holding some or all of the shipped workflows, one whose job condition the shipped templates do not use, and one with none
    When `qfai doctor` runs
    Then the `workflows.cost` check is `info` and never a warning or an error
    And its message gives, for each installed shipped workflow, the jobs a pull request event starts when nothing is to run and the most it starts when its lane runs, and the runner selector of each job
    And a workflow it cannot read is named as not counted, and a project with no shipped workflow gets no check
    And doctor reads no repository variable and writes no file

  # AC-0003-0011-13
  Scenario: A workflow file that cannot be parsed is reported
    Given a project whose `.github/workflows/` and `.github/actions/` hold a file with a key twice in one mapping, a file that is valid YAML, and files with another extension or outside those directories
    When `qfai doctor` runs
    Then each file that cannot be parsed is a `warning` and never an `error`, naming the file, the line of the first error and its reason
    And a valid file, a file with another extension and a file outside those directories raise no finding
    And doctor writes no file
```
