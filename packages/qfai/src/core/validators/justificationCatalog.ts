/**
 * Reviewer-Gate finding-code justification catalog (SSOT for
 * AC-0015-0018).
 *
 * The eight registered codes MUST carry a mandatory non-empty
 * `justification:` field when emitted by a Reviewer subagent.
 * `qfai validate` ingestion rejects any catalog finding whose
 * `justification:` is empty / whitespace-only (advisory-failing,
 * mirrors the R-WORKLOG-DRIFT family pattern enforced by
 * `reviewerJustification.ts`).
 *
 * Notes:
 *   - `R-DESIGN-MD-PATCH-OUT-OF-ZONE` is documented warning per the
 *     active spec governance; it stays in the catalog so the
 *     justification contract still applies.
 *   - The catalog is exported as both an array (for iteration / docs)
 *     and a `Set<string>` (for O(1) membership checks).
 *
 * This SSOT is also referenced by `reviewerJustification.ts`, which
 * extends its existing `ADVISORY_FAILING_CODES` set with this 8-code
 * catalog so the validate-ingestion rejection path covers every
 * catalog code uniformly.
 */
export type JustificationCatalogEntry = {
  readonly code: string;
  readonly severity: "error" | "warning";
  readonly description: string;
};

export const JUSTIFICATION_CATALOG: readonly JustificationCatalogEntry[] = [
  {
    code: "R-AUTOPILOT-POLICY-MISSING",
    severity: "error",
    description:
      "SKILL.md is missing the `## Default Autopilot Policy` section required by the skill governance contract (3 named buckets: auto-decide / ask-user / hard-required).",
  },
  {
    code: "R-HANDOFF-SCHEMA-DRIFT",
    severity: "error",
    description:
      "Handoff writer is asymmetric with the canonical CLI-HANDOFF schema (Pair IV). Schema-side adds the canonical field set but a registered writer does not reference it (or vice versa).",
  },
  {
    code: "R-EVIDENCE-MUTATION-UNLOGGED",
    severity: "error",
    description:
      "An iter-NN evidence mutation call-site (rename / unlink / overwrite) is not paired with a mutation-log writer call (logEvidenceMove / logEvidenceDelete / logEvidenceOverwrite).",
  },
  {
    code: "R-DESIGN-MD-PATCH-OUT-OF-ZONE",
    severity: "warning",
    description:
      "A DESIGN.md patch was applied outside the declared patch zone. Severity is documented warning per the active spec contract; still requires a non-empty justification.",
  },
  {
    code: "R-PACK-LOCATION-DRIFT",
    severity: "error",
    description:
      "A discussion/spec pack landed outside its canonical location (e.g. `.qfai/discussion/`, `.qfai/specs/`). Asymmetric placement between catalog and on-disk location.",
  },
  {
    code: "R-SKILL-MANIFEST-DRIFT",
    severity: "error",
    description:
      "A skill manifest (agent-catalog / agent-routing / review-profiles) is out of sync with the canonical skill SSOT. Asymmetric edit across the manifest pair.",
  },
  {
    code: "R-EXPLORATION-CERTIFY-ATTEMPT",
    severity: "error",
    description:
      "An exploration-mode loop attempted certify. Exploration loops are documentation-only — certify is only valid for convergence loops.",
  },
  {
    code: "R-MOCK-HREF-DRIFT",
    severity: "error",
    description:
      "Mock template ↔ QFAI-MOCK-010 validator SSOT-sync pair (Pair V) is asymmetric. One side adopted the same-origin absolute `/path/` form without the matching change on the other side.",
  },
];

/** Set view for O(1) `has(code)` checks. */
export const CATALOG_ADVISORY_FAILING_CODES = new Set<string>(
  JUSTIFICATION_CATALOG.map((e) => e.code),
);

/**
 * Convenience predicate: returns true when `code` is one of the 8
 * catalog codes that requires non-empty justification.
 */
export function isAdvisoryFailingCatalogCode(code: string): boolean {
  return CATALOG_ADVISORY_FAILING_CODES.has(code);
}
