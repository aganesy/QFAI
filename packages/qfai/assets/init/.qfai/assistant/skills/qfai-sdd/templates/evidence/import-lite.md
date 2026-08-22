# Evidence: import-lite (<work-id>)

Written by `/qfai-sdd` Stage 0 when specs exist and no discussion pack does. Copy this file to
`.qfai/evidence/import-lite-<ts>.md` — the `-<ts>` run stamp is required, because the preflight
check behind `QFAI-IMPLITE-001` matches `import-lite-*.md` by basename and does not see a copy
kept under this template's own name. Stamp `<ts>` to the second (`YYYYMMDDTHHmmss`); second
precision alone is not a uniqueness guarantee, so claim the name with an **exclusive create**
(`wx` / `O_EXCL`) instead of listing `.qfai/evidence/` and picking a free name — a listing is not a
reservation, and two runs inside the same second would both read the same name as free, the later
write erasing the earlier run's trail. When the exclusive create fails because the file already
exists (a re-run, or a parallel run inside the same second), append a `-<n>` counter —
`.qfai/evidence/import-lite-<ts>-2.md`, then `-3`, … — and retry the exclusive create, raising `<n>`
until the name is free. One file per import run, never an overwrite of an earlier one. If
`qfai.config.yaml` overrides `paths.discussionDir`, write into that directory's `evidence/` sibling
instead, and record that resolved path in `output_path` below.

Create the file only once at least one `## Sources` entry or a `## User provided excerpt` is in
hand, and delete it if the run then stops for want of an input source: a copy with neither section
filled is a pointer to nothing, yet it still silences `QFAI-IMPLITE-001` on the next validate.

## Metadata

- generated_at: <ISO8601>
- author: AI
- entrypoint: qfai-sdd
- mode: import-lite
- output_path: <the path this file was actually written to — default
  `.qfai/evidence/import-lite-<ts>.md`; under a `paths.discussionDir` override, the `evidence/`
  sibling of that directory>

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
