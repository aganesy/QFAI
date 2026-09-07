# Root Additions Policy

Adding a new directory or file directly under the repository root requires
explicit user approval in advance. Editing files that already exist at the root
is out of scope for this rule.

## Rules

1. **Never** create new directories or files in the repository root without
   explicit user approval. Editing existing root-level files (for example
   `package.json` or `README.md`) is permitted.
2. If a new root-level addition is genuinely required, present the purpose, the
   alternative locations you considered, and the impact, and proceed only after
   explicit approval.
3. `tmp/` is the sole sanctioned scratch area at the root (see
   `.agents/rules/temporary-files.md`).
4. **Do not** use `.gitignore` to place a file at the root while hiding it from
   version control. The point of the rule is that the file is not placed at all.
5. Diagnostic or crash-dump files found at the repository root are not
   production artifacts — investigate the cause, then delete them or move them
   under `tmp/`.
6. `.qfai/` contents are managed by the QFAI package and the `qfai` skills; do
   not hand-author files there.

## Scope

This file is the master copy shared by every AI coding agent working in this
repository. Tool-specific instruction files reference it instead of restating
it, so edit this file when the rule changes.
