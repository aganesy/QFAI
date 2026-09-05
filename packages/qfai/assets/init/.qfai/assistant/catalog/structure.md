# Structure Steering

> Project-level structure steering. Replace placeholder text with your own
> repo layout and architecture rules.

## Repo layout (high level)

- Top-level directories: <list main directories>
- Evidence: repository root listing

## Key packages / entrypoints

- Package(s) of interest: <list packages>
- CLI / service entry: <entrypoint files>
- Core modules: <key module directories>

## Architecture constraints

- Boundaries (what must not depend on what):
  - <boundary rule 1>
  - <boundary rule 2>
- Conventions (naming, file layout):
  - <convention 1>
  - <convention 2>

## Quality gates

This file owns neither half of the gate set. The capabilities a gate set must
cover are in `.qfai/assistant/constitution/quality.md`; the commands that
satisfy them belong in
`.qfai/assistant/catalog/tech.md#standard-commands-copy-paste`. Record project
gate commands there, not here.

## How to run locally

Setup and the QFAI launcher only. Project gate commands (build / test / lint /
typecheck / format / pack) belong in
`.qfai/assistant/catalog/tech.md#standard-commands-copy-paste`; do not repeat
them here.

```bash
<install command>
npx qfai validate
npx qfai doctor
```
