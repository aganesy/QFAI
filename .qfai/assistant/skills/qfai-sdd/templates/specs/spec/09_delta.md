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

## Impact

- Affects: <files / modules / contracts>
- Validation: <what must pass>

## Follow-ups

- <next action>
- Owner: <owner>
- Due: YYYY-MM-DD

## Change Requests

<!-- The canonical CR-reference record required by
     `constitution/drift-protocol.md#when-drift-is-detected` step 4. One row per
     approved Change Request whose owner-skill rerun landed in this spec. The
     rerun writes it in Phase 4, never before approval. `Mode` is the rerun mode
     the CR approved (`confirm-only` or `re-derive`); `Applied at` matches the
     CR's own `Applied at`. A CR that also mints or amends a `DR-*` additionally
     cites its ID in that record's `Related` field in `07_Decisions.md`. Do not
     record a CR as a `## Triage` row: Triage rows carry incoming REQ/NFR
     operations, and only this table is the CR reference. -->

| CR ID            | Upstream artifact                  | Mode         | Approved by  | Applied at           |
| ---------------- | ---------------------------------- | ------------ | ------------ | -------------------- |
| CR-YYYYMMDD-NNNN | `<spec-NNNN>/04_Business-Rules.md` | confirm-only | `<approver>` | YYYY-MM-DDThh:mm:ssZ |

- 0 approved Change Requests recorded. Delete the sample row above once the
  first real one lands.
