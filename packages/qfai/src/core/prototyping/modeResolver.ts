/**
 * Mode resolver for prototyping obligations.
 *
 * Separates static-first obligations (default) from runtime-heavy checks (opt-in).
 * Static-first default ensures prototyping completes without browser/backend installed.
 *
 * NOTE: v1.7.5 scope is foundation-only. This module defines the obligation
 * vocabulary and resolution logic. Wiring into the prototyping command/validator
 * evaluation path is deferred to v1.7.6 when the full mode-switching UX is added.
 */

export type PrototypingMode = "default" | "standard" | "low-cost" | "full-harness";

/** Static obligations that require no runtime infrastructure. */
export const STATIC_OBLIGATIONS = ["source", "route", "state", "contract-level"] as const;

/** Runtime-heavy checks that require external infrastructure (opt-in only). */
export const RUNTIME_HEAVY_CHECKS = [
  "api-non-404",
  "db-existence",
  "ui-route-reachability",
] as const;

/** Full-harness includes all checks. */
const FULL_HARNESS_OBLIGATIONS = [...STATIC_OBLIGATIONS, ...RUNTIME_HEAVY_CHECKS] as const;

/**
 * Resolve the active obligation set for a given prototyping mode.
 *
 * - `"default"` / `"standard"`: static obligations only
 * - `"low-cost"`: static obligations (runtime-heavy excluded)
 * - `"full-harness"`: static + runtime-heavy obligations
 */
export function resolveObligations(mode: PrototypingMode): string[] {
  switch (mode) {
    case "default":
    case "standard":
      return [...STATIC_OBLIGATIONS];
    case "low-cost":
      return [...STATIC_OBLIGATIONS];
    case "full-harness":
      return [...FULL_HARNESS_OBLIGATIONS];
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown prototyping mode: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Resolve obligations with explicit opt-in for runtime-heavy checks.
 * Only checks listed in RUNTIME_HEAVY_CHECKS are accepted as opt-ins.
 */
export function resolveObligationsWithOptIn(mode: PrototypingMode, optIn: string[]): string[] {
  const base = resolveObligations(mode);
  const validOptIns = optIn.filter((o) => (RUNTIME_HEAVY_CHECKS as readonly string[]).includes(o));
  return [...new Set([...base, ...validOptIns])];
}
