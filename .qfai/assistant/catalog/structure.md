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

## UI surface paths (SSOT)

The only declaration of which paths render a user-visible surface.
`/qfai-implement` reads this section — and nothing else — to decide whether a
ledger row is UI-affecting
(`.qfai/assistant/skills/qfai-implement/references/ui-affecting.md`), so leaving
it on the placeholder makes that decision unevaluable and lets two agents answer
the same row differently.

Syntax, so the reader is mechanical: one repo-root-relative POSIX glob per
bullet, backticked, nothing else on the line. A path cell matches when any glob
matches it after normalising separators to `/`. Write the single bullet `none`
when the project has no UI surface at all — that is a statement the reader
accepts, not a gap.

ui_paths:

- `<src/ui/**>`
- `<src/components/**>`
- `<tests/e2e/**>`

## Quality gates (SSOT)

- format: <formatter>
- lint: <linter>
- typecheck: <typecheck command>
- test: <test runner>

## How to run locally

```bash
<install command>
<build command>
<test command>
npx qfai validate
npx qfai doctor
```
