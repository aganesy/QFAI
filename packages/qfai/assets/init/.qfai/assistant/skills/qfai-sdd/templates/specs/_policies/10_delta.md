# 10 Delta

## Change Summary

- 0 items in shared delta.

## Triage

> Cross-spec or policy-level triage rows. Use this section when a single
> requirement spans multiple specs (SPLIT / MERGE / SUPERSEDE) or when a
> policy file (`_policies/**`) itself changes. Per-spec triage rows
> belong in `<spec>/09_delta.md`.

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
     `constitution/drift-protocol.md#when-drift-is-detected` step 4. One row per
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
