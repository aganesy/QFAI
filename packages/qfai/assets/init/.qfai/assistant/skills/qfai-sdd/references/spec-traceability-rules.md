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
  - `BR-0001` -> `Contract-Refs` in `04_Business-Rules.md` (comma-separated
    `CON-*` IDs; `-` when the rule binds no contract). Contract IDs recorded
    only in `Notes` are untraced.
  - `EX-0001` -> `BR-Ref` in `05_Examples.md`
  - `TC-0001` -> `EX-Ref` and `AC-Refs` in `06_Test-Cases.md`
- `_policies/**` must not contain spec-local lower-layer IDs — the 4-digit forms
  `US-NNNN` / `AC-NNNN` / `BR-NNNN` / `EX-NNNN` / `TC-NNNN` — or per-spec references.
  This is exactly what `TRACE_SHARED_SCOPE_VIOLATION` enforces.
- Discussion-layer IDs (`DUS-001`, `DAC-001-01`, `DTC-1`, `DSC-001`) are a different
  namespace and are explicitly allowed in `_policies/**` and in `Source` fields. They are
  how provenance back to the discussion pack stays machine-checkable; do not rewrite them
  into prose to satisfy the rule above.
- A `Source` value is always the pair `<pack-id>#<discussion-id>`, e.g.
  `discussion-20260415101112123#DUS-001`. The pack half is not optional: pack IDs are the
  only thing that makes a discussion ID unique, because every pack restarts its numbering at
  `DUS-001` / `DAC-001-01`. A spec that two packs have updated therefore carries two `Source`
  values that differ only in the pack half.
- `Source` is recorded once per item, in the required artifact: the `- Source:` line of each
  `## US-NNNN` block in `02_User-stories.md`, and the `# Source:` comment inside each AC's
  Gherkin block in `03_Acceptance-Criteria.md`. The optional `AC Catalog` table carries no
  `Source` column, so there is no second copy to drift.

## TDD Execution Ledger

Each `.qfai/specs/<spec-id>/tdd/test-list.md` is the execution ledger for the TDD micro-cycle.

- Required columns: TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence
- `Selector` may hold one entry, a comma-separated list, or a glob pattern. It is not limited to a single test function.
- `TC-Refs` is many-to-many with `TDD-ID`: one `TC-*` may be decomposed across several TDD rows, and each of those rows carries that `TC-*`.
- A matrix-shaped `TC-*` (many rejection reasons, a status-code matrix, several independent state transitions) MUST be split across multiple TDD rows before RED begins — one falsifying oracle per row, one row per independently observable boundary. Do not accumulate unrelated boundaries behind a single selector; doing so invalidates the RED observation, because only the first failing assert is ever observed.
- Coverage is measured as unit/component TC references from `06_Test-Cases.md`
  appearing in TC-Refs. That measures which TCs need a `tdd/test-list.md` row;
  it says nothing about where the test file lives. Every `TC-*` — including
  unit/component ones — is still discharged in `tests/integration/**` for
  `QFAI-ATDD-112` until the scanner supports the per-level routing described as
  a target state in `catalog/test-layers.md`.
- If `06_Test-Cases.md` has no test-case classification column, every TC is treated as a coverage target.
- `Status=exception` requires a non-empty DR-ID. An `exception` row is not a
  dead end: a Drift Protocol sweep may reset it to `todo` like any other status
  when the rerun changed the obligation it was raised against.
- `Status` in `green`, `refactor`, or `done` requires an existing Test file
  resolved from project root. The upstream reset does not relax this: a swept
  row returns to `todo`, where no file is required, and writes its test in the
  following `red` phase.
- `DR-ID` carries the approval that authorised an upstream reset, not only
  `Status = exception`. A row reset by a Drift Protocol sweep records the
  approved `CR-*` / `DR-*` ID there and **retains it through `red`, `green`,
  `refactor` and `done`** — the ledger is the audit trail for why a completed
  row was reopened.
- `Layer` must be consistent with `Test file`: an `Integration` row may not
  point into `tests/e2e/**` or `tests/api/**`, and vice versa.
- More than one `TDD-*` row MAY reference the same `TC-*` — a TC split across
  several test modules is legitimate. `TDD-ID` uniqueness is the only
  identity constraint.
- `TDD-ID` must match `TDD-NNNN` and be unique within the spec.
- Missing `tdd/test-list.md` is a warning; missing DR-ID/Evidence columns is an error.

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
