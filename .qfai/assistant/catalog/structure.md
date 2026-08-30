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
- Production roots: <every shipped-source path, exhaustively, as Git
  pathspecs — a directory where the whole directory is source (`src/`, `app/`,
  `lib/`, `internal/`, `cmd/`, `packages/*/src`), a glob where it is not.
  Production code sitting at the repository root takes globs (`*.go` plus
  `cmd/` and `internal/`; `*.py` plus the package directory), never a bare
  `.`, which would sweep `go.mod`, `package.json`, CI config, documentation
  and build output in as production paths. Exclude tests, fixtures, build
  output, config and documentation>

## Architecture constraints

- Boundaries (what must not depend on what):
  - <boundary rule 1>
  - <boundary rule 2>
- Conventions (naming, file layout):
  - <convention 1>
  - <convention 2>

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
