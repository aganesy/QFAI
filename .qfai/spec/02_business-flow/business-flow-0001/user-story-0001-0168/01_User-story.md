# US-0001-0168: Reviewer-Gate `R-PROMPT-SCANNER-DRIFT` emission with mandatory `justification:`

## User Story

As a Reviewer-Gate consumer, I want the Reviewer Gate to emit `R-PROMPT-SCANNER-DRIFT` at severity error with a non-empty `justification:` naming the modified file, the unpaired counterpart and the unmatched contract clause whenever the SSOT-sync-pair CI lane flags drift between `findDesignMdViolations.ts` and `generator-prompt.md`, so that `qfai validate` ingestion can reject a finding whose justification is empty.
