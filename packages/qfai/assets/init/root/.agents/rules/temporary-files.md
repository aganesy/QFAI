# Temporary Files Rule

Scratch files an agent creates for its own convenience — working notes, one-off
scripts, captured command output, downloaded samples, intermediate data — **MUST**
be placed under the repository-root `tmp/` directory.

## Rules

1. **Never** create such a scratch file in the repository root, in source
   directories, under `.qfai/specs/`, or in any other production / artifact
   directory.
2. Use `tmp/` (repository root) as the sole staging area. Create subdirectories
   as needed (e.g. `tmp/notes/`, `tmp/capture/`).
3. Build, test and cache output that the project's own toolchain is configured
   to emit — `dist/`, `build/`, `.next/`, `target/`, coverage reports, package
   tarballs — is **out of scope for this rule**. Those paths are part of the
   packaging, deploy and test contracts; leave them where the tooling puts
   them and never redirect them to `tmp/`.
4. Make sure `tmp/` is ignored by version control before writing anything into
   it. `npx qfai init` does not add the entry, so on a fresh repository check
   `.gitignore` and add `/tmp/` yourself if nothing covers it — otherwise the
   scratch files this rule asks for sit untracked and a `git add .` commits
   them. Once the entry is there, keep it.
5. Clean up `tmp/` when the task that created the files is complete.
6. If a scratch file is found outside `tmp/`, treat it as a defect and move or
   delete it immediately. Configured build output is not such a file.

## Scope

This file is the master copy shared by every AI coding agent working in this
repository. Tool-specific instruction files reference it instead of restating
it, so edit this file when the rule changes.
