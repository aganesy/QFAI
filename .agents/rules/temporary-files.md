# Temporary Files Rule

Every temporary file, scratch script and intermediate artifact goes under the
repository-root `tmp/` directory.

## Scope

The rule covers files written into the working tree: scratch scripts, patch
and analysis scripts, intermediate build output, downloaded fixtures, notes,
and anything else a task writes beside the source it works on.

A sandbox a test creates with `mkdtemp` under `os.tmpdir()` is outside the
rule. It lies outside the repository, so it cannot land in any directory Rule 1
protects, and the test that created it removes it, which is what Rule 4 asks
for. Keeping test I/O outside the repository also keeps it away from
file-watchers and from every guard that walks the tree.

## Rules

1. **Never** create temporary files in the repository root, `src/`,
   `.qfai/specs/`, or any other production or artifact directory.
2. Use `tmp/` at the repository root as the sole staging area. Create
   subdirectories as needed (for example `tmp/glossary/`, `tmp/build/`).
3. `tmp/` is listed in `.gitignore`. Temporary files are never committed.
4. Clean up `tmp/` when the task that created the files is complete.
5. A temporary file found outside `tmp/` in the working tree is a defect. Move
   or delete it immediately. A test's `mkdtemp` sandbox is not one (see Scope).

## Reference

- The same rule is Article XI of `.qfai/assistant/constitution/constitution.md`.
- `.claude/rules/temporary-files.md` is a symlink to this file. Edit only this file.
