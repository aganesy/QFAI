# US-0004-0012: Migrate a project with the skill

## User Story

- Parent: CAP-0018
- Source: discussion-20260923063306456#DUS-006
- Goal: As an adopter I want to run `/qfai-migration-spec-to-story` and have an
  AI plan the migration, run every step with a dry run first, and show me what
  is left for a person, so that the whole move is repeatable and reviewable.
- Non-goals: an AI settling what a step listed for a person.
- Notes: the guide a person reads first ships with the skill.

## Legacy Source Scope

### In

- `<paths.skillsDir>/qfai-migration-spec-to-story/SKILL.md`: the sequence an AI
  follows to migrate a project, and the judgment it supplies — the plan.
- The ten step scripts: one thin entry point per step in the skill's `scripts/`
  directory, loading the implementation from the `qfai` package installed in
  the project. No `qfai` subcommand is added.
- `.qfai/evidence/migration-spec-to-story/plan.yaml`, written by the skill, and
  `.qfai/evidence/migration-spec-to-story/id-map.json`, written by step 4.
- The `.qfai/steering/*.md` work-log entries, which step 4 re-keys from spec
  IDs to flows and decision rows.
- The archive directories `.qfai/evidence/migration-spec-to-story/legacy/` and
  `.qfai/evidence/migration-spec-to-story/retired/`.
- The Markdown report each step prints on standard output, and the exit codes.
- The migration guide, `references/migration-guide.md` in the shipped skill.
- Tests of every step against an old-layout fixture tree.

### Out

- `qfai init` shipping and linking the skill, and its old-layout detection:
  `spec-0003`.
- The old-layout error and the story-tree validator families that judge the
  migrated tree: `spec-0004`.
- The story-tree templates and their document schemas: `spec-0001`.
- Migrating this repository's own `.qfai/specs/` and `.qfai/contracts/`:
  `OQ-0170`, decided at the cutover.
- Renumbering IDs after a flow is split or reordered: `OQ-0172`.
- Requiring a clean working tree before a step runs.

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0018/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0018/02_User-stories.md#us-0018-0010`
