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
  "rule/agent-selection.md",
  "rule/audited-evidence-hash.md",
  "rule/change-classification.md",
  "rule/communication.md",
  "rule/constitution.md",
  "rule/drift-protocol.md",
  "rule/quality.md",
  "rule/research-first-protocol.md",
  "rule/review-convergence.md",
  "rule/shared-skill-delegation-baseline.md",
  "rule/shared-skill-operating-baseline.md",
  "rule/test-layers.md",
  "rule/thinking.md",
  "rule/ui-definition-protocol.md",
  "rule/ui-procurement.md",
  "rule/workflow.md",
];
