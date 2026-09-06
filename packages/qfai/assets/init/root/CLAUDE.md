# Claude Code Instructions

Persistent instructions for Claude Code in this repository. Codex loads
`AGENTS.md` and GitHub Copilot loads `.github/copilot-instructions.md`; all
three defer to the same masters below, so a rule only has to be written once.

<!-- qfai:cross-ai-rules:start -->

## Cross-AI rules (master)

The authoritative rule set lives under `.agents/rules/`. Those files are the
single source of truth: read them before acting, and when a rule changes edit
the master rather than this file.

- `.agents/rules/temporary-files.md` — scratch files an agent creates go under `tmp/`.
- `.agents/rules/root-additions-policy.md` — never add root-level files or directories without explicit user approval.
- `.agents/rules/distributed-surface.md` — keep internal identifiers and private version markers out of published files.
- `.agents/rules/version-discipline.md` — never choose a release version number on your own; the user decides.

This section, markers included, is the only part `npx qfai init` writes. A
repository that already had a `CLAUDE.md` gets it appended once; a later run
sees the start marker and leaves the section exactly as you have edited it.

<!-- qfai:cross-ai-rules:end -->

## Project rules

Anything outside the markers above is yours and survives every later
`npx qfai init`. Record this project's own conventions here — build and test
commands, code style, directory layout, review expectations.
