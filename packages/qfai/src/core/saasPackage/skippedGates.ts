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
