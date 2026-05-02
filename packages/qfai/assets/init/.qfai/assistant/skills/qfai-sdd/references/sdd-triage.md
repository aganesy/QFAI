# Stage 1 Triage Procedure

Stage 1 sits between preflight (Stage 0) and Phase 0 (Contracts-first).
Its goal is to decide, **before any spec edit begins**, what operation
each incoming requirement implies on the existing specs.

## Operation set (8 first-class)

| Operation        | Sub-op | When to choose                                                        | Approval |
| ---------------- | ------ | --------------------------------------------------------------------- | -------- |
| CREATE           | -      | New subject; no active spec owns the capability                       | Required |
| UPDATE           | APPEND | Add new US/AC/BR/EX/TC to an active spec (no semantic change)         | -        |
| UPDATE           | MODIFY | Change the meaning of an existing US/AC/BR/EX/TC                      | -        |
| UPDATE           | REMOVE | Delete an existing US/AC/BR/EX/TC (cuts downstream refs)              | Required |
| DELETE           | -      | Subject was removed from the product; the spec itself goes away       | Required |
| SPLIT            | -      | One spec carries >1 capability; split into N specs                    | Required |
| MERGE            | -      | Multiple specs converge on one capability; collapse them              | Required |
| SUPERSEDE        | -      | Responsibilities move to a new spec; flip status, keep history        | Required |

## Inputs

1. Latest discussion-pack `06_REQ.md` / `07_NFR.md` / `99_delta.md`.
2. `_policies/03_Capabilities.md` (CAP catalog).
3. `_policies/11_Slice-Policy.md` (operation rules + size thresholds).
4. Active spec summaries from `01_Spec.md` headers across `.qfai/specs/spec-*`.

## Procedure

1. **Enumerate active specs.** Skip specs whose `Status:` is
   `superseded`, `deprecated`, or `removed`.
2. **List incoming REQs/NFRs.** One row per requirement, capability tag
   if known.
3. **Classify each row** using the algorithm in
   `_policies/11_Slice-Policy.md` (APPEND vs CREATE, SPLIT thresholds,
   MERGE detection).
4. **Approval pass.** For every row whose Operation requires approval
   (CREATE, DELETE, SPLIT, MERGE, SUPERSEDE) or whose Sub-op is REMOVE,
   present an AskUserQuestion with the proposed operation. Record the
   approver in the `Approved By` column.
5. **Persist.** Write the Triage table into:
   - `<spec>/09_delta.md` for rows that touch a single spec, and
   - `_policies/10_delta.md` for cross-spec rows (SPLIT / MERGE /
     SUPERSEDE) and policy-only changes.
6. **Stop.** Do not enter Phase 0 until every required-approval row has
   an approver recorded.

## Triage table format

```markdown
## Triage

| Source   | Subject       | Existing Spec | Operation | Sub-op | Approved By | Rationale |
|----------|---------------|---------------|-----------|--------|-------------|-----------|
| REQ-XXXX | <one-liner>   | spec-NNNN     | UPDATE    | APPEND | -           | <why>     |
```

Required columns: `Source`, `Subject`, `Existing Spec`, `Operation`.
Conditional: `Sub-op` (UPDATE only), `Approved By` (approval-required
ops), `Rationale` (recommended for every row).

## Validators

- `QFAI-TRIAGE-001` (warning): delta.md has `## Change Summary` but no
  `## Triage` section.
- `QFAI-TRIAGE-002` (error): table is missing or required columns are
  absent.
- `QFAI-TRIAGE-003` (error): Operation is not one of the 8 ops.
- `QFAI-TRIAGE-004` (error): UPDATE row without a valid Sub-op
  (APPEND / MODIFY / REMOVE).
- `QFAI-TRIAGE-005` (error): approval-required Operation has no
  `Approved By` value.

## Status field interaction

- SUPERSEDE rewrites the source spec's `01_Spec.md` to
  `Status: superseded` and sets `Superseded-by: spec-NNNN`.
- DELETE removes the spec directory entirely (record reason in delta).
- Deprecated specs require `Deprecated-at: YYYY-MM-DD`.
- Triage classification ignores non-active specs.
