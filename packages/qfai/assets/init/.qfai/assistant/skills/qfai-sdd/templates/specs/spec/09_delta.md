# 09 Delta

<!-- Multi-run layout. `/qfai-sdd` is re-run against the same spec, so this
     file grows. Keep exactly one H2 per section for the file's lifetime and
     append inside it. Never open a second `## Change Summary` / `## Triage`
     H2 (dated variants such as `## Triage — 2026-01-01` included): the
     `QFAI-TRIAGE-*` checks read the first `## Triage` heading only, so rows
     parked under a duplicate heading are never validated. -->

## Change Summary

> One entry per `/qfai-sdd` run, appended in run order. Do not replace the
> previous entry and do not open a second `## Change Summary`.

- Change ID: DELTA-0001
- Date: YYYY-MM-DD
- Primary:
- Tags:
- Summary: <what changed>

<!-- A second run appends another five-line entry here (`- Change ID: DELTA-0002`, ...). -->

## Triage

> Stage 1 Triage SSOT for this spec. One row per incoming REQ/NFR.
> One `### DELTA-NNNN (YYYY-MM-DD)` sub-section per run; a re-run appends a new
> sub-section under this heading and never opens a second `## Triage` H2.
> See `references/sdd-triage.md` for the operation algorithm.
> Operation: CREATE | UPDATE | DELETE | SPLIT | MERGE | SUPERSEDE.
> Sub-op (UPDATE only): APPEND | MODIFY | REMOVE.
> Approved By: required for CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE.
> Existing Spec takes a REAL target, never a placeholder: `spec-NNNN` (`+`-joined for
> MERGE), `_policies` on an UPDATE row, or `-` on a CREATE row. `QFAI-TRIAGE-009`
> grades the whole cell, so an unfilled one fails the gate rather than being ignored.

### DELTA-0001 (YYYY-MM-DD)

| Source   | Subject     | Existing Spec | Operation | Sub-op | Approved By | Rationale |
| -------- | ----------- | ------------- | --------- | ------ | ----------- | --------- |
| REQ-XXXX | <one-liner> | spec-0001     | UPDATE    | APPEND | -           | <why>     |

## Rationale

- <why this change is needed>

## Candidates Considered

1. <candidate A>
2. <candidate B>

## Adopted

- Adopted: <candidate name>
- Why: <reason>
- Evidence: <file or decision reference>

## Rejected

- Candidate: <candidate name>
- Reason: <why rejected>
- DO NOT: <must not reintroduce>
- Temptation: <why people may accidentally choose it again>

## Impact

- Affects: <files / modules / contracts>
- Validation: <what must pass>

## Follow-ups

- <next action>
- Owner: <owner>
- Due: YYYY-MM-DD
