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
  Scenario: Original table records are preserved
    Given a row that `decisions.md` or `open-questions.md` inherits from the common ancestor of the branch and its explicit base
    When the table changes
    Then the row is still there with the same ID, Content and Approach
    And only its Status may differ
    And a new decision or question is a new row at the end of the table
    And the only ID-change exception is explicit renumbering of a unique branch-added DEC absent from that ancestor, with only provably branch-added references changed
    And a published branch-added malformed DEC may receive only a source-bound exact Approach prefix repair under a separate new approved recovery change request
    And that repair preserves its ID, Content, Status and original Approach suffix, excludes inherited and open-question rows, and stops on unknown or stale proof
    And a rollback removes only the recorded prefix while its new digest matches and restores the original form error
    And only proven identical physical surplus DEC copies introduced by an exact two-parent merge may be removed under the separately authorized manual recovery criterion
    And that recovery retains the original inherited occurrence and all distinct records, references and unrelated current bytes

  # AC-0001-0007-03
  Scenario: Triage records, change requests and retired stories are decision rows
    Given a project on the story tree
    When a triage operation, a change request or a story retirement is recorded
    Then it is recorded as a row of `decisions.md`
    And no file is written under `.qfai/decisions/` and no `01_Spec-retired.md` file exists

  # AC-0001-0007-05
  Scenario: The owner manually removes only proven merge-introduced identical surplus copies
    Given an exact two-parent bad merge that is an available ancestor of current HEAD
    And its parents and unique common ancestor each hold one byte-identical original DEC row
    And the explicit fixed base and its unique comparison ancestor hold one original and no surplus selected for removal
    And each selected current copy matches the complete proven stored UTF-8 raw row including all four cells, delimiters, padding and line ending
    When the SDD owner adopts a separate new in-force target change request and independently reviewed fresh post-request proof
    Then only its mapped surplus occurrences may be removed while one original and all unrelated current bytes, records, references and Git history remain unchanged
    And missing, ambiguous, conflicting, stale or changed proof or authority stops the bounded action before writing
    And the request fixes input lineage and mapping while fresh evidence fixes actual write HEAD, base, ancestor, complete preimage and replacement hashes and current authority
    And a changed target or operation needs a new change request without rewriting earlier immutable cells
    And rollback restores the complete preimage only while current bytes exactly match the owned replacement, otherwise preserving concurrent bytes and reporting nonrestoration
    And existing duplicate validation, positional drift, consumed-DONE authorization and valid Status-only rules remain without an exemption
    And unrelated existing drift remains diagnosed without adding a clean-prefix prerequisite to every correction
    And an actual required stage gate may stop dependent work and unfinished actions or required gates keep the request WIP without a whole-target completion claim
```
