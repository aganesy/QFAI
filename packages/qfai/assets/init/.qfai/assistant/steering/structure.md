# Structure Steering

## Repo layout (high level)

- Top-level directories: packages/, .qfai/, docs/, scripts/, tmp/, .github/, .claude/, .codex/, .agents/
- Evidence: Repository root listing

## Key packages / entrypoints

- Package(s) of interest: packages/qfai/ (monorepo single package)
- CLI entry: packages/qfai/src/cli/index.ts -> main.ts (run() with switch on command)
- Core modules: packages/qfai/src/core/ (40+ files: config, discovery, specLayout, discussionPack, traceability, contracts, waivers, validate, etc.)
- Evidence: packages/qfai/package.json, packages/qfai/src/

## Architecture constraints

- Boundaries (what must not depend on what):
  - Validators are pure async functions returning Issue[] (no side effects)
  - CLI layer -> Core layer -> Validators -> Artifacts (one-way dependency)
  - specs/ is definition-only (no operational status)
- Conventions (naming, file layout):
  - Layered spec: `_policies/` + `spec-*` directories (1 CAP = 1 spec dir)
  - Contract IDs: CON-DB-XXXX, CON-API-XXXX, CON-UI-XXXX
  - Validator files: packages/qfai/src/core/validators/ (45+ files)
- Evidence: 02_Inception-Deck.md (Architecture), 09_Constraints.md (TC-09)

## Quality gates (SSOT)

- format: prettier (.prettierrc.json)
- lint: eslint (eslint.config.js)
- typecheck: pnpm check-types (tsc --noEmit)
- test: pnpm test (vitest run)
- verify-pack / pack: scripts/verify-pack.mjs
- Evidence: packages/qfai/package.json (scripts), .prettierrc.json, eslint.config.js

## How to run locally

```bash
pnpm install
pnpm build          # tsup build
pnpm test           # vitest run
pnpm check-types    # tsc --noEmit
pnpm lint           # eslint src
npx qfai validate   # run validation
npx qfai doctor     # diagnose setup
```

- Evidence: packages/qfai/package.json (scripts)
