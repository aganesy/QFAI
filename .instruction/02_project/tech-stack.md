---
category: project
update-frequency: occasional
dependencies: [02_project/architecture.md]
version: 1.0.0
---

# Technology Stack (QFAI Toolkit)

## Runtime and Language

- Node.js — the supported range is `package.json#engines`. Read it there; it moves.
- TypeScript (ESM)
- pnpm — the pinned version is `package.json#packageManager`.

## Build and Packaging

- tsup (builds `packages/qfai`)
- TypeScript compiler (`tsc -b` / `tsc --noEmit`)
- npm publish (steps are collected in `RELEASE.md`)

## Parsing and Formatting

- Gherkin parsing: `@cucumber/gherkin`, `@cucumber/messages`
- YAML parsing: `yaml` (`qfai.config.yaml`)
- Markdown schema check: `@jackchuka/mdschema`, a dependency of the package that
  `qfai validate` and the shipped docs lane both run

## Tests

- Vitest (unit and CLI tests for `packages/qfai`)

## Quality and Static Analysis

- ESLint
- Prettier
