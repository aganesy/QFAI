# 10 Delta

<!-- Multi-run layout. `/qfai-sdd` is re-run against the same tree, so this
     file grows. Keep exactly one H2 per section for the file's lifetime and
     append inside it. Never open a second `## Change Summary` / `## Triage`
     H2 (dated variants such as `## Triage — 2026-01-01` included): the
     `QFAI-TRIAGE-*` checks read the first `## Triage` heading only, so rows
     parked under a duplicate heading are never validated. -->

## Change Summary

> One entry per `/qfai-sdd` run that touches shared scope, appended in run
> order. Do not open a second `## Change Summary`.

- 0 items in shared delta.

## Triage

> Cross-spec or policy-level triage rows. Use this section when a single
> requirement spans multiple specs (SPLIT / MERGE / SUPERSEDE) or when a
> policy file (`_policies/**`) itself changes. Per-spec triage rows
> belong in `<spec>/09_delta.md`.
> One `### DELTA-NNNN (YYYY-MM-DD)` sub-section per run; a re-run appends a new
> sub-section under this heading and never opens a second `## Triage` H2.

### DELTA-0001 (YYYY-MM-DD)

| Source   | Subject     | Existing Spec       | Operation | Sub-op | Approved By | Rationale |
| -------- | ----------- | ------------------- | --------- | ------ | ----------- | --------- |
| REQ-XXXX | <one-liner> | spec-AAAA+spec-BBBB | MERGE     | -      | <approver>  | <why>     |

<!-- Cross-spec ops (SPLIT / MERGE / SUPERSEDE) are approval-required;
     `Approved By` MUST be a real approver, not `-`, or QFAI-TRIAGE-005
     fails. The example above shows MERGE; UPDATE:APPEND, UPDATE:MODIFY,
     CREATE, DELETE, etc. are equally valid Operations for cross-spec or
     policy-only rows. -->

## Empty State

- Add shared-scope decisions only when a cross-spec change requires tracking.
