# Tech Steering

## Runtime / platform

- Node: >= 18.0.0 (package.json engines)
- Evidence: packages/qfai/package.json
- OS assumptions: cross-platform (Windows, macOS, Linux)
- Evidence: fast-glob abstraction, path normalization in core/paths.ts
- CI environment: GitHub Actions
- Evidence: .github/ directory

## Package manager

- pnpm >= 9.12.3 (monorepo workspace)
- Evidence: pnpm-workspace.yaml, pnpm-lock.yaml

## Language / framework

- TypeScript: 5.6.3 (strict mode)
- Build tool: tsup 8.3.5 (ESM/CJS dual build)
- Test runner: vitest 2.1.8
- Lint / format: eslint + prettier + markdownlint-cli2
- Evidence: packages/qfai/package.json (devDependencies), tsconfig.base.json

## Dependencies (runtime)

- @cucumber/gherkin ^37.0.1 (Gherkin parse)
- @cucumber/messages ^31.1.0 (Gherkin AST)
- fast-glob ^3.3.2 (file discovery, 10k limit)
- jsdom ^26.1.0 (DOM crawling for UI fidelity)
- yaml ^2.5.1 (YAML 1.2 parse)
- Evidence: packages/qfai/package.json (dependencies)

## Constraints

- Validators are pure async functions (no side effects, return Issue[])
- File search limit: 10,000 files (fast-glob)
- CI/CD: 2 minutes timeout target
- validate.json: internal contract (not stable API, per OQ-0003)
- Optional browser tooling for render evidence must remain lazy and must not become a new runtime dependency in v1.7.1.
- Evidence: 09_Constraints.md (TC-09, TC-10, OC-01, OC-02)

## Standard commands (copy-paste)

- Install: `pnpm install`
- Test: `pnpm test`
- Lint: `pnpm lint`
- Typecheck: `pnpm check-types`
- Pack/verify: `node scripts/verify-pack.mjs`
- Build: `pnpm build`
- Validate: `npx qfai validate --fail-on error --format github`
- Evidence: packages/qfai/package.json
