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
 * IMPORTANT — catalog scope: this is the CLOSED 8-code mandatory-
 * justification set. Warning-class auxiliary codes that share a name
 * prefix (e.g. `R-AUTOPILOT-POLICY-WIDENED` emitted by
 * `autopilotPolicy.ts`) are NOT part of this catalog: they are
 * advisory-only signals and do not participate in the empty-
 * justification advisory-failing contract. Adding a 9th code here is a
 * spec-governance change (extends the closed REQ contract) and MUST
 * be done in lockstep with the owning spec and reviewer SSOTs.
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
      "A `review-*/` or `discussion-*/` pack directory was introduced outside its allowed roots (`.qfai/review/<ts>/`, `.qfai/discussion/<ts>/`, or `tmp/`). The lint lane inspects only changed paths; legacy packs that pre-date the rule are not re-flagged.",
  },
  {
    code: "R-SKILL-MANIFEST-DRIFT",
    severity: "error",
    description:
      "A skill's per-skill `manifest.json#runtimeDependencies` declaration is out of sync with the canonical `qfai doctor` runtime-dependency probe SSOT. Asymmetric edit across the probe-implementation ↔ manifest-schema pair (one side references the canonical token, the other does not).",
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
 * The workflow-set lint codes the Reviewer Gate ingests while their catalog
 * registration is deferred.
 *
 * Both are declared lint-failure codes, i.e. error class, so the severity-class
 * membership test above puts them INSIDE the catalog, on the
 * `R-PACK-LOCATION-DRIFT` precedent. Registering them extends a closed set and
 * has to move in lockstep with every SSOT that asserts the set's size, which is
 * a wider slice than the ingestion itself — so registration is deferred with a
 * named owner and trigger, not denied.
 *
 * Until then the gate ingests both WITHOUT demanding a `justification:`. Three
 * properties of that handling are load-bearing and none of them is decorative:
 *
 *   - **Enumerated, not derived.** The exemption is this literal two-member
 *     list. A code absent from it stays justification-gated whatever emits it,
 *     and no property of a code (its emitter, its prefix, its severity) admits
 *     anything to it.
 *   - **Positive, not absence-by-default.** The gate consults this list and
 *     recognizes the code as ingested-and-exempt. Leaving the codes simply
 *     unknown to the gate would produce the same quiet result today and would
 *     stop being a recorded decision the moment anything else changed.
 *   - **Temporary.** It is a divergence from the membership test, not a
 *     principle. Adding a member is a governance change; the resolution moves
 *     these two INTO {@link JUSTIFICATION_CATALOG} and empties this list.
 *
 * Kept beside the catalog rather than in the consumer so the closed set and the
 * recorded divergence from it cannot be read apart.
 */
export const DEFERRED_CATALOG_REGISTRATION_CODES: readonly string[] = [
  "R-SHIPPED-WORKFLOW-SHAPE-DRIFT",
  "R-WORKFLOW-HYGIENE-DRIFT",
];

/** Set view of {@link DEFERRED_CATALOG_REGISTRATION_CODES}. */
export const DEFERRED_CATALOG_REGISTRATION_CODE_SET = new Set<string>(
  DEFERRED_CATALOG_REGISTRATION_CODES,
);

/**
 * Convenience predicate: returns true when `code` is one of the 8
 * catalog codes that requires non-empty justification.
 */
export function isAdvisoryFailingCatalogCode(code: string): boolean {
  return CATALOG_ADVISORY_FAILING_CODES.has(code);
}
