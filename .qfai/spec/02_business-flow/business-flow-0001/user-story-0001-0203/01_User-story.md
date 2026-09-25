# US-0001-0203: Install or upgrade and get the free-text entry

## User Story

- Goal: As an adopter maintainer, I want `qfai init` and an upgrade to install
  `qfai-run` and `qfai-maintain` with their host links, point `AGENTS.md` and
  `CLAUDE.md` at `qfai-run`, and tell me which workflow mode is in force and
  what my own edits leave out of step, so that my operators can use the
  free-text entry without further setup and my edits survive.
- Non-goals: the workflow core and what `start` refuses; the routing entries of
  the two skills, which the package defaults carry; writing a `workflow.mode`
  key or asking for one; installing the built-in plans, which the package
  holds; overwriting a skill the project edited without `--force`.
- Notes: discussion-20260923171450572#DUS-009,
  discussion-20260923171450572#REQ-0024,
  discussion-20260923171450572#REQ-0051,
  discussion-20260923171450572#REQ-0058,
  discussion-20260923171450572#REQ-0059,
  discussion-20260923171450572#REQ-0064,
  discussion-20260923171450572#REQ-0065,
  discussion-20260923171450572#NFR-0011. The ignore entries for run state and
  run evidence are criteria of US-0001-0033, which owns the managed
  `.gitignore` block.

## Source Provenance

- Story block: US-0003-0029, which `main` added to spec-0003 (archived pre-merge
  pack at `.qfai/evidence/migration-spec-to-story/retired/spec-0003/`; main's
  text at `origin/main:.qfai/specs/spec-0003/02_User-stories.md`).
  `decisions.md#DEC-0745` records the carry.
