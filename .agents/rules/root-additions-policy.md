# Root Additions Policy

リポジトリのルート直下にディレクトリやファイルを新規追加する際は、事前にユーザー確認を必須とする。既存ファイルの編集はこのルールの対象外。

## Rules

1. **Never** create new directories or files in the repository root without explicit user approval. Editing existing root-level files (e.g., `package.json`, `CLAUDE.md`) is permitted.
2. If a new root-level addition is genuinely required, present the purpose, alternative locations considered, and impact to the user, and proceed only after explicit approval.
3. `tmp/` is the sole sanctioned scratch area at the root (see Article XI / `.agents/rules/temporary-files.md`).
4. **Do not** use `.gitignore` to allow placement while excluding from version control. The user does not want such files to be placed at all.
5. If a `report.[0-9]+.[0-9]+.[0-9]+.[0-9]+.[0-9]+.json` file (Node.js diagnostic / crash dump) is found at
   the repository root, it is not a production artifact — investigate the cause, then delete it or move it
   under `tmp/`.
6. Review packs (`review-*` directories) **must** live under `.qfai/review/review-<timestamp>/` — never at the repository root.
7. `.qfai/` directory contents are managed by the QFAI package and `/qfai-sdd` family of skills; do not author files there directly.

## Reference

- Related rule: `.agents/rules/temporary-files.md` (Article XI: temporary files MUST use `tmp/`).
- Project rules: `CLAUDE.md` (Project Rules section).
