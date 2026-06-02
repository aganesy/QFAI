/**
 * `prototyping.mode` discriminator + medium gate-relaxation.
 *
 * `qfai.config.yaml#prototyping.mode` defaults to `convergence`. The
 * `qfai prototyping iterate --mode <convergence|exploration>` flag
 * overrides config. Under `exploration` the prototyping profile
 * applies a *medium* relaxation: soft-rubric findings (axes-exceptional
 * loop completion + design-compliance drift) downgrade error →
 * warning while structural / schema / path / license (exit 66) gates
 * stay hard error.
 *
 * The set of codes that DOWNGRADE under exploration is the SSOT here;
 * any new code added in the future must explicitly opt in.
 *
 * The relaxation is applied as a pure post-filter on issue arrays so
 * the underlying validators do not need to know about the mode flag.
 */

import type { Issue, IssueSeverity } from "../types.js";

export type PrototypingMode = "convergence" | "exploration";

/**
 * Issue codes that downgrade error → warning under exploration mode
 * (medium relaxation). Each entry guards a soft-rubric gate the operator
 * is intentionally exploring against — failing them mid-run should
 * NOT block the iteration.
 *
 * Adding a code here is a structural decision: a reviewer-gate
 * finding, a soft-rubric gate, or a design-compliance check whose
 * "drift = mid-exploration probe" interpretation is intended.
 *
 * Hard-error gates (schema, path, license, exit 66) are NEVER added
 * here.
 */
export const EXPLORATION_RELAXABLE_CODES: readonly string[] = [
  "QFAI-CRIT-008", // loop not completed across viewports
  "QFAI-DCON-030", // design contract drift (DESIGN.md / lock)
  "QFAI-DCON-031", // design contract drift (paired lock value)
  "QFAI-DCON-032", // design contract drift (paired token surface)
] as const;

/**
 * Issue codes that MUST stay hard error under exploration mode. This
 * set is the explicit, narrow allowlist of "structural / schema /
 * path / license (exit 66)" gates referenced by the spec. Used by
 * the unit test to assert disjointness; the runtime relaxation does
 * not consult this list (anything not in `RELAXABLE` is left alone).
 */
export const EXPLORATION_HARD_ERROR_CODES: readonly string[] = [
  "QFAI-PROT-002", // schema / required-field gate
  "QFAI-PROT-LIC", // license verify (exit 66)
  "QFAI-PROT-PATH", // path / iter layout
] as const;

/**
 * Type guard for `PrototypingMode`. Avoids the bare-`as` assertion on
 * `Set.has()` and tightens the narrowing to the discriminated union
 * (CLAUDE.md "TypeScript: avoid bare `as` type assertions; prefer
 * type narrowing").
 */
function isPrototypingMode(value: string): value is PrototypingMode {
  return value === "convergence" || value === "exploration";
}

/**
 * Resolve the effective mode from the (optional) CLI flag value and
 * (optional) config value. Order of precedence:
 *
 *   1. CLI override (when valid)
 *   2. Config value (when valid)
 *   3. Default: `convergence`
 *
 * Invalid CLI values silently fall back to the next layer (defensive:
 * a typoed value must not silently relax gates). Invalid CONFIG
 * values fall back to convergence AND emit a one-line warning via
 * the injected `warn` sink so the operator can spot a typoed
 * `prototyping.mode` instead of seeing the default convergence
 * behaviour quietly applied. CLI validity (`markInvalid()`) is
 * already enforced upstream in `args.ts`; config typos are not, so
 * the warning closes the asymmetry.
 */
export function resolvePrototypingMode(input: {
  readonly cli: string | undefined;
  readonly config: string | undefined;
  /** Optional warn sink; defaults to a no-op so unit tests stay quiet. */
  readonly warn?: (message: string) => void;
}): PrototypingMode {
  if (input.cli !== undefined && isPrototypingMode(input.cli)) {
    return input.cli;
  }
  if (input.config !== undefined && isPrototypingMode(input.config)) {
    return input.config;
  }
  // Surface a non-empty-but-unknown config value as a warning. The CLI
  // path already markInvalid()s typoed values, so this is the only
  // remaining layer where a typo can silently fall through.
  if (input.config !== undefined && input.config.length > 0 && !isPrototypingMode(input.config)) {
    input.warn?.(
      `qfai prototyping: ignoring unknown prototyping.mode=${JSON.stringify(
        input.config,
      )} (falling back to default convergence; valid values: convergence, exploration).`,
    );
  }
  return "convergence";
}

/**
 * Apply medium gate-relaxation to an issue array. Returns a new array
 * (input is not mutated) with the relaxable codes downgraded from
 * `error` to `warning` when `mode === "exploration"`. Under
 * `convergence` the input is returned verbatim.
 */
export function relaxIssuesForMode(
  issues: readonly Issue[],
  mode: PrototypingMode,
): readonly Issue[] {
  if (mode !== "exploration") return issues;
  const relaxable = new Set(EXPLORATION_RELAXABLE_CODES);
  return issues.map((iss) => {
    if (!relaxable.has(iss.code)) return iss;
    if (iss.severity !== "error") return iss;
    const downgraded: IssueSeverity = "warning";
    return { ...iss, severity: downgraded };
  });
}
