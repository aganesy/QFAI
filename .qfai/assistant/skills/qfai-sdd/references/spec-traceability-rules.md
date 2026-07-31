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

## TDD Execution Ledger

Each `.qfai/specs/<spec-id>/tdd/test-list.md` is the execution ledger for the TDD micro-cycle.

- Required columns: TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence
- Coverage is measured as unit/component TC references from `06_Test-Cases.md` appearing in TC-Refs.
- If `06_Test-Cases.md` has no test-case classification column, every TC is treated as a coverage target.
- `Status=exception` requires a non-empty DR-ID.
- `Status` in `green`, `refactor`, or `done` requires an existing Test file resolved from project root.
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
