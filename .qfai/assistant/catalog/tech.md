# Tech Steering

> Project-level tech steering. Replace placeholder text with your own
> stack and constraints.

## Runtime / platform

- Language runtime: <e.g. Node, Python, Go, JVM, ...>
- OS assumptions: <Windows / macOS / Linux / cross-platform>
- CI environment: <CI provider>

## Package manager

- <package manager and version>

## Language / framework

- Language: <language and version>
- Build tool: <build tool>
- Test runner: <test runner>
- Lint / format: <lint and formatter>

## Frontend

Leave this out for a project with no user interface.

- CSS framework: `<e.g. Tailwind, vanilla CSS, ...>`
- Component source: `<the catalogue components are taken from>`
- Adopted theme: `<the published theme the tokens resolve from>`

Every stage reads this to answer "what do we procure from". Without it,
an instruction to use the project's design system names nothing, and a
screen gets hand-drawn because that is the only option left.

The machine-readable half is `uiux.registries` in `qfai.config.yaml`: the
registries a tool can resolve a component name against. This section says
which one is primary and what the look comes from; that one says where to
fetch.

## Dependencies (runtime)

- <dependency 1>
- <dependency 2>

## Constraints

- <technical constraint 1>
- <technical constraint 2>
- Evidence: <where the constraint is recorded>

## Standard commands (copy-paste)

This section is the single home for gate commands.
`.qfai/assistant/constitution/quality.md` owns the capability list they must
cover; a capability with no entry here is UNRUN.

- Install: `<install command>`
- Format: `<format check command>`
- Test: `<test command>`
- Lint: `<lint command>`
- Typecheck: `<typecheck command>`
- Build: `<build command>`
- Pack / distribution: `<pack command>` (when publishing or distribution
  matters)
- Smoke: one line per entrypoint named under `structure.md#key-packages--entrypoints`,
  as `<entrypoint> -> <command that starts it and proves it answers>` (the
  `Skeleton command` of `skills/qfai-implement/references/walking-skeleton.md`).
  The phase runs once per declared entrypoint, so a single value cannot serve a
  project with more than one: an aggregate command proves nothing about which
  entrypoint answered, and one failing entrypoint would take the record of every
  other with it. A project with one entrypoint writes one line.
- Validate: `npx qfai validate --fail-on error --format github`
