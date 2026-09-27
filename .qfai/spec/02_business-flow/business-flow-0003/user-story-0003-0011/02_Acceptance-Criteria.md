# Acceptance Criteria

## Criteria

```gherkin
Feature: shipped workflow drift detection (detection half)
  # AC-0003-0011-01
  Scenario: Drift in an installed shipped workflow is reported as advisory
    Given an adopter tree initialised in a temp dir, with one shipped workflow under `.github/workflows/` edited by hand
    When `qfai doctor` runs
    Then the `workflows.integrity` check emits an advisory finding at severity `info`
    And the finding names the stale file by its path relative to the adopter tree
    And once the same tree is restored to match the packaged copy, `workflows.integrity` is at severity `ok` with no drift finding

  # AC-0003-0011-02
  Scenario: The drift finding is advisory and leaves the exit code unchanged (boundary)
    Given `workflows.integrity` has detected drift
    When `qfai doctor --fail-on error` runs
    Then the exit code stays 0 (this finding alone does not block the active profile)
    And the finding appears in the "warnings advisory of drift" group (AC-0003-0007-02)
    And `qfai validate` emits no finding for this drift (it is a diagnostic surface only)
    And as a control, a tree with one `error` finding under `qfai doctor --fail-on error` exits 1

  # AC-0003-0011-03
  Scenario: The repair text names only a manual step, and absent, declined or unresolvable copies are not drift (error/boundary)
    Given `workflows.integrity` has detected drift
    When the finding's message body is inspected
    Then the body names the manual repair of replacing the file with the copy in the installed package
    And the body names no refresh command, CLI verb or flag
    And a shipped name in the `absent` state, with no provenance entry and no file on disk, never appears in a drift finding (never installed is not deleted; when a stale file with an entry sits in the same tree, only that file is reported)
    And the `declined` state, with a provenance entry and a file deleted after install, is a different state from `absent` and is outside this criterion; AC-0003-0011-06 owns how it is reported
    And `absent` and `declined` are not treated alike as missing; classifying either name as missing or deliberately deleted for ownership belongs to the ownership contract in `.qfai/spec/03_contract/cli/cli-0020-shipped-workflows.md` and is outside this criterion
    And when the shipped copy inside the installed package cannot be resolved, the check is skipped at severity `info`

  # AC-0003-0011-04
  Scenario: A same-named file without a provenance entry is not reported as drift
    Given a temp-dir adopter tree whose `.github/workflows/` holds a file named within the shipped name space, and `.qfai/install-provenance.json` has no entry for that name
    When `qfai doctor` runs
    Then `workflows.integrity` emits no drift finding for that file
    And the file's name appears nowhere in the finding messages
    And when another stale file with a provenance entry is placed in the same tree, only that file is reported

  # AC-0003-0011-05
  Scenario: The drift finding alone leaves the exit code unchanged even under --fail-on warning (boundary)
    Given a tree where `workflows.integrity` has detected drift and no other warning or error finding exists
    When `qfai doctor --fail-on warning` runs
    Then the exit code is 0
    And `summary.warning` stays 0 (the drift finding is counted as `info`)
    And as a control, adding one warning unrelated to this finding to the same tree and running again exits 1
    And that control shows the exit-0 claim is not vacuous, as it would be for an implementation that detects nothing

  # AC-0003-0011-06
  Scenario: The drift finding's details list declined files transparently
    Given an adopter tree where one shipped workflow with a provenance entry is edited by hand and another is deleted after install
    When `qfai doctor --format json` runs
    Then the `details` of the `workflows.integrity` finding include `workflowsDir`, `modified`, `declined` and `packagedDir`
    And `details.modified` names the edited file and `details.declined` names the deleted one
    And a `declined` entry changes neither the severity (it stays `info`) nor the exit code
    And the message body does not name the declined file as stale
    And in a tree with no modified file and only declined ones, no finding is emitted, so no `details` appear in the output

  # AC-0003-0011-07
  Scenario: A missing document-schema lane is reported
    Given a project whose `.github/workflows/qfai-docs.yml` is absent, whether never installed or removed after install
    When `qfai doctor` runs
    Then the `workflows.docsLane` check is an error naming the file and the packaged copy to restore it from
    And with the file present the check is `ok`
```
