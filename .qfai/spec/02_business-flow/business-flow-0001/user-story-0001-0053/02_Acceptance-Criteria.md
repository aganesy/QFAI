# Acceptance Criteria

## Criteria

```gherkin
Feature: Decision and open-question table validation
  # AC-0001-0053-01
  Scenario: Wrong columns or data-row cell counts are reported
    Given the story tree, and a `decisions.md`, decision-page or `open-questions.md` table with a column other than ID, Content and Approach, a missing column, or a data row with other than three cells
    When `qfai validate --profile sdd` runs
    Then a wrong header raises an error naming the file and the column, a Status column included
    And a wrong data-row cell count raises an error naming the file and row number, the expected count of 3 and the actual count
    And the errors retain code `QFAI-STORY-003`, severity and exit behavior

  # AC-0001-0053-03
  Scenario: A row ID of the other table's shape is reported
    Given the story tree, and a `decisions.md` row whose ID has the `OQ-NNNN` or `OQ-yyyymmddhhMMss` shape, or an `open-questions.md` row whose ID has the `DEC-NNNN` or `DEC-yyyymmddhhMMss` shape
    When `qfai validate --profile sdd` runs
    Then an error names the file and the row ID
    And a row whose ID has its own table's shape, in either form, raises no such error

  # AC-0001-0053-04
  Scenario: A keyword row acts by its keyword and its presence
    Given the story tree, and a table row whose Content cell opens with `Test exception:` or `Unadjudicated:`
    When a validator that reads that keyword runs
    Then it reads the IDs after the colon, separated by commas, as the row's references
    And a `Test exception:` row exempts while it exists, and an `Unadjudicated:` row is pending while it exists
    And a row opening any other word, an old `Change request:` row included, is an ordinary decision row

  # AC-0001-0053-05
  Scenario: An open Unadjudicated question raises QFAI-SPACK-102
    Given the story tree, and an `open-questions.md` row opening `Unadjudicated:`
    When `qfai validate --profile sdd` runs
    Then `QFAI-SPACK-102` is raised at error naming the file and the row ID
    And once a decision settles the question and the row is deleted, no such finding is raised

  # AC-0001-0053-06
  Scenario: A cited decision or question that no row declares is reported
    Given the story tree, and a contract rule whose statement cites a decision or open-question ID, in either form, that no row declares, or a decision row whose Approach names after `Supersedes` or `Narrows` a decision that no row declares
    When `qfai validate --profile sdd` runs
    Then `QFAI-STORY-003` is raised at error naming the file, the citing rule or row, and the missing ID
    And nothing but the cited decision's existence is read from `Supersedes` or `Narrows`
  # AC-0001-0053-07
  Scenario: A document that states a term the project lists as stale is reported
    Given the story tree, and `validation.staleTerms` in `qfai.config.yaml` listing a term that a document under `paths.specsDir` or `paths.contractsDir` states
    When `qfai validate --profile sdd` runs
    Then `QFAI-STORY-016` is raised at warning naming the file, the line and the term
    And `decisions.md` and `open-questions.md` are not read
    And with no term listed, nothing is checked
  # AC-0001-0053-08
  Scenario: A decision row whose Approach cell breaks the four-item form is reported
    Given the story tree, and a legacy `decisions.md` row with a four-digit ID above `DEC-2097` whose Approach cell lacks, empties, duplicates or reorders `Evidence:`, `Grounds:`, `Residual risk:` or `Rollback:`, takes `none — <reason>` outside the last two, or holds an Evidence entry that is neither `file:` nor `command:`
    When `qfai validate --profile sdd` runs
    Then `QFAI-STORY-017` is raised at error naming the file, the row ID and the breach
    And labels whose hyphens lie inside closed equal-length backtick spans are literal content, not structural items
    And outside code an odd backslash count escapes only the first backtick, leaving a remaining run available, while an even count leaves the whole run available
    And inside code backslashes are literal, only a complete same-length raw run closes the span, and unmatched openers do not hide later balanced spans
    And original item values remain intact, code-only content is nonempty, quoted labels do not supply missing items, and Evidence prefix checks still apply
    And a row with a timestamp ID is not read for the four items
    And a row up to `DEC-2097` is not read
  # AC-0001-0053-09
  Scenario: Validators read one decision register across its pages
    Given a configured specs directory with a root-only decision register, or a root whose Decision pages list names pages
    When the validators read the register
    Then they read each listed page in list order, then the root Decisions table
    And the root optionally holds one closed Decision pages list of unique direct `- decisions/page-NNNN.md` entries before Decisions
    And each page holds exactly the Decisions heading and one three-column Decisions table, with no nested index
    And every page has at most 500 lines, including comments, headings, list items, blank lines and table lines, while the root has no line ceiling
    And the column, cell-count, ID, keyword, Approach, citation and duplicate-ID checks cover every row with its file and row number
    And stale-term scanning excludes the root and every page
    And a missing or unreadable listed page, a duplicate entry, an unlisted file in the decisions directory, an unsafe or linked path, traversal and a wrong page shape fail without accepting a partial register
    And an oversized page is reported without truncation or an automatic rewrite
  # AC-0001-0053-10
  Scenario: A decision row over the length limit is warned about
    Given the story tree, and a row of the decision register, in the root or on a page and in either ID form, whose Content and Approach together hold more than 600 characters
    When `qfai validate --profile sdd` runs
    Then `QFAI-STORY-020` is raised at warning naming the file, the row and its length
    And a row of 600 characters or fewer raises none
    And the warning does not fail a run under `--fail-on error`
```
