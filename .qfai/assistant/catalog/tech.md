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
- Validate: `npx qfai validate --fail-on error --format github`
