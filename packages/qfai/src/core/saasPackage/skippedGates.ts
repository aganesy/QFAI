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
export const SAAS_PACKAGE_SKIPPED_GATES: readonly string[] = [
  "validateAtddCodeTraceability",
  "validateTddList",
  "validateTestTodoStubs",
  "validateTraceabilityIntegrity",
] as const;

/**
 * Finding-code families each skipped gate would have produced.
 *
 * `SAAS_PACKAGE_SKIPPED_GATES` names validator functions, which is the right
 * granularity for the `D-SAAS-PACKAGE-VERIFY-SKIPPED` findings, but the
 * partial-profile notice in `validate.json` speaks in code families. Deriving
 * one from the other keeps the two surfaces from drifting: a gate added to the
 * skip-set without a family here fails `saasPackageSkipFamilies` typing.
 */
export const SAAS_PACKAGE_SKIPPED_GATE_FAMILIES: Record<string, readonly string[]> = {
  validateAtddCodeTraceability: ["QFAI-ATDD-*"],
  validateTddList: ["TDDLIST_*"],
  validateTestTodoStubs: ["QFAI-TEST-001"],
  validateTraceabilityIntegrity: ["QFAI-TRACE-*"],
};

/** Deduped, order-preserving code families the saas-package profile skips. */
export function saasPackageSkippedGateFamilies(): string[] {
  const families: string[] = [];
  for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
    for (const family of SAAS_PACKAGE_SKIPPED_GATE_FAMILIES[gate] ?? []) {
      if (!families.includes(family)) {
        families.push(family);
      }
    }
  }
  return families;
}
