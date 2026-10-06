# Temporary Files Rule

Scratch files an agent creates for its own convenience (working notes, one-off
scripts, captured command output, downloaded samples, intermediate data)
go in the scratch directory the host names for the session, and under the
repository-root `tmp/` directory where the host names none.

## Rules

1. **Never** create such a scratch file in the repository root, in source
   directories, under `.qfai/spec/`, or in any other production or artifact
   directory.
2. When the host names a scratch directory for the session, use it. Otherwise
   use `tmp/` at the repository root as the sole staging area, with
   subdirectories as needed (for example `tmp/notes/`, `tmp/capture/`).
   A file the repository's own tooling must read from the working tree, such
   as a generated input, goes under `tmp/` whichever the host names.
3. Build, test and cache output that the project's own toolchain emits
   (`dist/`, `build/`, `.next/`, `target/`, coverage reports, package
   tarballs) is **outside this rule**. Those paths belong to the packaging,
   deploy and test contracts. Leave them where the tooling puts them and never
   redirect them to `tmp/`.
4. Make sure `tmp/` is ignored by version control before writing into it.
   `qfai init` adds `/tmp/` to the managed block of `.gitignore`; if the entry
   is missing, add it yourself and keep it. Otherwise the scratch files sit
   untracked and a `git add .` commits them.
5. Clean up `tmp/` when the task that created the files is complete. The
   host's own scratch directory is the host's to clean.
6. A scratch file found in the working tree outside `tmp/` is a defect. Move or
   delete it immediately. Configured build output is not such a file.
7. A file left by an earlier session is untrusted input, not a cache: another
   session's scratch directory and another worktree's `tmp/` alike. Before
   reusing a download, verify it against a checksum from its publisher, and
   read a saved checksum file before trusting it.

## Scope

This is the master copy for every AI coding agent in this repository.
Tool-specific instruction files point here instead of restating it. Edit this
file when the rule changes.
