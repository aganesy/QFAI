/**
 * Every governed assistant file this release ships, as a POSIX path relative
 * to `.qfai/assistant/`.
 *
 * GENERATED FILE — do not edit by hand. Run `npm run generate:governed-manifest`
 * from `packages/qfai` to refresh it; the scripts test slice fails on drift.
 *
 * The list is compiled rather than discovered so that a shipped rule which is
 * missing from an install is distinguishable from one the release withdrew.
 * Enumerating the installed `assets/` tree could not tell those apart: an
 * absent file simply did not appear, and `qfai init --force` retires — deletes
 * — every recorded path the shipped set omits, so a truncated package took the
 * project's own healthy copy with it.
 */
export const SHIPPED_GOVERNED_ASSISTANT_FILES: readonly string[] = [
  "catalog/cli-ux-guidelines.md",
  "catalog/manifest.md",
  "catalog/product.md",
  "catalog/review-gate.rules.yml",
  "catalog/spec_required_files.json",
  "catalog/structure.md",
  "catalog/tech.md",
  "catalog/test-layers-ci-lanes.md",
  "catalog/test-layers.md",
  "catalog/ui-definition-protocol.md",
  "catalog/worklog-entry.schema.md",
  "constitution/agent-selection.md",
  "constitution/change-classification.md",
  "constitution/communication.md",
  "constitution/constitution.md",
  "constitution/drift-protocol.md",
  "constitution/quality.md",
  "constitution/requirements-decomposition.md",
  "constitution/research-first-protocol.md",
  "constitution/shared-skill-delegation-baseline.md",
  "constitution/shared-skill-operating-baseline.md",
  "constitution/thinking.md",
  "constitution/workflow.md",
];
