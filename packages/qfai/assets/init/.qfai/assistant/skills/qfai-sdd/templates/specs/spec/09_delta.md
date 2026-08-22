# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: YYYY-MM-DD
- Primary:
- Tags:
- Summary: <what changed>

## Triage

> Stage 1 Triage SSOT for this spec. One row per incoming REQ/NFR.
> See `references/sdd-triage.md` for the operation algorithm.
> Operation: CREATE | UPDATE | DELETE | SPLIT | MERGE | SUPERSEDE.
> Sub-op (UPDATE only): APPEND | MODIFY | REMOVE.
> Approved By: required for CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE.

| Source   | Subject     | Existing Spec | Operation | Sub-op | Approved By | Rationale |
| -------- | ----------- | ------------- | --------- | ------ | ----------- | --------- |
| REQ-XXXX | <one-liner> | <spec-NNNN>   | UPDATE    | APPEND | -           | <why>     |

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
- Re-opened by: `-` <!-- the `Status: re-open` DR-* in 07_Decisions.md that re-adopted this candidate; stays `-` while the rejection holds -->

<!--
`Re-opened by:` is the only sanctioned route out of `DO NOT`. Moving a rejected
candidate to `## Adopted` without it is the reintroduction the Delta Rejected
Guard blocks; `npx qfai validate` reports `QFAI-DECISION-006` when a
`- Candidate:` here also appears as an `- Adopted:` name while its own
`Re-opened by:` is empty, and `QFAI-DECISION-004` when the ID here resolves to
no `Status: re-open` record — and equally when such a record names no candidate
here. One `Re-opened by:` covers the candidate block it sits under, so a delta
re-adopting two candidates writes one per candidate.
-->

## Impact

- Affects: <files / modules / contracts>
- Validation: <what must pass>

## Follow-ups

- <next action>
- Owner: <owner>
- Due: YYYY-MM-DD
