# 10 Plan

- Spec: spec-0026
- Parent: CAP-0026

## Implementation Sequence

### Step 1: uiux sidecar template set

- Add or update the 11 `qfai-discussion` uiux sidecar templates under `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/uiux/`.
- Keep the numbering stable, but make the content align with the current layered spec: explicit surface classification, strategy selection, 3-layer evaluation model, comparison, anchor, screen contracts, review bundle, critique loop.
- Keep generation idempotent: identical discussion input must produce identical sidecar structure and field set.

### Step 2: strategy template and completion contract

- Update `uiux/10_strategy.md` so the required fields from the current spec are first-class and machine-checkable.
- Encode `selection_required`, `candidate_options`, `chosen_option`, `verification_expectations`, and `none-as-legitimate-outcome` as the canonical completion set.
- Update the discussion skill flow so completion checks are driven by strategy, scoring, anchor, and contract readiness rather than generic UI prose.

### Step 3: story/sources/review-request templates

- Rewrite `03_Story-Workshop.md`, `04_Sources.md`, and `14_Review-Request.md` around behavior obligations, research translation, and sidecar review scope.
- Keep HTML/CSS mock language as optional fallback only; do not let it become the primary artifact.
- Ensure research translation explicitly records adopt/reject/translation policy so downstream reviewers can audit the path from references to obligations.

### Step 4: batch template cross-references

- Add lightweight cross-references from the core discussion pack files back to uiux sidecars.
- Do not duplicate uiux content in the core pack; links and summary pointers only.
- Preserve non-UI behavior: no `uiux/` directory and no UI-only completion requirements when the surface classification is `non-ui`.

## File Targets

- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/SKILL.md`
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/uiux/**`
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/03_Story-Workshop.md`
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/04_Sources.md`
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/14_Review-Request.md`
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/*.md` for cross-reference additions

## Test Strategy

- Integration: asset/template generation tests under `packages/qfai/tests/assets/**` covering UI-bearing generation, non-UI skip, idempotent output, and 5-field strategy completeness.
- Integration: validator-facing fixture tests ensuring generated templates satisfy the current `spec-0026` and `spec-0027` expectations.
- E2E: no dedicated browser/API scope here; end-to-end coverage is discussion-pack generation plus downstream validate pass.
- Gate checks:
  - `pnpm test`
  - `qfai validate --fail-on error --format github`
  - coverage hard gates `QFAI-COV-201/202/203/204/205/206 = 0`

## Risks and Controls

- Drift between core pack and sidecar: keep core pack additive and link-only.
- Reintroduction of 4-axis language: treat 3-layer evaluation architecture as the only canonical model.
- Non-UI regression: keep a CLI/non-visual fixture in the regression set and assert zero uiux output.

## v1.7.11 Completion Steps

### Step: Replace discussion sidecar template family with canonical 3-layer templates

- Replace the discussion sidecar template family with canonical 3-layer templates (invariant / trend-derived / product-specific evaluation model).
- Mark old sidecar templates (4-axis based) as deprecated with front-matter annotation and exclude from default generation path.

### Test Strategy

- TC-0026-0035: Generated discussion sidecar uses canonical 3-layer template family exclusively. No 4-axis template references in generated output.
- TC-0026-0036: Old sidecar templates carry deprecation marking and are not included in default `qfai init` or discussion generation output.
