# Evidence: import-lite (<work-id>)

Written by `/qfai-sdd` Stage 0 when specs exist and no discussion pack does. Copy this file to
`.qfai/evidence/import-lite-<ts>.md` — the `-<ts>` run stamp is required, because the preflight
check behind `QFAI-IMPLITE-001` matches `import-lite-*.md` by basename and does not see a copy
kept under this template's own name. Stamp `<ts>` to the second (`YYYYMMDDTHHmmss`); second
precision alone is not a uniqueness guarantee, so list `.qfai/evidence/` first and, when that name
is already taken (a re-run or a parallel run inside the same second), append a `-<n>` counter —
`.qfai/evidence/import-lite-<ts>-2.md`, then `-3`, … — until the name is free. One file per import
run, never an overwrite of an earlier one. If `qfai.config.yaml` overrides `paths.discussionDir`,
write into that directory's `evidence/` sibling instead.

## Metadata

- generated_at: <ISO8601>
- author: AI
- entrypoint: qfai-sdd
- mode: import-lite
- output_path: .qfai/evidence/import-lite-<ts>.md

## Sources

- URLs:
- Local paths:

## User provided excerpt

```text
<paste if available>
```

## Assumptions / Missing information

- <missing item 1>
- <missing item 2>

## Notes

- This file is a pointer artifact for preflight, not requirement/spec SSOT.
- Reflect unresolved items into discussion/spec Open Questions.
