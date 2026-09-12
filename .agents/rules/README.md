# Cross-AI Rules (Master)

This directory is the single source of truth for the rules that apply to every
AI agent working in this repository (Claude Code, Codex, GitHub Copilot, and
others).

Each rule is a plain Markdown file. The tool-specific entry points
(`.claude/rules/*.md`, `AGENTS.md`, `CLAUDE.md`,
`.github/copilot-instructions.md`) reach these files by symlink or by
reference. Edit the master here, never a copy under a tool-specific
directory.

## Rules

| File                        | Rule                                                                                                                                                                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version-discipline.md`     | The user decides the release version. Guarded by `packages/qfai/scripts/check-branch-version-pin.sh`.                                                                                                                                                       |
| `distributed-surface.md`    | No internal IDs or version markers in the files the npm package ships.                                                                                                                                                                                      |
| `root-additions-policy.md`  | Adding a file or directory at the repository root needs explicit user approval.                                                                                                                                                                             |
| `temporary-files.md`        | Every scratch file goes under `tmp/`.                                                                                                                                                                                                                       |
| `document-schema.md`        | The structure of SDD documents is declared in `packages/qfai/assets/mdschema/**` and enforced by `pnpm lint:mdschema` and `pnpm lint:mermaid`.                                                                                                              |
| `documentation-clarity.md`  | Writing standard for PRs, issues, code comments and Markdown. The hooks in `.claude/settings.json` restate it.                                                                                                                                              |
| `repository-language.md`    | This repository is written in English. Operator-facing strings are held by `packages/qfai/tests/unit/cliMessageLanguage.test.ts` and the changelog by `packages/qfai/tests/unit/changelogLanguage.test.ts`, each against an allowlist that may only shrink. |
| `minimal-implementation.md` | The order to try solutions in, once a behaviour is agreed, and how a deliberate shortcut is marked.                                                                                                                                                         |
| `interface-clarity.md`      | What may appear on a screen or in terminal output, and what a sentence there says about the control under it.                                                                                                                                               |
| `grilling.md`               | The order a design's open decisions are asked in, who answers each one, and when asking stops.                                                                                                                                                              |
| `user-questions.md`         | Every question to the user arrives as a structured choice, with a description per option and a recommendation.                                                                                                                                              |

## Adding a rule

1. Write `<name>.md` here as a plain document.
2. Add a row to the table above. `agentsRulesSurface.test.ts` reads this file
   as the register and fails on a master it does not list.
3. Add the symlink `.claude/rules/<name>.md` (`ln -s ../../.agents/rules/<name>.md`).
4. List it in `AGENTS.md` and in `CLAUDE.md`, the two entry points at the
   repository root.
5. If Copilot must see the rule, add a one-line reference in
   `.github/copilot-instructions.md`. Codex reads `AGENTS.md`, so step 4
   already covers it.
6. If the rule governs an adopter's repository as well, copy it to
   `packages/qfai/assets/init/root/.agents/rules/` and cite it from
   `root/AGENTS.md` and `root/CLAUDE.md`. A rule about this repository alone is
   not shipped — `document-schema.md` and `repository-language.md` are the two
   that stay here.
7. Add a block to `agentsRulesSurface.test.ts` naming one token per clause of
   the rule and each entry point that cites it. Steps 2 and 3 are held for
   every master already; the rest are held only by the block you write.

## Symlinks on Windows

Git for Windows checks out `.claude/rules/*.md` as symlinks only when both hold:

- the repository was cloned with `core.symlinks=true`;
- the user has Developer Mode on, or holds the `SeCreateSymbolicLinkPrivilege` right.

Otherwise each link becomes a one-line text file containing the relative
target path, such as `../../.agents/rules/version-discipline.md`. The
integration test accepts that form as long as the path resolves to the master.
On such a checkout, read the master under `.agents/rules/` directly.
