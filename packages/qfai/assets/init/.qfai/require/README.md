# require

## Purpose

`require/` stores structured requirement interview outputs used as inputs for layered Spec Pack generation.

Requirement outputs are organized per interview package (`REQUIRE-XXXX`) instead of a single monolithic file.

## Required structure

```text
require/
├── README.md
└── REQUIRE-XXXX/
    ├── 00_Summary.md
    ├── 01_Functional-requirements.md
    ├── 02_Non-functional-requirements.md
    ├── 03_Contracts-boundary.md
    ├── 04_Data-and-glossary.md
    ├── 05_Test-policy.md
    ├── 06_Compliance-and-risk.md
    └── 07_Open-questions.md
```

## Legacy compatibility

The following legacy files may still exist for compatibility with older workflows/validators:

- `glossary.md`
- `actors.md`
- `business-flows.md`
- `require.md`
- `open-questions.md`

Prefer `REQUIRE-XXXX/**` for new work.

## Rules

- Use two stages: Core interview first, Optional deep dive only when triggered.
- Keep unknowns as `TBD`, but mirror all unresolved items in `07_Open-questions.md`.
- Ensure NFR, contract boundary (API/DB/UI), glossary clarity, and test policy are explicitly documented.
- Requirement statements should be atomic and testable.

## SDD handoff

Use these files as primary references for `/qfai-sdd`:

- `01_Functional-requirements.md`
- `02_Non-functional-requirements.md`
- `03_Contracts-boundary.md`
- `04_Data-and-glossary.md`
- `05_Test-policy.md`

Do not write lower-layer IDs (`AC/BR/EX/TC`) in this stage.

