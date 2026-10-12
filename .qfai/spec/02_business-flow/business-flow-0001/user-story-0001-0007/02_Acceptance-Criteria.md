# Acceptance Criteria

## Criteria

```gherkin
Feature: Decision and open-question tables
  # AC-0001-0007-01
  Scenario: The two tables carry four columns and their own status vocabulary
    Given a project on the story tree
    When `decisions.md` and `open-questions.md` are read
    Then each holds one table with exactly the columns ID, Content, Approach and Status
    And a `decisions.md` row has an ID of the form `DEC-NNNN` and a Status of TODO, WIP, DONE, `SUPERSEDED (by DEC-NNNN)`, `PARTLY SUPERSEDED (by DEC-NNNN)` or REJECTED
    And an `open-questions.md` row has an ID of the form `OQ-NNNN` and a Status of TODO, WIP, DONE or DEFERRED

  # AC-0001-0007-02
  Scenario: Table rows are only appended
    Given a row that `decisions.md` or `open-questions.md` inherits from the common ancestor of the branch and its explicit base
    When the table changes
    Then the row is still present in the logical register with the same ID, Content and Approach
    And only its Status may differ
    And the separate source-bound physical relocation exception permits a different physical table only while preserving every raw row occurrence and cell
    And a new decision is appended to the root Decisions table, and a new question to its own table
    And the only ID-change exception is explicit renumbering of a unique branch-added DEC absent from that ancestor, with only provably branch-added references changed
    And a published branch-added malformed DEC may receive only a source-bound exact Approach prefix repair under a separate new approved recovery change request
    And that repair preserves its ID, Content, Status and original Approach suffix, excludes inherited and open-question rows, and stops on unknown or stale proof
    And a rollback removes only the recorded prefix while its new digest matches and restores the original form error

  # AC-0001-0007-03
  Scenario: Triage records, change requests and retired stories are decision rows
    Given a project on the story tree
    When a triage operation, a change request or a story retirement is recorded
    Then it is recorded as a row of `decisions.md`
    And no file is written under `.qfai/decisions/` and no `01_Spec-retired.md` file exists
  # AC-0001-0007-04
  Scenario: A separate change request permits only a proven physical relocation
    Given a separately adopted in-force execution change request naming every exact source and destination path
    And a reviewed receipt fixing the source, current HEAD, base and unique common ancestor commits, whole-file SHA-256 digests and the ordinal and occurrence map
    When an existing decision table is partitioned into listed historical pages and a root append tail
    Then removal from the original physical table is permitted only as the explicit relocation exception
    And every original occurrence retains its exact raw row bytes, four stored cells, line ending and logical order, including duplicate IDs
    And rows appended after the fixed historical source stay in the root with their original bytes and order
    And no ID, Content, Approach or Status repair, deduplication, open-question move or semantic rewrite is authorized
    And missing authority or provenance, stale bytes or refs, parallel appends, Status changes, unsafe paths and incomplete maps stop before writing
    And every original and replacement is prepared before writing, including recorded absence for new targets, and expected bytes or absence and fixed refs are rechecked before each write
    And a write failure stops further writes and restores only files still holding this invocation's exact replacement bytes, removing an owned newly created file only while those exact bytes match
    And concurrent changes and unrestored paths are preserved and reported, and partial application is never success
    And the normative change request alone authorizes no relocation before adoption of the exact execution receipt
```
