# 01 Spec

- Spec: spec-0009
- Parent: CAP-0009
- Status: active

## Consumer View

- Primary SSOT for execution: `spec-0009/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - `/qfai-configure` skill workflow definition
  - Repository analysis (test frameworks, test locations, naming conventions)
  - `qfai.config.yaml` tuning (`validation.traceability.testFileGlobs`, `testFileExcludeGlobs`)
  - Optional `validation.require.specSections` configuration
  - Steering files population/refresh (`product.md`, `tech.md`, `structure.md`, `manifest.md`)
  - Evidence sampling (5-15 matched test files)
  - Minimum runnable path documentation (dev server, DB, env, commands)
  - Tool selection rationale per test layer (cross-reference, CHG-007: the layer-to-CI-lane mapping for QFAI's own repository is owned by spec-0017 / `CAP-0017` and authored under `packages/qfai/assets/init/.qfai/assistant/catalog/`. This spec stays scoped to **adopter** repository discovery; the cross-reference adds no layer token, heading or annotation form — the vocabulary is frozen)
- Out:
  - Test or source code modifications
  - Spec artifact authoring (belongs to `/qfai-sdd`)
  - Discussion workflows (belongs to `/qfai-discussion`)

## Applicable NFR

- NFR-0001: Minimal diff -- config changes are focused on traceability globs only
- NFR-0002: Evidence-based -- glob patterns backed by actual file matches (5-15 samples)
- NFR-0003: Non-destructive -- no test or source code modifications
- NFR-0004: Steering accuracy -- steering files filled from repository evidence only, TBD when unverifiable

## Applicable Policy

- Policy: Drift Protocol mandatory
- Do not modify tests or source code
- Avoid overly broad globs (e.g., `**/*`)

## Evidence Summary

- Evidence: SKILL.md at `packages/qfai/assets/init/.qfai/assistant/skills/qfai-configure/SKILL.md`
- New spec (no old equivalent to consolidate)

## Relevant Requirements

- REQ-0001: Repository analysis -- analyze project background, directory structure, technologies, test locations
- REQ-0002: Test framework identification -- inspect config files (vitest, jest, playwright, etc.) and enumerate test directories
- REQ-0003: Glob pattern proposal -- propose 3-10 include globs covering all known test locations
- REQ-0004: Exclude glob proposal -- propose exclude globs only when necessary beyond default exclusions
- REQ-0005: Steering refresh -- populate/refresh product.md, tech.md, structure.md, manifest.md with repo evidence
- REQ-0006: Config update -- update `qfai.config.yaml` with minimal diff focused on traceability globs
- REQ-0007: Evidence sampling -- sample 5-15 actual test files matching proposed globs
- REQ-0008: Tool selection rationale -- record chosen tools per test layer with rationale
- REQ-0009: Minimum runnable path -- describe commands to run locally (dev server, DB, env)

## Entry points

- US range in this spec: US-0009-0001..US-0009-0005
- Primary actors: QFAI user (project developer), DevOps/CI Engineer
- Notes: This is typically the first skill run after `qfai init` to configure traceability globs for the project

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: glob breadth vs specificity must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
