---
category: project
update-frequency: frequent
dependencies: [02_project/tech-stack.md]
version: 1.0.0
---

# Development Steps and Commands (QFAI Toolkit)

## Prerequisites

- Node.js — the supported range is `package.json#engines`. Read it there; it moves.
- pnpm — the pinned version is `package.json#packageManager`.

## Setup

```
pnpm install
```

## Build and Quality Gates

```
pnpm build
pnpm format:check
pnpm lint
pnpm lint:mdschema
pnpm lint:mermaid
pnpm check-types
pnpm -C packages/qfai test
pnpm verify:pack
```

## CLI Smoke Test (in an empty directory)

```
npx qfai init
npx qfai validate --fail-on error --format github
npx qfai report
```

## Release

- See `RELEASE.md` for details
- Run `npm publish --dry-run` inside `packages/qfai`
