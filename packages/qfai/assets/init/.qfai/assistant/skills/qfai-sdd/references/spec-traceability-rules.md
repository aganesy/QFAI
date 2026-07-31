# Spec Traceability Rules

Use this file when working on traceability-heavy parts of `/qfai-sdd`.

## Required Layered Layout

`npx qfai validate` treats specs as a layered package:

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
- `_policies/**` must not **define or own** lower-layer items. Concretely: no
  traceability edge in `_policies/**` may name a lower-layer ID — no `Parent:`,
  `Refs:`, `AC-Refs`, `BR-Ref` or `EX-Ref` value, and no heading that declares a
  `US/AC/BR/EX/TC` item.
- **How this is enforced today is broader than that intent.** `QFAI-LAYER-100`
  and `TRACE_SHARED_SCOPE_VIOLATION` are a token scan: they match any
  `US/AC/BR/EX/TC-NNNN` anywhere in a `_policies/**` file, not only in an
  ownership or definition position. Outside the Triage carve-out below, a plain
  prose citation is therefore reported too. Treat the ownership/definition rule
  as the _intent_ and the token scan as the _current mechanism_; when you need
  to name a lower-layer item in `_policies/**`, put it in the Triage table rows,
  which is the one place the scan skips.
- _Citing_ a lower-layer ID or a `spec-NNNN` inside the **Triage table rows** of
  `_policies/10_delta.md` is explicitly allowed. `sdd-triage.md` requires
  cross-spec and policy-only Triage rows to be persisted there, and
  `QFAI-TRIAGE-002` makes `Existing Spec` (a `spec-NNNN` value) a required
  column — so the `Existing Spec`, `Approved By` and `Rationale` cells must be
  able to name what actually changed, verbatim. `QFAI-LAYER-100` and
  `TRACE_SHARED_SCOPE_VIOLATION` skip those rows for this reason.
- The carve-out is exactly that narrow, so it cannot be used as an escape
  hatch:
  - **file** — `_policies/10_delta.md` only. A `## Triage` heading anywhere
    else under `_policies/**` (`11_Slice-Policy.md`, `01_Objective.md`, ...)
    gets no exemption.
  - **heading** — the canonical `## Triage` H2 only, matching what
    `QFAI-TRIAGE-001..007` validate. `# Triage`, `### Triage` and
    `## Triage notes` are not exempt.
  - **line shape** — markdown table rows only. A heading that declares an item
    (`### AC-0001-0001`) or a traceability edge (`- Parent: US-0001-0001`)
    inside the Triage section is still a violation, because it defines or owns
    rather than cites.
  - **table identity** — the mandated Triage table only. A second table under
    `## Triage` is exempt only when its header carries the full canonical
    column set (`Source`, `Subject`, `Existing Spec`, `Operation`, `Sub-op`,
    `Approved By`, `Rationale`); order may differ, since the Triage validators
    resolve columns by name. A table reusing only one or two of those names
    earns no exemption.
  - **column** — within an exempt table, only cells under a canonical column
    are skipped. An author-added column (`Parent`, `Refs`, ...) keeps its cells
    visible to the scan.
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
