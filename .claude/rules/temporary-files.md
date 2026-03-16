# Temporary Files Rule

All temporary files, scratch scripts, and intermediate build artifacts **MUST** be placed under the repository-root `tmp/` directory.

## Rules

1. **Never** create temporary files in the repository root, `src/`, `.qfai/specs/`, or any other production/artifact directory.
2. Use `tmp/` (repository root) as the sole staging area. Create subdirectories as needed (e.g., `tmp/glossary/`, `tmp/build/`).
3. `tmp/` is listed in `.gitignore` — temporary files must never be committed.
4. Clean up `tmp/` contents when the task that created them is complete.
5. If a temporary file is found outside `tmp/`, treat it as a defect and move or delete it immediately.

## Reference

This rule is also defined as Article XI in `.qfai/assistant/instructions/constitution.md`.
