# 07 Policy

## Project Policy

- SSOT: detailed definitions belong to `.qfai/specs/**`.
- Direction: lower artifacts may reference upper artifacts; avoid upper-to-lower direct references.
- Diagram rule: Mermaid syntax must be inside ` ```mermaid ` fences only.

## Operational Rules

- Keep `require/` as requirement intake artifacts.
- Keep runtime status in `.qfai/report/run-*`, not in require files.
