# QFAI Codex skills

This directory provides Codex skill symlinks for QFAI.

## Canonical entrypoint

Skill symlinks point to QFAI's canonical skill documents under:

- .qfai/assistant/skills/

These canonical skill documents are the SSOT.
Tool integrations must reference `.qfai/assistant/skills/`.

## Usage

In Codex CLI, select a skill by name (e.g., `qfai-configure`) and provide your request.
All outputs must match the user's language.

## Cross-AI rules

Repository-wide AI rules live under `.agents/rules/` (master). Read
them — and the universal entrypoint `AGENTS.md` at the repo root —
before making non-trivial changes. The four master rules are:

- `.agents/rules/version-discipline.md` — the user authorizes a
  release version by either (a) pinning `vX.Y.Z` in the branch name
  (e.g. `feature/v1.8.8`) or (b) instructing it explicitly. On a
  pinned branch you MUST sync `packages/qfai/package.json#version`,
  rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`, re-insert an
  empty `## [Unreleased]`, and commit `chore(release): qfai X.Y.Z`
  before the PR merges; selecting any version other than the pin is
  forbidden. On an unpinned branch, none of those edits may be made
  without explicit instruction. Tag / publish / force-push / amend /
  AI-merge always require explicit instruction. This rule is the most
  consequential for Codex sessions.
- `.agents/rules/distributed-surface.md` — do not leak QFAI-internal
  spec IDs / version markers / `schemaVersion` into shipped files
  (`dist/`, `assets/`, `README.md`, `LICENSE`).
- `.agents/rules/root-additions-policy.md` — do not create new
  files or directories at the repository root without explicit user
  approval. Editing existing root files is permitted.
- `.agents/rules/temporary-files.md` — all scratch / intermediate
  files MUST live under `tmp/` (gitignored).
