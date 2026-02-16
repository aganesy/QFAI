# status

## Purpose

`status/` stores operational state that changes over time.

Use this directory for progress and release readiness records.
Keep all status files in JSON so validators and automation can parse them consistently.

## Scope

Status artifacts may include:

- release candidate flags
- risk state snapshots
- review gate progress
- update timestamps and notes

## Rules

- `specs/` is definition-only. Do not store runtime status fields inside specs.
- Keep status files machine-readable and incremental.
- Initialize only README and `.gitignore` in `qfai init`.
- Generate concrete status JSON files during workflow execution, not at init time.

## Suggested files

- `shared.json`
- `spec-0001.json`
- `release.json`
