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
│   ├── 04_Business-flow.md
│   ├── 05_Contracts.md
│   ├── 06_Glossary.md
│   ├── 07_Constraints.md
│   ├── 08_Decisions.md         (recommended)
│   ├── 09_Open-questions.md    (recommended)
│   └── 10_delta.md             (recommended)
└── spec-XXXX/
    ├── 01_User-stories.md
    ├── 02_Acceptance-criteria.md
    ├── 03_Business-rules.md
    ├── 04_Examples.feature
    ├── 05_Test-cases.md
    ├── 06_Plan.md              (recommended)
    ├── 07_Decisions.md         (recommended)
    ├── 08_Open-questions.md    (recommended)
    └── 09_delta.md or *_delta.md
```

## ID system

- Shared capability ID: `CAP-0001` (defined in `_shared/03_Capabilities.md`)
- Spec IDs: `US/AC/BR/SC/CASE` must use `PREFIX-<SPECNO4>-<SEQNO4>`
  - Example in `spec-0007/`: `US-0007-0001`, `AC-0007-0002`, `SC-0007-0001`
- In `spec-XXXX/`, IDs with a different namespace (for example `US-0008-...`) are invalid.

## Traceability minimum edges

Each `spec-XXXX/` must satisfy:

- `US -> AC`
- `AC -> US`
- `AC -> BR`
- `BR -> AC`
- `SC -> AC`
- `AC -> SC`
- `CASE -> SC`

`_shared/` top files (`01..04`) must not contain lower-layer IDs (`US/AC/BR/SC/CASE`).

## Notes

- `04_Examples.feature` must include one `@SPEC-XXXX` and scenario tags `@SC-XXXX-YYYY`.
- Delta file accepts `09_delta.md` or any `*_delta.md`.
- Contracts SSOT remains `.qfai/contracts/**`.
- Report artifacts under `.qfai/report/**` are derived outputs (non-SSOT).
