# Claude Code Instructions

Persistent instructions for Claude Code in this repository. Codex loads
`AGENTS.md` and GitHub Copilot loads `.github/copilot-instructions.md`; all
three defer to the same masters below, so a rule only has to be written once.

## Cross-AI rules (master)

The authoritative rule set lives under `.agents/rules/`. Those files are the
single source of truth: read them before acting, and when a rule changes edit
the master rather than this file.

- `.agents/rules/temporary-files.md` — scratch files an agent creates go under `tmp/`.
- `.agents/rules/root-additions-policy.md` — never add root-level files or directories without explicit user approval.
- `.agents/rules/distributed-surface.md` — keep internal identifiers and private version markers out of published files.
- `.agents/rules/version-discipline.md` — never choose a release version number on your own; the user decides.

## Project rules

`npx qfai init` writes this file once and never overwrites it, so anything you
add below survives every later run. Record this project's own conventions here
— build and test commands, code style, directory layout, review expectations.
