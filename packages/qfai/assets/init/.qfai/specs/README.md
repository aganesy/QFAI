# specs (Layered layout)

## Purpose

`qfai validate` treats specs as a layered package:

- upper-layer policies and decision bases: `.qfai/specs/_policies/**`
- capability-specific details: `.qfai/specs/spec-XXXX/**`

The split policy is fixed: **1 CAP = 1 spec directory**.

## Required layout

```text
specs/
├── _policies/
│   ├── 01_Objective.md
│   ├── 02_Initiative.md
│   ├── 03_Capabilities.md
│   ├── 04_Business-Flow.md    (Markdown + Mermaid required)
│   ├── 05_Contracts.md
│   ├── 06_Glossary.md
│   ├── 07_Constraints.md
│   ├── 08_Decisions.md
│   ├── 09_Open-questions.md
│   └── 10_delta.md
└── spec-XXXX/
    ├── 01_Spec.md
    ├── 02_User-stories.md
    ├── 03_Acceptance-Criteria.md
    ├── 04_Business-Rules.md
    ├── 05_Examples.md
    ├── 06_Test-Cases.md
    ├── 07_Decisions.md
    ├── 08_Open-questions.md
    ├── 09_delta.md or *_delta.md
    └── 10_Plan.md             (required, How-only)
```

Execution Consumer View is fixed:

- Primary SSOT for execution is `spec-XXXX/01_Spec.md`.
- Execution skills must not read `_policies/**` by default.
- Read `_policies/**` only when `01_Spec.md` explicitly triggers the Escalation Hook.

## ID and parent rules

- Shared capability ID: `CAP-0001` (defined in `_policies/03_Capabilities.md`)
- Spec root (`01_Spec.md`) must include `Parent: CAP-0001`.
- `01_Spec.md` must also copy down applicable NFR/policy/requirements/evidence summary and include an Escalation Hook to `_policies`.
- Item IDs are file-local and parent-driven:
  - `US-0001` -> Parent: `CAP-0001`
  - `AC-0001` -> defined in `03_Acceptance-Criteria.md` (Gherkin/comment/table)
  - `BR-0001` -> `AC-Refs` in `04_Business-Rules.md`
  - `EX-0001` -> `BR-Ref` in `05_Examples.md`
  - `TC-0001` -> `EX-Ref` and `AC-Refs` in `06_Test-Cases.md`

## Traceability minimum edges

Each `spec-XXXX/` must satisfy:

- `01_Spec -> CAP`
- `AC -> TC`
- `BR -> EX`
- `EX -> TC`

`_policies/` files must not contain lower-layer IDs (`US/AC/BR/EX/TC`) or `spec-XXXX` references.

## TDD Execution Ledger (`tdd/test-list.md`)

Each `spec-XXXX/tdd/test-list.md` is the execution ledger for the TDD micro-cycle.

- **8 required columns**: TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence
- **Coverage** is measured as unit/component TC references from `06_Test-Cases.md` appearing in TC-Refs
- **Status=exception** rows must have a non-empty DR-ID (Decision Record reference)
- **Status in {green, refactor, done}** rows must have an existing Test file (resolved relative to project root)
- **TDD-ID** must match `TDD-NNNN` format and be unique within the spec (case-insensitive)
- Specs without `tdd/test-list.md` receive a `TDDLIST_MISSING` warning (not error)
- Old 6-column format (missing DR-ID/Evidence) triggers `TDDLIST_REQUIRED_COLUMN_MISSING` error

## Notes

- `specs/` is definition-only. Keep operational status as run logs under `.qfai/report/run-*/`.
- Do not keep state markers like `release_candidate`, `Status`, `Progress`, or runtime `Risk` sections in spec files.
- `/qfai-sdd` requires a complete `discussion/discussion-*/` pack and stops if it is missing or incomplete.
- Blocking OQ in `discussion-*/11_OQ-Register.md` (`Disposition: open`) must be resolved before SDD proceeds.
- Preflight writes `.qfai/report/preflight_summary.md` before spec generation to record selected inputs and open gaps.
- `_policies/04_Business-Flow.md` must include at least one ` ```mermaid ` block and at least one `flowchart` or `sequenceDiagram`.
- Business Flow must be documented in `_policies/04_Business-Flow.md` (Markdown). Legacy `*Business-flow*.feature` is deprecated.
- Gherkin is documented in `spec-XXXX/03_Acceptance-Criteria.md`.
- If diagrams are written in discussion/spec/evidence artifacts, use ` ```mermaid ` fences only (do not use ` ```text ` or language-less fences).
- Delta file accepts `09_delta.md` or any `*_delta.md`.
- `07_Decisions.md` / `08_Open-questions.md` and `_policies/08_Decisions.md` / `_policies/09_Open-questions.md` / `_policies/10_delta.md` are required even when empty.
- When empty, explicitly write `0 items` (or equivalent wording) in each file.
- Contracts SSOT remains `.qfai/contracts/**`.
- Report artifacts under `.qfai/report/**` are derived outputs (non-SSOT).
