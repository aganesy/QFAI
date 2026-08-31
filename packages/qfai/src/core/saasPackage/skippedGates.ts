/**
 * SaaS-package profile skip-set (SSOT).
 *
 * The `saas-package` validate profile deliberately skips the gates
 * that require ATDD / implement-class artifacts. A SaaS-tenant
 * package ships without exercising those phases by design, so each
 * skip surfaces as a `D-SAAS-PACKAGE-VERIFY-SKIPPED` info finding
 * rather than failing the run.
 *
 * Keep the list small and intentional. The certify-side counterpart
 * (separate skill / spec) must reference the same set so the
 * "what was skipped" surface is symmetric across `validate` and
 * `certify`.
 */
export const SAAS_PACKAGE_SKIPPED_GATES = [
  "validateAtddCodeTraceability",
  "validateTddList",
  "validateTestTodoStubs",
  "validateTraceabilityIntegrity",
] as const;

export type SaasPackageSkippedGate = (typeof SAAS_PACKAGE_SKIPPED_GATES)[number];

/**
 * Finding-code families each skipped gate would have produced.
 *
 * `SAAS_PACKAGE_SKIPPED_GATES` names validator functions, which is the right
 * granularity for the `D-SAAS-PACKAGE-VERIFY-SKIPPED` findings, but the
 * partial-profile notice in `validate.json` speaks in code families.
 *
 * Keyed by `SaasPackageSkippedGate`, not `string`, so the two lists cannot
 * drift: a gate added to the skip-set without a family here is a missing-key
 * compile error, and a family entry for a gate not in the skip-set is an
 * excess-key one. Typed as `Record<string, …>` neither held, and the guarantee
 * rested entirely on a runtime test.
 *
 * An entry must cover exactly what its gate emits — no more, no less, since
 * the notice is read as the list of checks that did not run. Both failure
 * directions have been observed here. `validateTestTodoStubs` was listed as
 * the bare `QFAI-TEST-001` while the gate also emits `QFAI-TEST-002`, so the
 * notice under-stated the skip until the entry was widened to a prefix glob.
 * `validateTraceabilityIntegrity` had the opposite defect: `QFAI-TRACE-*` also
 * claims the `QFAI-TRACE-1xx` block, which `validateTraceability` owns and
 * this skip-set does not name, so the glob over-stated it. Prefer a glob where
 * the gate owns its whole prefix; enumerate codes where it owns only part.
 */
export const SAAS_PACKAGE_SKIPPED_GATE_FAMILIES: Record<SaasPackageSkippedGate, readonly string[]> =
  {
    validateAtddCodeTraceability: ["QFAI-ATDD-*"],
    validateTddList: ["TDDLIST_*"],
    validateTestTodoStubs: ["QFAI-TEST-*"],
    // Only the integrity gate's own two codes. `QFAI-TRACE-*` would also claim
    // the `QFAI-TRACE-1xx` block, which belongs to `validateTraceability` — a
    // different validator, and not one this skip-set names.
    validateTraceabilityIntegrity: ["QFAI-TRACE-001", "QFAI-TRACE-002"],
  };

/** Deduped, order-preserving code families the saas-package profile skips. */
export function saasPackageSkippedGateFamilies(): string[] {
  // `Set` for membership, array for order. `includes` inside the nested loop is
  // quadratic in the number of families — fine at four gates, and silently not
  // once either list grows.
  const seen = new Set<string>();
  const families: string[] = [];
  for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
    for (const family of SAAS_PACKAGE_SKIPPED_GATE_FAMILIES[gate]) {
      if (!seen.has(family)) {
        seen.add(family);
        families.push(family);
      }
    }
  }
  return families;
}
