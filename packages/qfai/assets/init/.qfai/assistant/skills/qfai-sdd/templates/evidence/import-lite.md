# Evidence: import-lite (<work-id>)

Written by `/qfai-sdd` Stage 0 when specs exist and no discussion pack does. Copy this file to
`.qfai/evidence/import-lite-<ts>.md`. The preflight check behind `QFAI-IMPLITE-001` does accept a
copy kept under this template's own name, but that is a single fixed path, so a second import would
overwrite the first run's trail — take the `-<ts>` run stamp to keep one file per run. `<ts>` is the
canonical 17-digit stamp (`YYYYMMDDhhmmssSSS`, the same form discussion packs use); a suffix that is
not exactly that stamp is rejected, so a `-<n>` collision counter does not work here. Millisecond
precision alone is not a uniqueness guarantee, so claim the name with an **exclusive create**
(`wx` / `O_EXCL`) instead of listing `.qfai/evidence/` and picking a free name — a listing is not a
reservation, and two runs inside the same millisecond would both read the same name as free, the
later write erasing the earlier run's trail. When the exclusive create fails because the file
already exists (a re-run, or a parallel run), re-stamp and retry the exclusive create. One file per
import run, never an overwrite of an earlier one. `.qfai/evidence/` is canonical: keep writing there
even when `qfai.config.yaml` overrides `paths.discussionDir`, because the check looks nowhere else.

Create the file only once at least one `## Sources` entry or a `## User provided excerpt` is in
hand, and delete it if the run then stops for want of an input source: a copy with neither section
filled is a pointer to nothing. Metadata is checked too — `generated_at` has to be a real ISO8601
datetime and `entrypoint` has to stay `import-lite`, which is how the check recognises the file at
all; a copy still on its `<...>` placeholders records nothing and is not accepted as an input source.

## Metadata

- generated_at: <ISO8601>
- author: AI
- entrypoint: import-lite
- produced_by: /qfai-sdd Stage 0
- output_path: <the path this file was actually written to — normally
  `.qfai/evidence/import-lite-<ts>.md`>

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
