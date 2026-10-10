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

## Cleanup blocked by the host

If the host denies cleanup or a removal fails, stop that cleanup and report
what remains. Authorization does not override the host's policy. Do not retry
through another shell, disable a guard or elevate privileges to bypass it.
Use this checklist for the handoff:

- Name only the exact owned absolute targets within the authorized bounds.
  Record the authority, when ownership and bounds were verified, and whether
  targets are ignored, untracked or tracked. Note links or reparse points.
  Mark unverified state as unknown; give remaining bytes only if measured.
- Distinguish a denial before execution from a started operation that failed
  or removed only part. Summarize the observed error without secrets and name
  remaining owned paths. If the phase or cause is unknown, say so rather than
  infer it.
- State whether secret-bearing plaintext was deleted, retained or could not
  be checked, without copying secrets into the report. Public screenshots
  and receipts also need ownership and scope checks before removal.
- Give concrete manual steps only for the reviewed targets and platform,
  when the human has authority to use the host's allowed method. Manual
  execution is not automatically a permitted workaround. If no allowed method
  is known, report that limit instead of inventing a command.
- Before any manual removal, resolve and check the target bounds and inspect
  links or reparse points without following them outside those bounds. Use
  the platform's native literal-path operations; in PowerShell use
  `-LiteralPath`. Never pass discovered paths to another shell for deletion.
- After an allowed removal, verify that the owned targets are absent and
  tracked files and the Git index are unchanged from the pre-removal state.
  Report partial results and any verification that could not be done.
- Report product verification separately. It may pass while cleanup is
  pending, but the task is not fully complete until required cleanup is
  verified. A handoff alone does not complete cleanup.

## Scope

This is the master copy for every AI coding agent in this repository.
Tool-specific instruction files point here instead of restating it. Edit this
file when the rule changes.
