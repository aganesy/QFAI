# .qfai/steering/ — AI work-log surface

This directory is the project-local work-log surface for AI coding
agents. Each entry is a small markdown file with YAML frontmatter
(`id`, `kind`, `status`, `created`, `updated`, optional `links`,
`promote-to`).

Allowed `kind` values:

- `decision` — A choice made during work; candidate for promotion to
  `07_Decisions.md` via the `promote-to:` frontmatter key.
- `risk` — A risk identified during work.
- `blocker` — Currently blocking progress; needs human input.
- `scope-down` / `scope-up` — Scope adjustments discovered during work.
- `handoff` — Handoff note when work is suspended or transferred.
- `unexpected` — An unforeseen condition encountered during work.
- `out-of-scope` — A finding outside the current task; left for follow-up.
- `consult` — A point where the agent paused to consult the user.

See `_templates/entry.md` for the canonical entry shape.
Validators: `W-WORKLOG-SCHEMA`, `W-WORKLOG-BROKEN-LINK`,
`W-WORKLOG-STALE`, `W-PENDING-PROMOTION`, `R-HANDOFF-INCOMPLETE`.
