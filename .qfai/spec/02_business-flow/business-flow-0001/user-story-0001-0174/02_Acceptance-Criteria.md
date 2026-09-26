# Acceptance Criteria

## Criteria

```gherkin
Feature: Reviewer-Gate `R-PROMPT-SCANNER-DRIFT` emission with mandatory `justification:`

# AC-0001-0174-01
# Parent: US-0001-0174
Scenario: Reviewer-Gate emits `R-PROMPT-SCANNER-DRIFT` with non-empty `justification:`
  Given the upstream SSOT-sync-pair CI lane (owned by spec-0004) flags drift between `findDesignMdViolations.ts` and `generator-prompt.md` on a PR,
  When the Reviewer Gate processes that signal,
  Then it emits `R-PROMPT-SCANNER-DRIFT` at severity error with a non-empty `justification:` text naming (a) the modified file path, (b) the un-paired counterpart path, (c) the specific contract clause whose match cannot be confirmed. Empty / whitespace-only / missing `justification:` MUST be treated by spec-0004's validate ingestion as an advisory-failing error (mirror of the `R-REJECTED-READOPT` pattern).
```
