# SDD Execution Playbook

Use this file for the detailed sequencing rules behind `/qfai-sdd`.

## Stage order

1. **Stage 0 - Preflight** (discussion-pack completeness)
2. **Stage 1 - Triage** (operation classification, see `sdd-triage.md`)
3. **Phase 0 - Contracts-first**
4. **Phase 1 - Outline**
5. **Phase 2 - Slice** (per spec)
6. **Phase 3 - Plan finalize** (per spec)
7. **Phase 4 - Delta update** (per spec)

## Stage 0: Preflight

1. Identify the latest discussion-pack.
2. Stop if required files are missing.
3. Stop if blocking OQ remain.
4. Stop if the latest UI-bearing pack is missing valid `prototyping.yaml`.

## Stage 1: Triage

1. Enumerate active spec summaries (skip `superseded` / `deprecated` / `removed`).
2. Classify each REQ/NFR using `_policies/11_Slice-Policy.md` (8 ops).
3. Obtain AskUserQuestion approval for CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE rows.
4. Persist the Triage table in `<spec>/09_delta.md` (per-spec) or `_policies/10_delta.md` (cross-spec / policy).
5. Stop entry to Phase 0 until every approval-required row has an approver recorded.

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
