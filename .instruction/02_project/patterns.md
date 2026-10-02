---
category: project
update-frequency: frequent
dependencies: [02_project/architecture.md]
version: 1.0.0
---

# Implementation Patterns (QFAI Toolkit)

The QFAI Toolkit implementation keeps the CLI and the core validation engine separate, so that each addition carries the smallest possible responsibility.

## CLI (`packages/qfai/src/cli`)

- Add a command under `cli/commands/*` and dispatch it in `cli/main.ts`
- Extend `ParsedArgs` and `parseArgs` in `cli/lib/args.ts` for argument parsing
- Update `usage()` in `cli/main.ts` for the usage text
- Verify CLI behavior in `packages/qfai/tests/cli`

## Validation Logic (`packages/qfai/src/core`)

- Implement additional validation in `core/validators/*` and aggregate it in `validateProject`
- Return `Issue[]` uniformly, and match `Issue.code` and `Issue.rule` to the existing naming
- Resolve paths with `core/config.resolvePath` and avoid joining paths by hand
- Collect files with `core/fs.collectFiles` and follow its convention for excluded directories

## Configuration (`core/config.ts`)

- When adding a configuration key, update `defaultConfig` and `normalize*` together
- Write default values and validation error messages concretely

## Templates (`packages/qfai/assets/init`)

- For the `init` templates, assets are the single source of truth
- When a template changes, update `packages/qfai/tests/cli/init.test.ts`

## Tests

- Core: prioritize boundary and error cases in `packages/qfai/tests/core`
- CLI: verify arguments, output and templates in `packages/qfai/tests/cli`
- Always update the tests nearest to the layer you changed
