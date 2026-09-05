# QFAI Cross-AI Rules (Master)

This directory is the **single source of truth** for repository rules
that apply to every AI agent (Claude Code, Codex, GitHub Copilot, …).

Each rule is a plain Markdown file. AI-specific entrypoints
(`.claude/rules/*.md`, `AGENTS.md`, `.github/copilot-instructions.md`,
`.codex/README.md`) consume these files via symlink or by direct
reference. **Do not author rule content under any AI-specific
directory; edit the master here.**

## Rules

- `version-discipline.md` — branch-name version pin and the prohibition
  on AI-driven version bumps. Enforced by
  `packages/qfai/scripts/check-branch-version-pin.sh`.
- `distributed-surface.md` — npm distributed-surface discipline (no
  internal IDs / version markers leak into shipped files).
- `root-additions-policy.md` — repository-root file/dir creation
  requires explicit user approval.
- `temporary-files.md` — all scratch artifacts go under `tmp/`.
- `document-schema.md` — SDD ドキュメントの構造は `packages/qfai/assets/mdschema/**` が SSOT。`pnpm lint:mdschema` と `pnpm lint:mermaid` が強制する。

## Adding a new rule

1. Author `<name>.md` here as a plain document.
2. Register it in `AGENTS.md` (universal entrypoint at repo root).
3. Add `.claude/rules/<name>.md` symlink (`ln -s ../../.agents/rules/<name>.md`).
4. If the rule must reach Codex / Copilot, add a short reference in
   `.github/copilot-instructions.md` and `.codex/README.md`.

## Windows symlink note

Git for Windows handles `.claude/rules/*.md` symlinks correctly only
when both of the following are true:

- The repository was cloned with `git config --global core.symlinks true`
  (or repo-local equivalent).
- The user has Developer Mode enabled (Settings → System → For developers
  → Developer Mode: ON), or has the SeCreateSymbolicLinkPrivilege right.

If neither holds, the symlinks materialise as one-line text files whose
content is the relative target path (e.g.
`../../.agents/rules/version-discipline.md`). The
`agentsRulesSurface` integration test accepts this fallback by
validating that the materialised path resolves back to the master file
rather than insisting on byte-for-byte content equality. Claude
sessions on such checkouts should read the master at
`.agents/rules/<name>.md` directly.
