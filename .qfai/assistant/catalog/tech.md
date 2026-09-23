# Tech Steering

> Project-level tech steering. Replace placeholder text with your own
> stack and constraints.

## Runtime / platform

- Language runtime: Node.js, floor `>=22.12.0` (`packages/qfai/package.json#engines`)
- OS assumptions: cross-platform. CI runs the suite on Linux and on Windows, and
  the Windows lanes are why path handling is written through `node:path` rather
  than by joining strings.
- CI environment: GitHub Actions (`.github/workflows/`)

## Package manager

- pnpm 9.15.9, pinned in the root `package.json#packageManager`. The
  workspace is private and installs its own package nowhere;
  `scripts/check-not-a-dependency.mjs` refuses an install that would create
  such a dependency.

## Language / framework

- Language: TypeScript 5.6, compiled to ESM and CommonJS
- Build tool: tsup 8.3
- Test runner: Vitest 2.1, split into projects one per layer
- Lint / format: ESLint 10 and Prettier 3

## Frontend

**None.** This project ships a command-line tool and no user interface, so there
is nothing to procure a component or a theme from. The entry is written rather
than left blank: a stage reading this has to be able to tell a project with no
interface from one whose steering nobody filled in.

Every stage reads this to answer "what do we procure from". Without it,
an instruction to use the project's design system names nothing, and a
screen gets hand-drawn because that is the only option left.

The machine-readable half is `uiux.registries` in `qfai.config.yaml`: the
registries a tool can resolve a component name against. This section says
which one is primary and what the look comes from; that one says where to
fetch.

## Dependencies (runtime)

- `yaml` — the configuration and every contract stub the validators read
- `fast-glob` — the file discovery every scan walks
- `@cucumber/gherkin` and `@cucumber/messages` — the Gherkin blocks in
  acceptance documents, parsed with Cucumber's own grammar rather than by regular
  expression
- `jsdom` — the diagram lane, which renders Mermaid to check it parses

## Constraints

- The published surface carries no identifier only this repository understands.
  Three guards hold it, and a fourth is agreement among contributors.
- Force-push is refused on protected branches, so a branch is updated by merging
  the default branch into it rather than by rebasing.
- Every gate command above is run by CI rather than locally, and a lane's bytes
  are pinned so a change to what CI verifies is visible in review.
- Evidence: `.agents/rules/` for the first two and `.github/pinned-bytes.txt` for
  the third

## Standard commands (copy-paste)

This section is the single home for gate commands.
`.qfai/assistant/constitution/quality.md` owns the capability list they must
cover; a capability with no entry here is UNRUN.

- Install: `pnpm install --frozen-lockfile`
- Format: `pnpm format:check`
- Test: `pnpm -C packages/qfai test`
- Lint: `pnpm lint`
- Typecheck: `pnpm check-types`
- Build: `pnpm build`
- Pack / distribution: `pnpm verify:pack`
- Smoke: `qfai` -> `node scripts/smoke-qfai-cli.mjs`. It starts the built
  CLI over stdio in a directory it creates outside this repository, and asserts
  that the plan carries two strings only the initialization surface produces.
  It is the `Skeleton command` of
  `skills/qfai-implement/references/walking-skeleton.md`, one line per entrypoint
  named under `structure.md#key-packages--entrypoints`. The phase runs once per
  declared entrypoint, so a single value cannot serve a project with more than
  one: an aggregate command proves nothing about which entrypoint answered, and
  one failing entrypoint would take the record of every other with it.
- Validate: `npx qfai validate --fail-on error --format github`
