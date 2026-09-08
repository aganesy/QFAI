# .qfai/steering/ — AI work-log surface

This directory is the project-local work-log surface for AI coding
agents. Each entry is a small markdown file with YAML frontmatter
(`id`, `kind`, `status`, `created`, `updated`, `scope`, `blocking`,
`promote-to`, `links`). See the canonical schema at
`.qfai/assistant/catalog/worklog-entry.schema.md`.

## Filename-id invariant (contract)

Every entry file `.qfai/steering/<id>.md` MUST have a frontmatter
`id:` that exactly matches the filename stem. The validator emits
`W-WORKLOG-SCHEMA` when they diverge.

## Running validation

```sh
qfai validate --profile sdd --fail-on error
```

Validators that scan this surface: `W-WORKLOG-SCHEMA`,
`W-WORKLOG-BROKEN-LINK`, `W-WORKLOG-STALE`, `W-PENDING-PROMOTION`,
`R-HANDOFF-INCOMPLETE`.

## Allowed `kind` values

See `.qfai/assistant/catalog/worklog-entry.schema.md#kind-enum-req-0004` for the
authoritative list and per-kind write trigger. The enum is:

- `milestone`
- `decision`
- `risk`
- `consultation-needed`
- `unexpected`
- `unscoped-discovery`
- `handoff`
- `blocker`
- `scope-up`
- `scope-down`
- `spike`

## Templates

See `_templates/entry.md` for the canonical entry shape.
