# discuss

## Purpose

`discuss/` stores structured interview outputs used as inputs for requirement and spec authoring.

This directory does not directly update `specs/`; it prepares decision logs, rationale, and unresolved items.

## Required structure

```text
discuss/
├── README.md
└── discuss-YYYYMMDDhhmmssSSS/
    ├── 01_Context.md
    ├── 02_Hearing.md
    ├── 03_Config-Hearing.md
    ├── 04_Deep-Dive.md
    ├── 05_OQ-Register.md
    ├── 06_OQ-Resolution-Log.md
    ├── 07_Deferred.md
    ├── 08_Review-Request.md
    └── 09_delta.md
```

## Rules

- Run interviews in loops until `Disposition: open` is zero in `05_OQ-Register.md`.
- `deferred` is allowed only when required metadata is complete in `07_Deferred.md`.
- Discuss outputs are logs and rationale. Do not duplicate spec SSOT from `.qfai/specs/**`.
- If diagrams are written, use ` ```mermaid ` fences only (do not use ` ```text ` or language-less fences).
- Use timestamp directory naming for new outputs: `discuss-YYYYMMDDhhmmssSSS`.
- Legacy `DISCUSS-XXXX` directories are deprecated; keep them as-is and do not auto-migrate.
- `08_Review-Request.md` must reference roster SSOT: `.qfai/assistant/steering/review-roster.yml`.

## Suggested naming

- `discuss-20260215205220203`
- Keep generated names immutable once referenced by downstream work.
