# Change Request

- ID: `CR-20260924-0002`
- Title: `work-log removal updates its upstream contracts and decisions`
- Raised by: `qfai-implement`
- Raised at: `2026-09-24`
- Class: `intent`
- Status: `approved`
- Approved by: `Codex` under the user's instruction to complete and merge the work-log removal; this is an implementation scope decision, not a new product decision
- Approved at: `2026-09-24`
- Approved option: `1`
- Applied at: `2026-09-24`
- Superseded by: `-`

## Context

`DR-0296` accepts removal of the AI work-log surface. The implementation
updates the CLI contracts and per-spec decisions that still describe that
surface. The upstream SSOT guard requires an approved change record that names
each changed upstream path. The existing records do not name these four paths.

## Proposed change

Record these four upstream edits as part of the accepted removal. The CLI
contract ceases to promise work-log validation. The work-log entry schema is
retained only as historical context. The two per-spec decisions no longer
present the removed surface as active behavior.

## Impact scope

- `.qfai/contracts/cli/qfai-validate.md`
- `.qfai/contracts/cli/worklog-entry.schema.md`
- `.qfai/specs/spec-0011/07_Decisions.md`
- `.qfai/specs/spec-0013/07_Decisions.md`

## Resolution

The accepted `DR-0296` remains the product decision. These edits bring its
upstream descriptions into agreement with the shipped behavior. No new work-log
surface or replacement is introduced.
