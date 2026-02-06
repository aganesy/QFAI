# skills.local

## Purpose

`skills.local/` is for **project-specific skill variants**.

Use this folder only when the project needs a skill-level override that cannot be expressed via `steering/`.

## How to write an override

Create a folder with the same skill name under `skills.local/` and put `SKILL.md` inside.

Recommended pattern:

1. Include the canonical skill:

   @../../skills/<skill-name>/SKILL.md

2. Append an "Overrides" section and keep it small (preferably <= 30 lines).

3. If the override becomes large, propose changing the canonical skill in `skills/` instead.

## Lifecycle / tooling

- This folder is protected from `qfai init --force`.
- Later versions may add validator checks to track drift and coverage.
