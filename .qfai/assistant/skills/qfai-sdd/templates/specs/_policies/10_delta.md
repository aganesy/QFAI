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

- Add a shared-scope row only when the change is not owned by one spec: it is
  cross-spec, or its subject belongs to no spec at all (a contract no spec
  references). A change one spec owns is tracked in that spec's `09_delta.md`.

## Change Requests

<!-- The canonical CR-reference record required by
     `.qfai/assistant/constitution/drift-protocol.md#when-drift-is-detected` step 4. One row per
     approved Change Request whose owner-skill rerun landed in this layer. The
     rerun writes it in Phase 4, never before approval. `Mode` is the rerun mode
     the CR approved (`confirm-only` or `re-derive`); `Applied at` matches the
     CR's own `Applied at`. A CR that also mints or amends a `DR-*` additionally
     cites its ID in that record's `Related` field in `08_Decisions.md`. Do not
     record a CR as a `## Triage` row: Triage rows carry incoming REQ/NFR
     operations, and only this table is the CR reference. -->

| CR ID            | Upstream artifact              | Mode         | Approved by  | Applied at           |
| ---------------- | ------------------------------ | ------------ | ------------ | -------------------- |
| CR-YYYYMMDD-NNNN | `_policies/03_Capabilities.md` | confirm-only | `<approver>` | YYYY-MM-DDThh:mm:ssZ |

- 0 approved Change Requests recorded. Delete the sample row above once the
  first real one lands.
