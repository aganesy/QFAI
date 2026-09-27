# Acceptance Criteria

## Criteria

```gherkin
Feature: Shipped workflow ownership contract
  # AC-0002-0007-01
  Scenario: Ownership comes from the shipped name lists and provenance
    Given a fixture whose adopter workflows directory holds (a) an adopter-created file whose name collides with a name QFAI ships, (b) a file QFAI installed by the record and the adopter then deleted, and (c) a hand-edited installed file
    When the write-set and prune-set resolution path and the provenance reader are inspected against the ownership boundary `.qfai/contracts/cli/shipped-workflows.md` (`CLI-WFSET`) sets, and `qfai init` runs on the fixture
    Then the `qfai-` prefix is treated as a reservation notice and never as a selector: the write set equals the in-binary `SHIPPED_WORKFLOW_NAMES` and the prune set the in-binary `RETIRED_WORKFLOW_NAMES`, and neither comes from a `qfai-*` glob over the adopter's disk
    And provenance is read from `.qfai/install-provenance.json`, which is tracked, carries no `schemaVersion` and holds the sha256 of the bytes QFAI wrote, and it is consulted before every overwrite or prune
    And the reader treats an absent file, a missing `workflows` key and invalid JSON as empty, and does not throw
    And each file's state is one of the closed five-state enum `absent`, `adopter-owned`, `installed`, `modified` and `declined`: (a) stays byte-for-byte unchanged as `adopter-owned`, (b) is `declined`, and (c) is not overwritten and is `modified`
    And no prune happens in any of the five states
    And writing and removal go only through `copyTemplateTree`, `copyTemplatePaths` and `pruneMatchingEntries`, the path holds no `copyFile`, `writeFile`, `rm` or `unlink` call of its own, and `pruneMatchingEntries` is exported, since leaving it module-private would make reimplementation the only alternative

  # AC-0002-0007-02
  Scenario: A declined name is excluded before copying
    Given a fixture with one shipped name that QFAI installed by the provenance record and the adopter then deleted, so the file is absent from disk
    When `qfai init` runs and the construction of the copy set is observed
    Then the name is excluded from the copy set **before** any copy runs, and it is still absent from disk after init
    And the exclusion does not rest on the create-only check alone: a declined file is absent, so create-only would write it as new, and a test asserting only create-only stays green even when init revives the file
    And the exclusion is therefore observable independently of create-only, as the content of the copy set itself or as the set of names passed to the copy primitive
```
