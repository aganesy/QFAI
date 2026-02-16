# specs (Layered layout)

## Purpose

`qfai validate` treats specs as a layered package:

- shared definitions: `.qfai/specs/_shared/**`
- capability-specific details: `.qfai/specs/spec-XXXX/**`

The split policy is fixed: **1 CAP = 1 spec directory**.

## Required layout

```text
specs/
├── _shared/
│   ├── 01_Objective.md
│   ├── 02_Initiative.md
│   ├── 03_Capabilities.md
│   ├── 04_Business-flow.md    (Markdown + Mermaid required)
│   ├── 05_Contracts.md
│   ├── 06_Glossary.md
│   ├── 07_Constraints.md
│   ├── 08_Decisions.md        (recommended)
│   ├── 09_Open-questions.md   (recommended)
│   └── 10_delta.md            (recommended)
└── spec-XXXX/
    ├── 01_Spec.md
    ├── 02_User-stories.md
    ├── 03_Acceptance-criteria.md
    ├── 04_Business-rules.md
    ├── 05_Examples.feature
    ├── 06_Test-cases.md
    ├── 07_Decisions.md        (recommended)
    ├── 08_Open-questions.md   (recommended)
    └── 09_delta.md or *_delta.md
```

## ID and parent rules

- Shared capability ID: `CAP-0001` (defined in `_shared/03_Capabilities.md`)
- Spec root (`01_Spec.md`) must include `Parent: CAP-0001`.
- Item IDs are file-local and parent-driven:
  - `US-0001` -> Parent: `CAP-0001`
  - `AC-0001` -> Parent: `US-0001`
  - `BR-0001` -> Parent: `AC-0001`
  - `EX-0001` -> Parent: `BR-0001` or `AC-0001` (in `# Parent:` comment)
  - `TC-0001` -> Parent: `EX-0001`

## Traceability minimum edges

Each `spec-XXXX/` must satisfy:

- `01_Spec -> CAP`
- `US -> CAP`
- `AC -> US`
- `BR -> AC`
- `EX -> BR|AC`
- `TC -> EX`

`_shared/` files must not contain lower-layer IDs (`US/AC/BR/EX/TC`) or `spec-XXXX` references.

## Notes

- `specs/` is definition-only. Keep operational status in `.qfai/status/**` as JSON.
- Do not keep state markers like `release_candidate`, `Status`, `Progress`, or runtime `Risk` sections in spec files.
- `/qfai-sdd` can start even when `require/` index files are missing.
- If external requirement materials are provided, preflight may create minimal `require/require-*/01_sources.md` and `require/require-*/02_requirement-index.md` via import-lite.
- Preflight writes `.qfai/report/preflight_summary.md` before spec generation to record selected inputs and open gaps.
- `_shared/04_Business-flow.md` must include at least one ` ```mermaid ` block and at least one `flowchart` or `sequenceDiagram`.
- Business Flow must be documented in `_shared/04_Business-flow.md` (Markdown). Legacy `*Business-flow*.feature` is deprecated.
- Gherkin is reserved for executable examples in `spec-XXXX/05_Examples.feature`.
- If diagrams are written in discuss/require/spec/evidence artifacts, use ` ```mermaid ` fences only (do not use ` ```text ` or language-less fences).
- Delta file accepts `09_delta.md` or any `*_delta.md`.
- Contracts SSOT remains `.qfai/contracts/**`.
- Report artifacts under `.qfai/report/**` are derived outputs (non-SSOT).
