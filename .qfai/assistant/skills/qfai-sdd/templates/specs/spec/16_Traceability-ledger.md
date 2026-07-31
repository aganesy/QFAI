# 16 Traceability Ledger

## Purpose

Link each `BR-*` / `AC-*` in this spec to the implementation file that realizes it and the test file
that proves it. `qfai validate` reads this file to enforce **implementation integrity**: when a
spec's `03_Acceptance-Criteria.md` or `04_Business-Rules.md` changes on a branch, every
implementation file linked from a changed spec must also have changed in that branch, otherwise
`QFAI-TRACE-001` (severity `error`) fires.

This file is **optional**. A spec without it is not invalid — validation emits `QFAI-TRACE-002` at
severity `warning` and skips the integrity check, so `--fail-on error` still passes. Add it to any
spec whose BR/AC you want held to implementation drift.

## Ledger Table (required when this file exists)

The **first** Markdown table in this file is the one the validator reads, and the only one: any
further table in this document is prose, never a ledger row, even if its first cell looks like a
`BR`/`AC` ID. Its header must have at least three columns and one of them must be named
`Implementation File`. Each data row's first cell must be a `BR-NNNN` or `AC-NNNN` ID, and the
second cell must be a repository-root-relative path to the implementation file.

| BR/AC   | Implementation File       | Test File                             | Notes   |
| ------- | ------------------------- | ------------------------------------- | ------- |
| AC-0001 | src/<module>/<file>.<ext> | tests/integration/<spec>/<file>.<ext> | <notes> |
| BR-0001 | src/<module>/<file>.<ext> | tests/unit/<spec>/<file>.<ext>        | <notes> |

### Column rules

- `BR/AC` — a single `BR-NNNN` or `AC-NNNN` ID defined in this spec. Rows whose first cell does not
  match that shape are ignored by the validator; use them for grouping headings if you like.
- `Implementation File` — one repository-root-relative path, no globs, no `./` prefix. This is the
  path compared against `git diff --name-only <baseBranch>..HEAD`.
- `Test File` — the test that proves the row. Not machine-checked here; TC-level coverage is
  enforced separately from `06_Test-Cases.md` and `tdd/test-list.md`.
- Extra trailing columns are allowed and ignored.

### One obligation per row

Write one row per `BR`/`AC` ↔ implementation-file pair. If one `AC-*` is realized by three files,
write three rows with the same `AC` ID. A row naming several files in one cell will not match.

## Authoring and maintenance

- Authored and refreshed by `/qfai-sdd` alongside `03_Acceptance-Criteria.md` and
  `04_Business-Rules.md`. It is upstream SSOT — downstream skills must not edit it directly (see
  `.qfai/assistant/constitution/drift-protocol.md`).
- Whenever a `BR`/`AC` is added, removed, or renumbered, update this ledger in the same change.
- If a linked implementation file is renamed or moved, update the path here in the same commit, or
  `QFAI-TRACE-001` will report the old path as unmodified.

## Not the same as the spec-pack ledger

Legacy 18-file **spec-pack** layouts also carry a `16_Traceability-ledger.md`, but with a different
schema (`trace_id, obj_id, init_id, cap_id, flow_id, us_id, ac_id, ex_ids, tc_ids`) checked by
`QFAI-LEDGER-001` / `E_LEDGER_MISSING_COLUMN`. That check runs **only** on `spec-pack` layouts; this
template is for the layered layout and is read only by the implementation-integrity check. Do not
merge the two schemas into one table.
