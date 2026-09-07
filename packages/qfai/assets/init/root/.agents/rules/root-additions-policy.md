# Root Additions Policy

Adding a directory or file directly under the repository root requires the
user's explicit approval in advance. Editing files that already exist at the
root is outside this rule.

## Rules

1. **Never** create a new directory or file in the repository root without
   explicit user approval. Editing existing root files such as `package.json`
   or `README.md` is permitted.
2. If a new root-level addition is genuinely required, present its purpose, the
   alternative locations considered, and the impact, and proceed only after
   explicit approval.
3. `tmp/` is the sole scratch area at the root (see
   `.agents/rules/temporary-files.md`).
4. **Do not** use `.gitignore` to place a file at the root while hiding it from
   version control. The file must not be placed at all.
5. Diagnostic and crash-dump files found at the repository root are not
   production artifacts. Investigate the cause, then delete them or move them
   under `tmp/`.
6. `.qfai/` is managed by the QFAI package and the `qfai` skills. Do not
   hand-author files there.

## Scope

This is the master copy for every AI coding agent in this repository.
Tool-specific instruction files point here instead of restating it. Edit this
file when the rule changes.
