# Spec Traceability Rules

Use this file when working on traceability-heavy parts of `/qfai-sdd`.

## Required Layered Layout

`qfai validate` treats specs as a layered package:

- Shared policies: `.qfai/specs/_policies/**`
- Capability specs: `.qfai/specs/spec-*/**`

Required shared files:

- `01_Objective.md`
- `02_Initiative.md`
- `03_Capabilities.md`
- `04_Business-Flow.md` (Markdown with Mermaid `flowchart` or `sequenceDiagram`)
- `05_Contracts.md`
- `06_Glossary.md`
- `07_Constraints.md`
- `08_Decisions.md`
- `09_Open-questions.md`
- `10_delta.md`
- `11_Slice-Policy.md`

Required per-spec files:

- `01_Spec.md`
- `02_User-stories.md`
- `03_Acceptance-Criteria.md`
- `04_Business-Rules.md`
- `05_Examples.md`
- `06_Test-Cases.md`
- `07_Decisions.md`
- `08_Open-questions.md`
- `09_delta.md` or another `*_delta.md`
- `10_Plan.md` (How-only)

`/qfai-sdd` must create or refresh `_policies/11_Slice-Policy.md` before deciding CREATE / UPDATE / DELETE. The approved default slice model is `1 CAP = 1 spec directory`.

## Required Edge Model (Conceptual Decomposition)

Conceptual decomposition / realization hierarchy (how specs are _authored_, not how
IDs reference each other):

- `US` conceptually decomposes into `AC`
- `AC` conceptually decomposes into `BR`
- `BR` is conceptually concretized by `EX`
- `EX` is conceptually realized by `TC`

## Reference Direction (`Refs` ID fields)

ID reference direction (the value of `Refs:` columns) must be lower-to-upper only:

- Upper-to-lower ID references are forbidden (`US.Refs: AC-0001` is not allowed).
- Lower-to-upper ID references are allowed (`AC.Refs: US-0001` is the canonical form).
- The conceptual hierarchy above describes authoring direction; the `Refs` direction
  is the _inverse_ so downstream specs cite upstream IDs, never the other way round.

## Execution Consumer View

- Primary execution SSOT is `.qfai/specs/<spec-id>/01_Spec.md`.
- Execution skills must not read `_policies/**` by default.
- Read `_policies/**` only when `01_Spec.md` explicitly triggers the Escalation Hook.
- `01_Spec.md` must copy down applicable NFR, policy, requirement, and evidence summaries needed by implementers.

## ID and Parent Rules

- Shared capabilities are defined in `_policies/03_Capabilities.md`.
- `01_Spec.md` must include `Parent: CAP-0001` or the matching CAP ID.
- Item IDs are file-local and parent-driven:
  - `US-0001` -> Parent: `CAP-0001`
  - `AC-0001` -> defined in `03_Acceptance-Criteria.md`
  - `BR-0001` -> `AC-Refs` in `04_Business-Rules.md`
  - `EX-0001` -> `BR-Ref` in `05_Examples.md`
  - `TC-0001` -> `EX-Ref` and `AC-Refs` in `06_Test-Cases.md`
- `_policies/**` must not contain lower-layer IDs (`US/AC/BR/EX/TC`) or per-spec references.

## TDD Execution Ledger

Each `.qfai/specs/<spec-id>/tdd/test-list.md` is the execution ledger for the TDD micro-cycle.

- Required columns: TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence
- Coverage is measured as unit/component TC references from `06_Test-Cases.md` appearing in TC-Refs.
- If `06_Test-Cases.md` has no test-case classification column, every TC is treated as a coverage target.
- `Status=exception` requires a non-empty DR-ID.
- `Status` in `green`, `refactor`, or `done` requires an existing Test file resolved from project root.
- `TDD-ID` must match `TDD-NNNN` and be unique within the spec.
- Missing `tdd/test-list.md` is a warning; missing DR-ID/Evidence columns is an error.

## Traceability Ledger (`16_Traceability-ledger.md`)

Optional per-spec artifact linking `BR-*` / `AC-*` to the implementation file that realizes them.
Template: `templates/specs/spec/16_Traceability-ledger.md`.

- It is **optional**. Without it `qfai validate` emits `QFAI-TRACE-002` (`warning`) and skips the
  implementation-integrity check; the spec is still valid.
- With it, `QFAI-TRACE-001` (`error`) fires when a spec's `03_Acceptance-Criteria.md` or
  `04_Business-Rules.md` changed on the branch but a linked implementation file did not.
- Schema for the **layered** layout — the first Markdown table is the one read; header needs ≥3
  columns, one named `Implementation File`:

  | BR/AC   | Implementation File | Test File     |
  | ------- | ------------------- | ------------- |
  | AC-0001 | src/…               | tests/…       |

  First cell must be a `BR-NNNN` / `AC-NNNN` ID; second cell one repo-root-relative path (no globs,
  no `./`). One row per BR/AC ↔ file pair. Extra trailing columns are ignored.
- The legacy **spec-pack** layout uses the same filename with a different schema
  (`trace_id, obj_id, init_id, cap_id, flow_id, us_id, ac_id, ex_ids, tc_ids`, checked by
  `QFAI-LEDGER-001`). That check runs only on spec-pack layouts — the two schemas never apply to the
  same file. Do not merge them.
- Authored and refreshed by `/qfai-sdd` in the same change as the BR/AC it links. It is upstream
  SSOT; downstream skills must not edit it.

## Depth Expectations

- `BR` captures decision-level rules.
- `EX` demonstrates how `BR` behaves.
- `TC` proves `EX` in executable terms.

## When Sparse Coverage Is Intentional

- State the reason explicitly.
- Record the mitigation or next step in open questions or delta.

## Artifact Hygiene

- `specs/` is definition-only; keep runtime status under `.qfai/report/run-*/`.
- Do not keep state markers such as `release_candidate`, `Status`, `Progress`, or runtime `Risk` sections in spec files.
- Use Mermaid fences only for diagrams.
- Required decision/open-question/delta files must exist even when empty; write `0 items` or equivalent.
- Contracts SSOT remains `.qfai/contracts/**`; reports are derived outputs.
