# SDD Execution Playbook

Use this file for the detailed sequencing rules behind `/qfai-sdd`.

## Stage order

1. **Stage 0 - Preflight** (discussion-pack completeness)
2. **Stage 1 - Triage** (operation classification, see `sdd-triage.md`)
3. **Phase 0 - Contracts-first**
4. **Phase 1 - Outline**
5. **Phase 2 - Slice** (per spec)
6. **Phase 2b - Seed `tdd/test-list.md`** (per spec)
7. **Phase 2c - Obligation reconciliation** (per spec)
8. **Phase 3 - Plan finalize** (per spec)
9. **Phase 4 - Delta update** (per spec)

## Stage 0: Preflight

1. Identify the latest discussion-pack.
2. Stop if required files are missing.
3. Stop if blocking OQ remain.
4. Stop if the latest UI-bearing pack is missing valid `prototyping.yaml`.

### Import-lite entrypoint (no discussion-pack at all)

Steps 1-2 assume a pack exists. When the project has **no** discussion-pack
whatsoever and specs already exist, do not stop — record the input source
instead and continue:

1. Write `.qfai/evidence/import-lite-<17-digit timestamp>.md` from
   `templates/evidence/import-lite.md` before editing any spec. `import-lite.md`
   without a stamp is also accepted; any other suffix is not.
2. Fill `generated_at` with an ISO8601 datetime, plus at least one real
   `Sources` entry or user excerpt. `<...>` placeholders and fillers (`TBD`,
   `none.`, `n/a`) are rejected, and an unclosed excerpt fence with them.
3. Select that file as the input source and report it in
   `.qfai/report/preflight_summary.md` as `source: import-lite`.

A pack that exists under a non-canonical name is not an absent pack: rename it
rather than falling back here. Validator: `QFAI-IMPLITE-001`.

## Stage 1: Triage

1. Enumerate active spec summaries (skip `superseded` / `deprecated` / `removed`).
2. Classify each REQ/NFR **append-first** using `_policies/11_Slice-Policy.md`
   (8 ops). Default to UPDATE on the closest active spec; CREATE only
   when no active spec shares any subject token AND a new `CAP-NNNN` is
   added to `_policies/03_Capabilities.md`.
3. Walk the impact cascade: for every primary classification, scan the
   remaining active specs and emit companion `UPDATE:MODIFY` /
   `UPDATE:REMOVE` rows wherever existing AC/BR reference the changed
   concept. The same `Source` ID may legitimately appear on multiple rows.
4. Obtain AskUserQuestion approval for CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE rows.
5. Persist the Triage table in `<spec>/09_delta.md` (per-spec) or `_policies/10_delta.md` (cross-spec / policy).
6. Stop entry to Phase 0 until every approval-required row has an
   approver recorded and every CREATE row cites a registered CAP
   (validator `QFAI-TRIAGE-006`).

Detailed procedure: `sdd-triage.md`.

## Shared-before-Slice Rule

- Contracts-first and Outline are shared work.
- Slice, Plan, and Delta are target-spec work.
- In no-argument mode, shared work runs once and per-spec work fans out after shared outputs stabilize.

## Stop Conditions

- Missing or stale `_policies/11_Slice-Policy.md`
- Missing Contract Index alignment
- Unresolvable preflight blockers
- Triage rows requiring approval but lacking `Approved By`
- Validate errors that point to unresolved source-layer gaps
