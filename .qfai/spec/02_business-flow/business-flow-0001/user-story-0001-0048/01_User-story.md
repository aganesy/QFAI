# US-0001-0048: Prompt-scanner drift justification

## User Story

As a Reviewer-Gate consumer, I want `qfai validate` to reject an `R-PROMPT-SCANNER-DRIFT` finding whose `justification:` is empty, as it does for `R-REJECTED-READOPT`, so that every drift finding names the modified file, the missing counterpart and the unmatched contract clause.
