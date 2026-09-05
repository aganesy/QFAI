# Temporary Files Rule

All temporary files, scratch scripts, and intermediate build artifacts **MUST** be placed under the repository-root `tmp/` directory.

## Scope

This rule is about files written **into the working tree**.

- **Covered:** scratch scripts, patch and analysis scripts, intermediate build
  artifacts, downloaded fixtures, notes, anything a task writes beside the
  source it is working on.
- **Not covered:** a sandbox a test creates with `mkdtemp` under the OS
  temporary directory (`os.tmpdir()`), and the files it writes inside that
  sandbox.

The exclusion follows from what Rule 1 prohibits rather than being an exception
to it. Its list is the repository root, `src/`, `.qfai/specs/` and other
production or artifact directories — and a `mkdtemp` root is outside the
repository, so it cannot put a file in any of them. Those roots are also removed
by the test that created them, which is what Rule 4 asks for.

Stated because both readings were available at once, and under the other one the
whole suite was in breach:

```sh
rg -c --glob '*.ts' 'mkdtemp\(path\.join\(os\.tmpdir\(\)' packages/qfai/tests
# 643 occurrences across 252 files
```

Review kept flagging an individual new test for calling the same helper as every
case beside it, and the author could answer honestly that this is what the suite
does (#1094). Moving test I/O inside the repository was the alternative and was
rejected: it would put every sandbox in the way of file-watchers and of any guard
that walks the tree.

## Rules

1. **Never** create temporary files in the repository root, `src/`, `.qfai/specs/`, or any other production/artifact directory.
2. Use `tmp/` (repository root) as the sole staging area. Create subdirectories as needed (e.g., `tmp/glossary/`, `tmp/build/`).
3. `tmp/` is listed in `.gitignore` — temporary files must never be committed.
4. Clean up `tmp/` contents when the task that created them is complete.
5. If a temporary file is found outside `tmp/` **in the working tree**, treat it as a defect and move or delete it immediately. A test's `mkdtemp` sandbox is not one — see Scope.

## Reference

This rule is also defined as Article XI in `.qfai/assistant/constitution/constitution.md`.
`.claude/rules/temporary-files.md` is a symlink to this file, so this is the
only place to edit it.
