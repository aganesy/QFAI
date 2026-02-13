# discuss

## Purpose

`discuss/` stores structured interview outputs used as inputs for layered Spec Pack authoring.

This directory does not directly update `specs/`; it prepares high-quality upstream inputs.

## Required structure

```text
discuss/
└── DISCUSS-XXXX/
    ├── 00_Summary.md
    ├── 01_Objective.md
    ├── 02_Initiative.md
    ├── 03_Capabilities.md
    ├── 04_Business-flow.md
    ├── 05_Policy.md
    ├── 06_Stakeholders.md
    └── 07_Open-questions.md
```

## Rules

- Run in two stages: Core interview first, Optional deep dive only when triggered.
- Use `TBD` for unknowns, but mirror all unresolved items into `07_Open-questions.md`.
- Do not write lower-layer IDs (`AC/BR/EX/TC`) in discuss artifacts.
- Discuss outputs are handoff inputs for `/qfai-require` and `/qfai-sdd`.

## Suggested naming

- `DISCUSS-0001`, `DISCUSS-0002`, ...
- Keep IDs stable once referenced by downstream work.

