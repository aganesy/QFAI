# Cross-AI Rules (Master)

This directory is the single source of truth for the rules that apply to every
AI agent working in this repository (Claude Code, Codex, GitHub Copilot, and
others).

Each rule is a plain Markdown file. The tool-specific entry points
(`.claude/rules/*.md`, `AGENTS.md`, `.github/copilot-instructions.md`,
`.codex/README.md`) reach these files by symlink or by reference. Edit the
master here, never a copy under a tool-specific directory.

## Rules

| File                       | Rule                                                                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `version-discipline.md`    | The user decides the release version. Guarded by `packages/qfai/scripts/check-branch-version-pin.sh`.                                          |
| `distributed-surface.md`   | No internal IDs or version markers in the files the npm package ships.                                                                         |
| `root-additions-policy.md` | Adding a file or directory at the repository root needs explicit user approval.                                                                |
| `temporary-files.md`       | Every scratch file goes under `tmp/`.                                                                                                          |
| `document-schema.md`       | The structure of SDD documents is declared in `packages/qfai/assets/mdschema/**` and enforced by `pnpm lint:mdschema` and `pnpm lint:mermaid`. |
| `documentation-clarity.md` | Writing standard for PRs, issues, code comments and Markdown. The hooks in `.claude/settings.json` restate it.                                 |

## Adding a rule

1. Write `<name>.md` here as a plain document.
2. List it in `AGENTS.md`, the universal entry point at the repository root.
3. Add the symlink `.claude/rules/<name>.md` (`ln -s ../../.agents/rules/<name>.md`).
4. If Codex or Copilot must see the rule, add a one-line reference in
   `.github/copilot-instructions.md` and `.codex/README.md`.

## Symlinks on Windows

Git for Windows checks out `.claude/rules/*.md` as symlinks only when both hold:

- the repository was cloned with `core.symlinks=true`;
- the user has Developer Mode on, or holds the `SeCreateSymbolicLinkPrivilege` right.

Otherwise each link becomes a one-line text file containing the relative
target path, such as `../../.agents/rules/version-discipline.md`. The
integration test accepts that form as long as the path resolves to the master.
On such a checkout, read the master under `.agents/rules/` directly.
