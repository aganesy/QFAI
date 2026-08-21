---
id: quality
category: universal
update_frequency: occasional
---

# Quality (Gates, tests, and safety)

## Quality gates (baseline)

**Gate commands are project-defined. Always discover them from the repo.** This
file names the capabilities a gate set must cover; it never names the commands,
because the commands belong to the stack. `.qfai/assistant/constitution/constitution.md` Article VIII and
`.qfai/assistant/constitution/workflow.md` say the same thing — this file used to disagree with both by
stating five `pnpm` commands as fact, which on a non-Node repository is five
commands that do not exist.

When code changes are requested, the expected minimum gates are:

- format check
- lint
- typecheck
- tests
- pack / distribution verification (when publishing or distribution matters)

Discover the actual commands from the repository, in this order: the project's
task-runner manifest (`package.json` `scripts`, `Makefile`, `justfile`,
`pyproject.toml`, `Cargo.toml`, …), then the CI workflow, then the project's own
contributing docs. `/qfai-configure` records what it detected in
`.qfai/assistant/catalog/tech.md`; read that before guessing.

A capability with no discoverable command is **UNRUN**, not passed. Report it as
a blocker rather than substituting a command from another stack — a gate that
cannot run is a gate that silently passes.

<!--
Worked examples, for reading only. Neither list is a default; the capability
list above is the rule.
Node (this toolkit's own): `pnpm format:check` / `pnpm lint` /
`pnpm check-types` / `pnpm test` / `pnpm verify:pack`.
Python: `uv run ruff format --check` / `uv run ruff check` / `uv run mypy` /
`uv run pytest` / `uv build`.
-->

This file stays stack-neutral, which is what `category: universal` in its front
matter claims. `/qfai-configure` reads it and reconciles it with the detected
toolchain; it does not rewrite the capability list.

## Do not weaken safety nets

- Do not suppress or disable checks via inline ignores unless explicitly approved.
- If a rule must be changed, justify with evidence and update tests/docs accordingly.

## Testing expectations

- Prefer adding/adjusting tests over weakening validation.
- Keep outputs deterministic (avoid time/randomness).
