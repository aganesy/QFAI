# US-0001-0078: Config Glob Tuning

## User Story

As a QFAI user, I want `qfai.config.yaml` updated with precise testFileGlobs and exclude globs, so that `qfai validate` can trace tests without false positives or misses.

On the story tree, I also want `paths.specsDir: .qfai/spec` written when my config has no such key. With the `rule/ skill/ agent/ prompt/` assistant tree, I want the per-skill agent assignments and review profiles I ask to change written to `qfai.config.yaml` as overrides, so that my project's settings live in one file and every default I did not change keeps following the package. I also want the paths that render a user-visible surface declared as `uiux.surfacePaths`, so that the UI-affecting check reads them from that same file.

## Legacy Source Scope

- In:
  - `/qfai-configure` skill workflow definition
  - Repository analysis (test frameworks, test locations, naming conventions)
  - `qfai.config.yaml` tuning (`validation.traceability.testFileGlobs`, `testFileExcludeGlobs`)
  - `paths.specsDir: .qfai/spec` written to `qfai.config.yaml` for a project on the story tree whose config has no `paths.specsDir`
  - With the `rule/ skill/ agent/ prompt/` assistant tree: the per-skill agent assignments and review profiles the user asks to change, written to `qfai.config.yaml` as overrides of the built-in defaults
  - Optional `validation.require.specSections` configuration
  - Steering files population/refresh (`product.md`, `tech.md`, `structure.md`, `manifest.md`); on the story tree, the four files that take that content instead: `01_policy/objective.md`, `01_policy/initiative.md`, `01_policy/principle.md` and `<paths.contractsDir>/tech.md`, each fact stated in one of them only
  - Evidence sampling (5-15 matched test files)
  - Minimum runnable path documentation (dev server, DB, env, commands)
  - Tool selection rationale per test layer (cross-reference, CHG-007: the layer-to-CI-lane mapping for QFAI's own repository is owned by spec-0017 / `CAP-0017` and authored under `packages/qfai/assets/init/.qfai/assistant/catalog/` (with the `rule/ skill/ agent/ prompt/` assistant tree, as a section of `packages/qfai/assets/init/.qfai/assistant/rule/test-layers.md`). This spec stays scoped to **adopter** repository discovery; the cross-reference adds no layer token, heading or annotation form — the vocabulary is frozen)
- Out:
  - Test or source code modifications
  - Spec artifact authoring (belongs to `/qfai-sdd`)
  - Discussion workflows (belongs to `/qfai-discussion`)

## Source Provenance

- Spec scope: the Scope section of retired spec-0009
- Story block: `us-0009-0002` of retired spec-0009
