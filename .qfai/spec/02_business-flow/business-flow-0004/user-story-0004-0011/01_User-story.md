# US-0004-0011: Repoint the host links and the ignore rules

## User Story

- Parent: CAP-0018
- Source: discussion-20260923063306456#DUS-006
- Goal: As an adopter I want steps 9 and 10 to point my host integration links
  at the renamed skill and agent directories and keep my decision records
  tracked, so that my AI host and git see the migrated project correctly.
- Non-goals: rerunning `qfai init --force`; editing `.gitignore` outside its
  managed block.

## Legacy Source Scope

### In

- `<paths.skillsDir>/qfai-migration-spec-to-story/SKILL.md`: the sequence an AI
  follows to migrate a project, and the judgment it supplies — the plan.
- The ten step scripts: one thin entry point per step in the skill's `scripts/`
  directory, loading the implementation from the `qfai` package installed in
  the project. No `qfai` subcommand is added.
- `.qfai/evidence/migration-spec-to-story/plan.yaml`, written by the skill, and
  `.qfai/evidence/migration-spec-to-story/id-map.json`, written by step 4.
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
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0018/02_User-stories.md#us-0018-0009`
