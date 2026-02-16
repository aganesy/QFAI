# discuss

## Purpose

`discuss/` stores structured interview outputs used as inputs for layered Spec Pack authoring.

This directory does not directly update `specs/`; it prepares high-quality upstream inputs.

## Required structure

```text
discuss/
├── README.md
└── discuss-YYYYMMDDhhmmssSSS/
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
- `04_Business-flow.md` must be Markdown and include at least one Mermaid diagram (`flowchart` or `sequenceDiagram`).
- If diagrams are written, use ` ```mermaid ` fences only (do not use ` ```text ` or language-less fences).
- Use timestamp directory naming for new outputs: `discuss-YYYYMMDDhhmmssSSS` (Asia/Tokyo).
- Legacy `DISCUSS-XXXX` directories are deprecated; keep them as-is and do not auto-migrate.

## Suggested naming

- `discuss-20260215205220203`
- Keep generated names immutable once referenced by downstream work.
