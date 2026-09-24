# Evidence: import-lite (<work-id>)

Write this file during `/qfai-sdd` Stage 0 when an imported specification or explicit requirement source is usable and no discussion pack exists. Copy it to `.qfai/evidence/import-lite-<ts>.md` before editing the story tree. Do not manufacture a discussion pack.

`<ts>` is a 17-digit `YYYYMMDDhhmmssSSS` stamp. Claim the path with an exclusive create (`wx` / `O_EXCL`); on collision, take a fresh stamp and retry. Never overwrite an earlier import. Keep this evidence under `.qfai/evidence/` even when the discussion path is configured elsewhere. `QFAI-IMPLITE-001` checks the metadata and the presence of a real source or user excerpt. A file left on placeholders is not a usable input.

## Metadata

- generated_at: <ISO8601 datetime>
- author: AI
- entrypoint: import-lite
- produced_by: /qfai-sdd Stage 0
- output_path: <the path actually written, normally .qfai/evidence/import-lite-<ts>.md>

## Surface

Record the imported work's surface when no discussion pack supplies it. `primary_surface` is one of `cli`, `web`, `mobile`, `desktop`, or `mixed`; `secondary_surfaces` names any others. Ask when the answer is unknown. A CLI-only target needs no root `DESIGN.md` lock or visual prototype.

- primary_surface: <cli | web | mobile | desktop | mixed>
- secondary_surfaces: <comma-separated, or none>

## Sources

- URLs:
- Local paths:

## User provided excerpt

```text
<paste if available>
```

## Imported requirements

Number source requirements here only when the imported material lacks stable IDs. Preserve the source wording. A decision row or `.qfai/evidence/sdd-BF-NNNN.md` cites a requirement as `import-lite-<ts>#IMP-001`; where source IDs already exist, cite those IDs instead. Do not rewrite this file after a downstream citation exists.

- IMP-001: <requirement as the source states it>
- IMP-002: <requirement as the source states it>

## Assumptions / Missing information

- <missing item 1>
- <missing item 2>

## Notes

- This file records provenance for preflight. Behavior belongs in the policy, flow, story, and contract files.
- Record unresolved product choices in `<paths.specsDir>/open-questions.md` before dependent writes.
