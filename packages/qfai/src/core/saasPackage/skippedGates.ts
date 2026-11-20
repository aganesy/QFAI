/**
 * SaaS-package profile skip-set (SSOT).
 *
 * The `saas-package` validate profile deliberately skips the gates
 * that require ATDD / implement-class artifacts. A SaaS-tenant
 * package ships without exercising those phases by design, so each
 * skip surfaces as a `QFAI-SAAS-003` info finding
 * rather than failing the run.
 *
 * Keep the list small and intentional. The certify-side counterpart
 * (separate skill / spec) must reference the same set so the
 * "what was skipped" surface is symmetric across `validate` and
 * `certify`.
 */
export const SAAS_PACKAGE_SKIPPED_GATES = [
  "validateStoryTreeObligations",
  "validateTestTodoStubs",
  "validateStoryTreeDrift",
] as const;

export type SaasPackageSkippedGate = (typeof SAAS_PACKAGE_SKIPPED_GATES)[number];

/**
 * Finding-code families each skipped gate would have produced.
 *
 * `SAAS_PACKAGE_SKIPPED_GATES` names validator functions, which is the right
 * granularity for the `QFAI-SAAS-003` findings, but the
 * partial-profile notice in `validate.json` speaks in code families.
 *
 * Keyed by `SaasPackageSkippedGate`, not `string`, so the two lists cannot
 * drift: a gate added to the skip-set without a family here is a missing-key
 * compile error, and a family entry for a gate not in the skip-set is an
 * excess-key one. Typed as `Record<string, …>` neither held, and the guarantee
 * rested entirely on a runtime test.
 *
 * An entry covers what the skipped gate can emit. Prefixes are used only when
 * the gate owns the whole family; shared families are enumerated.
 */
export const SAAS_PACKAGE_SKIPPED_GATE_FAMILIES: Record<SaasPackageSkippedGate, readonly string[]> =
  {
    validateStoryTreeObligations: [
      "QFAI-STORY-006",
      "QFAI-STORY-007",
      "QFAI-STORY-008",
      "QFAI-STORY-009",
      "QFAI-SCAN-002",
    ],
    validateTestTodoStubs: ["QFAI-TEST-*"],
    validateStoryTreeDrift: [
      "QFAI-DRIFT-001",
      "QFAI-DRIFT-002",
      "QFAI-DRIFT-003",
      "QFAI-STORY-010",
      "QFAI-SCAN-002",
    ],
  };

/** Deduped, order-preserving code families the saas-package profile skips. */
export function saasPackageSkippedGateFamilies(): string[] {
  // A `Set` iterates in insertion order, so it both dedupes and keeps the
  // first-seen order across the three gates.
  return [
    ...new Set(
      SAAS_PACKAGE_SKIPPED_GATES.flatMap((gate) => SAAS_PACKAGE_SKIPPED_GATE_FAMILIES[gate]),
    ),
  ];
}
