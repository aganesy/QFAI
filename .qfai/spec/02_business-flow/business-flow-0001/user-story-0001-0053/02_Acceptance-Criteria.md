# Acceptance Criteria

## Criteria

```gherkin
Feature: Decision and open-question table validation
  # AC-0001-0053-01
  Scenario: Wrong columns or data-row cell counts are reported
    Given the story tree, and a `decisions.md` or `open-questions.md` table with a column other than ID, Content, Approach and Status, a missing column, or a data row with other than four cells
    When `qfai validate --profile sdd` runs
    Then a wrong header raises an error naming the file and the column
    And a wrong data-row cell count raises an error naming the file and row number, the expected count of 4 and the actual count
    And the errors retain code `QFAI-STORY-003`, severity and exit behavior

  # AC-0001-0053-02
  Scenario: A Status outside the vocabulary is reported
    Given the story tree, and a row whose Status is outside its table's vocabulary — TODO, WIP or DONE in both tables, plus `SUPERSEDED (by DEC-NNNN)`, `PARTLY SUPERSEDED (by DEC-NNNN)` and REJECTED in `decisions.md`, and DEFERRED, `DONE (by DEC-NNNN)` and `SUPERSEDED (by DEC-NNNN)` in `open-questions.md`
    When `qfai validate --profile sdd` runs
    Then a `QFAI-STORY-003` error names the file and row ID and retains `has an invalid Status`, followed by a quoted preview of the value and that table's allowed statuses
    And each DEC reference in a Status has exactly four digits, with the named decision's existence checked separately
    And the display preview replaces each consecutive run of Unicode Cc, Cf, Zl or Zp characters with one space and trims the result
    And the preview keeps the first 40 Unicode code points and adds ASCII `...` only when the sanitized, trimmed value is longer
    And other ordinary spaces, parsed rows, Status values, parsing, accepted statuses, severity, file and row identity, and exit behavior remain unchanged

  # AC-0001-0053-03
  Scenario: A row ID of the other table's shape is reported
    Given the story tree, and a `decisions.md` row whose ID has the `OQ-NNNN` shape, or an `open-questions.md` row whose ID has the `DEC-NNNN` shape
    When `qfai validate --profile sdd` runs
    Then an error names the file and the row ID

  # AC-0001-0053-04
  Scenario: A keyword row is in force by its Status alone
    Given the story tree, and a table row whose Content cell opens with `Test exception:`, `Change request:` or `Unadjudicated:`
    When a validator that reads that keyword runs
    Then it reads the IDs or paths after the colon, separated by commas, as the row's references
    And it decides whether the row is in force from the Status cell alone: `Test exception:` while DONE, `Change request:` while WIP or DONE, `Unadjudicated:` while TODO or WIP

  # AC-0001-0053-05
  Scenario: An open Unadjudicated question raises QFAI-SPACK-102
    Given the story tree, and an `open-questions.md` row opening `Unadjudicated:` with Status TODO or WIP
    When `qfai validate --profile sdd` runs
    Then `QFAI-SPACK-102` is raised at error naming the file and the row ID
    And the same row at DONE, DEFERRED, `DONE (by DEC-NNNN)` or `SUPERSEDED (by DEC-NNNN)` raises no such finding

  # AC-0001-0053-06
  Scenario: A cited decision or question that no row declares is reported
    Given the story tree, and a contract rule whose statement cites a `DEC-NNNN` or `OQ-NNNN` that no row declares, or a `decisions.md` row at `SUPERSEDED (by DEC-NNNN)` whose successor no row declares, or an `open-questions.md` row at `DONE (by DEC-NNNN)` or `SUPERSEDED (by DEC-NNNN)` naming a decision no row declares
    When `qfai validate --profile sdd` runs
    Then `QFAI-STORY-003` is raised at error naming the file, the citing rule or row, and the missing ID
    And an `open-questions.md` row at plain DONE, which names no decision, raises `QFAI-STORY-018` at warning naming the file and the row ID
  # AC-0001-0053-07
  Scenario: A document that states a term the project lists as stale is reported
    Given the story tree, and `validation.staleTerms` in `qfai.config.yaml` listing a term that a document under `paths.specsDir` or `paths.contractsDir` states
    When `qfai validate --profile sdd` runs
    Then `QFAI-STORY-016` is raised at warning naming the file, the line and the term
    And `decisions.md` and `open-questions.md` are not read
    And with no term listed, nothing is checked
  # AC-0001-0053-08
  Scenario: A decision row whose Approach cell breaks the four-item form is reported
    Given the story tree, and a `decisions.md` row above `DEC-2097` whose Approach cell lacks, empties, duplicates or reorders `Evidence:`, `Grounds:`, `Residual risk:` or `Rollback:`, takes `none — <reason>` outside the last two, or holds an Evidence entry that is neither `file:` nor `command:`
    When `qfai validate --profile sdd` runs
    Then `QFAI-STORY-017` is raised at error naming the file, the row ID and the breach
    And labels whose hyphens lie inside closed equal-length backtick spans are literal content, not structural items
    And outside code an odd backslash count escapes only the first backtick, leaving a remaining run available, while an even count leaves the whole run available
    And inside code backslashes are literal, only a complete same-length raw run closes the span, and unmatched openers do not hide later balanced spans
    And original item values remain intact, code-only content is nonempty, quoted labels do not supply missing items, and Evidence prefix checks still apply
    And a row up to `DEC-2097` is not read
  # AC-0001-0053-09
  Scenario: Supported consumers read one ordered decision register
    Given a configured specs directory with a legacy root-only decision table or a root table naming historical pages
    When supported decision consumers read the register
    Then they read each directly listed page in list order followed by the root Decisions table
    And the root optionally holds one closed Decision pages list consisting only of unique direct `- decisions/page-NNNN.md` entries before Decisions
    And each historical page holds exactly the legacy Decisions heading and one four-column Decisions table with no nested index
    And every physical root and page document has at most 500 lines, including comments, headings, list items, blank lines and table lines
    And row grammar, four-cell checks, Status vocabulary, keyword permissions, Approach checks, successor resolution and duplicate-ID validation cover every occurrence
    And retired-inclusive allocation, migration origins and renumber ancestry read the complete register, while stale-term scanning excludes all decision pages
    And missing or unreadable listed pages, duplicate entries, unlisted files in the decisions directory, unsafe or linked paths, traversal and wrong page shape fail without accepting a partial register
    And legacy root-only registers remain readable by updated consumers without an automatic layout rewrite; an oversized register is reported without truncation
    And older binaries or tools that read only raw root bytes are not promised relocated history and must be upgraded or retained on the root-only layout
    And no row-count setting, database, new command or automatic rotation is introduced
```
