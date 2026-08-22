# Temporary Files Rule

All temporary files, scratch scripts, and intermediate build artifacts **MUST**
be placed under the repository-root `tmp/` directory.

## Rules

1. **Never** create temporary files in the repository root, in source
   directories, under `.qfai/specs/`, or in any other production / artifact
   directory.
2. Use `tmp/` (repository root) as the sole staging area. Create subdirectories
   as needed (e.g. `tmp/build/`, `tmp/notes/`).
3. Make sure `tmp/` is ignored by version control before writing anything into
   it. `npx qfai init` does not add the entry, so on a fresh repository check
   `.gitignore` and add `/tmp/` yourself if nothing covers it — otherwise the
   scratch files this rule asks for sit untracked and a `git add .` commits
   them. Once the entry is there, keep it.
4. Clean up `tmp/` when the task that created the files is complete.
5. If a temporary file is found outside `tmp/`, treat it as a defect and move or
   delete it immediately.

## Scope

This file is the master copy shared by every AI coding agent working in this
repository. Tool-specific instruction files reference it instead of restating
it, so edit this file when the rule changes.
