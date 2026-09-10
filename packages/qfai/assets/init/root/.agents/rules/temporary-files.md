# Temporary Files Rule

Scratch files an agent creates for its own convenience (working notes, one-off
scripts, captured command output, downloaded samples, intermediate data)
**MUST** be placed under the repository-root `tmp/` directory.

## Rules

1. **Never** create such a scratch file in the repository root, in source
   directories, under `.qfai/specs/`, or in any other production or artifact
   directory.
2. Use `tmp/` at the repository root as the sole staging area. Create
   subdirectories as needed (for example `tmp/notes/`, `tmp/capture/`).
3. Build, test and cache output that the project's own toolchain emits
   (`dist/`, `build/`, `.next/`, `target/`, coverage reports, package
   tarballs) is **outside this rule**. Those paths belong to the packaging,
   deploy and test contracts. Leave them where the tooling puts them and never
   redirect them to `tmp/`.
4. Make sure `tmp/` is ignored by version control before writing into it.
   `qfai init` adds `/tmp/` to the managed block of `.gitignore`; if the entry
   is missing, add it yourself and keep it. Otherwise the scratch files sit
   untracked and a `git add .` commits them.
5. Clean up `tmp/` when the task that created the files is complete.
6. A scratch file found outside `tmp/` is a defect. Move or delete it
   immediately. Configured build output is not such a file.

## Scope

This is the master copy for every AI coding agent in this repository.
Tool-specific instruction files point here instead of restating it. Edit this
file when the rule changes.
