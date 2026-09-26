# US-0001-0079: Steering Population

## User Story

As a QFAI user, I want steering files (product.md, tech.md, structure.md, manifest.md) populated with verified repository facts, so that downstream skills have accurate project context.

On the story tree, I want the five files that take that content refreshed instead — `01_policy/objective.md`, `01_policy/initiative.md`, `01_policy/principle.md`, `<paths.contractsDir>/tech.md` and `<paths.contractsDir>/structure.md` — with each fact stated in one of them only, so that no fact is kept in two places.

## Legacy Source Scope

- In:
  - `/qfai-configure` skill workflow definition
  - Repository analysis (test frameworks, test locations, naming conventions)
  - `qfai.config.yaml` tuning (`validation.traceability.testFileGlobs`, `testFileExcludeGlobs`)
  - `paths.specsDir: .qfai/spec` written to `qfai.config.yaml` for a project on the story tree whose config has no `paths.specsDir`
  - With the `rule/ skill/ agent/ prompt/` assistant tree: the per-skill agent assignments and review profiles the user asks to change, written to `qfai.config.yaml` as overrides of the built-in defaults
  - Optional `validation.require.specSections` configuration
  - Steering files population/refresh (`product.md`, `tech.md`, `structure.md`, `manifest.md`); on the story tree, the five files that take that content instead: `01_policy/objective.md`, `01_policy/initiative.md`, `01_policy/principle.md`, `<paths.contractsDir>/tech.md` and `<paths.contractsDir>/structure.md`, each fact stated in one of them only
  - Evidence sampling (5-15 matched test files)
  - Minimum runnable path documentation (dev server, DB, env, commands)
  - Tool selection rationale per test layer (cross-reference, CHG-007: the layer-to-CI-lane mapping for QFAI's own repository is owned by spec-0017 / `CAP-0017` and authored under `packages/qfai/assets/init/.qfai/assistant/catalog/` (with the `rule/ skill/ agent/ prompt/` assistant tree, as a section of `packages/qfai/assets/init/.qfai/assistant/rule/test-layers.md`). This spec stays scoped to **adopter** repository discovery; the cross-reference adds no layer token, heading or annotation form — the vocabulary is frozen)
- Out:
  - Test or source code modifications
  - Spec artifact authoring (belongs to `/qfai-sdd`)
  - Discussion workflows (belongs to `/qfai-discussion`)

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0009/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0009/02_User-stories.md#us-0009-0003`
