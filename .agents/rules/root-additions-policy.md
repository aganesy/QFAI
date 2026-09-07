# Root Additions Policy

Adding a directory or file directly under the repository root requires the
user's explicit approval in advance. Editing files that already exist at the
root is outside this rule.

## Rules

1. **Never** create a new directory or file in the repository root without
   explicit user approval. Editing existing root files such as `package.json`
   or `CLAUDE.md` is permitted.
2. If a new root-level addition is genuinely required, present its purpose, the
   alternative locations considered, and the impact, and proceed only after
   explicit approval.
3. `tmp/` is the sole scratch area at the root (see
   `.agents/rules/temporary-files.md`).
4. **Do not** use `.gitignore` to place a file at the root while hiding it from
   version control. The file must not be placed at all.
5. A `report.[0-9]+.[0-9]+.[0-9]+.[0-9]+.[0-9]+.json` file at the root is a
   Node.js diagnostic dump, not a production artifact. Investigate the cause,
   then delete it or move it under `tmp/`.
6. Review packs (`review-*` directories) live under
   `.qfai/review/review-<timestamp>/`, never at the repository root.
7. `.qfai/` is managed by the QFAI package and the `qfai-*` skills. Do not
   author files there directly.
