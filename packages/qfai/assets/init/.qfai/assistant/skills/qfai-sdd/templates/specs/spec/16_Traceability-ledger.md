# 16 Traceability Ledger

## Purpose

Link each `BR-*` / `AC-*` to its implementation and test. For an adopted ledger,
`npx qfai validate --profile tdd` and `--profile full` compare each obligation with its merge-base
copy. A changed or new obligation needs an active or explicit planned binding. An unchanged active
implementation needs current, independently reviewed test proof. Missing or ambiguous bindings,
failed proof and an unavailable merge-base fail validation.

This file is **optional**. A spec without it is not invalid — validation emits `QFAI-TRACE-002` at
severity `warning` and skips the integrity check, so `--fail-on error` still passes. Add it to any
spec whose BR/AC you want held to implementation drift.

## Ledger Table (required when this file exists)

The **first** Markdown table holds active bindings. Further tables cannot add active bindings.
The first table's header must have at least three columns, including `Implementation File`. Its
first cell holds one `BR-NNNN` or `AC-NNNN` ID; its second holds one repository-root-relative
implementation path. The optional fifth `Proof` column holds one `TDD-NNNN` ID or `-`.

| BR/AC   | Implementation File       | Test File                             | Notes   | Proof    |
| ------- | ------------------------- | ------------------------------------- | ------- | -------- |
| AC-0001 | src/<module>/<file>.<ext> | tests/integration/<spec>/<file>.<ext> | <notes> | -        |
| BR-0001 | src/<module>/<file>.<ext> | tests/unit/<spec>/<file>.<ext>        | <notes> | TDD-0001 |

### Column rules

- `BR/AC` — one ID defined in this spec. A changed or new ID must have an active row or an explicit
  Planned bindings entry. Do not repeat an ID-and-path pair; distinct paths for one ID use separate
  rows.
- `Implementation File` — one repository-root-relative path, no globs, no `./` prefix. This is the
  path compared with the merge-base branch diff. A removed path cannot satisfy an active row.
- `Test File` — the test that proves the row. A `Proof` reference must resolve to this same file.
- `Proof` — use one TDD ID only when the obligation changed but this active implementation did not.
  The matching TDD row and current ATDD evidence must agree on test file, selector, TC and BR/AC
  references; `Satisfied-by` must name this path. The evidence must match the restored source
  SHA-256 and current RED test manifest/hash, record a passing GREEN run, and carry an independent
  `qa-gatekeeper` PASS. One TDD result may support several obligations if its TC/BR/AC chain matches
  each one. RED and GREEN commands must filter the project's runner to this selector or TDD ID; the
  results and independent review must verify that same selection. The static check accepts the ATDD
  scanner's file-level runnable TC annotation across supported languages. The live reviewer checks
  the selected test's predicate, which a file-level annotation cannot establish. The validator
  checks the record; CI executes the test. A written `PASS` is insufficient.
- Other trailing columns are ignored.

### One obligation per row

Write one row per `BR`/`AC` ↔ implementation-file pair. If one `AC-*` is realized by three files,
write three rows with the same `AC` ID. A row naming several files in one cell will not match.

### Planned bindings

Declare future paths separately. They do not count as active implementations or proof. The
validator reads this table only to check that a changed or new obligation has an explicit binding;
promote a row to the first table when its implementation file is created or first edited for that
obligation. An existing file left unchanged may remain planned until that edit. Set `State today`
to `present` or `absent` after checking the path in the current tree.

| Implementation File       | State today | BR / AC it will realize | Test File (planned)                 | Promotion trigger           |
| ------------------------- | ----------- | ----------------------- | ----------------------------------- | --------------------------- |
| src/<module>/<next>.<ext> | absent      | BR-0002                 | tests/unit/<spec>/<next>.test.<ext> | File creation or first edit |

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
