# 01 Spec — Spec Layout Migration

- Spec: spec-0018
- Parent: CAP-0018
- Status: active

## Consumer View

- Primary SSOT for execution: `spec-0018/01_Spec.md`
- Default read set: this file + `.qfai/contracts/cli/qfai-migration-spec-to-story.md`
- `_policies` is read-only escalation context and must not be read by default

The subject of this spec is the `/qfai-migration-spec-to-story` skill: the ten
step scripts that move a consuming project from spec packs to the story-based
spec tree, the plan and ID map they share, the report each prints, and the
guide a person reads before running them.

## Scope

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

## Applicable NFR

The NFR IDs below are those of the discussion pack
`discussion-20260923063306456`.

- NFR-0001: A second run of any step on a migrated tree changes 0 files, and an
  interrupted run completes when run again.
- NFR-0002: A dry run writes 0 files and prints every operation the real run
  performs.
- NFR-0003: Every `06_Test-Cases` row whose EX-Ref is `—` appears in the
  report, as a new EX or as unresolved.
- NFR-0008: A step writes only inside its write set, and makes no network call.
  The write set includes the configured `paths.specsDir` and
  `paths.contractsDir` where either lies outside `.qfai/`, as the user decided
  for P2C-05b in the Phase 2c grilling decisions of
  `.qfai/evidence/sdd-batch-20260923100952585.md`.
- NFR-0010: After migration no path under `.qfai/evidence/decision/` is ignored
  by git.

## Applicable Policy

- DTC-1 (pack): the skill, its scripts and its guide ship, so an example ID in
  them is from the sample band `0001` to `0009`, and a version is named only as
  the released version.
- DTC-6 (pack): the report, the skill and the guide are written in English.
- DTC-7 (pack): the implementation follows the TypeScript rules in
  `CLAUDE.md#Project Rules`.
- OC-4 (pack): the skill, its scripts and its fixtures live inside
  `packages/qfai/`.
- OC-82 (`_policies/07_Constraints.md`): the skill ships in the same release
  as the rest of the restructure, so no released version carries it without the
  story tree it migrates to.

## Evidence Summary

- Discussion pack: `discussion-20260923063306456`, story `DUS-006` and its
  criteria `DAC-006-01` to `DAC-006-03`; success criterion `DSC-003`.
- Triage: `_policies/10_delta.md` (CREATE `spec-0018`) and `09_delta.md` in this
  pack, under `## Triage (2026-09-23 spec-to-story)`.
- Contract: `.qfai/contracts/cli/qfai-migration-spec-to-story.md`.
- Decisions: Phase 0 decisions N11, N14 and N15, and the Phase 2 and Phase 2c
  grilling decisions, in `.qfai/evidence/sdd-batch-20260923100952585.md`; this pack's
  `07_Decisions.md` records the ones that bind this spec.

## Relevant Requirements

- discussion-20260923063306456#REQ-0019: the migration skill and its ten
  bundled steps.
- discussion-20260923063306456#REQ-0020: no test case is lost.
- discussion-20260923063306456#REQ-0023: the five merged files state each fact
  once.
- discussion-20260923063306456#REQ-0018: the singular directory names step 1
  applies, and `skills.local` renamed `skill.local`.

## Entry points

- US range in this spec: US-0018-0001..US-0018-0010
- Primary actors: an adopter whose project is on the spec-pack layout; the AI
  agent running the skill for them.
- Notes: every story descends from `DUS-006`.

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: performance vs security vs DX must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
