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
 *
 * Weakening a gate is the same act as waiving one, so it carries the
 * same audit surface: each downgraded finding is stamped
 * `relaxedFrom: "error"` (the counterpart of the waiver engine's
 * `suppressed: true`) and one `info` notice per run names the mode,
 * the file it was read from and the codes affected.
 */

import type { Issue, IssueSeverity } from "../types.js";
import { PROTOTYPING_JSON_REL } from "./paths.js";

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
 * Issue codes that MUST stay hard error under exploration mode. Used
 * by the unit test to assert disjointness with `RELAXABLE`; the
 * runtime relaxation does not consult this list (anything not in
 * `RELAXABLE` is left alone).
 *
 * This is NOT a hand-picked sample, and it is not scoped to a source
 * directory. It is the COMPLETE set of codes that can reach
 * `relaxIssuesForMode` at `error` severity, minus the relaxable ones —
 * that is, every gate that survives exploration.
 *
 * "Can reach" is decidable because the relaxation has exactly one
 * production call site: `runPrototypingValidators` applies it to the
 * combined issues of every validator it runs. The unit test derives
 * the set by walking that function's call graph, reading the `code`
 * and `severity` of each emission, and asserting SET EQUALITY with
 * this list.
 *
 * Reachability, not file location, is what makes an entry real. A
 * validator whose source sits beside the prototyping ones but which
 * the pipeline never calls emits nothing at run time, so listing its
 * codes would describe a gate that does not exist. Conversely the
 * UI/UX and discussion-pack validators do run in this profile, so
 * their errors are real gates and are listed here.
 *
 * Equality is what makes the list bite in both directions: moving a
 * gate into `EXPLORATION_RELAXABLE_CODES` drops it from the derived
 * set and fails equality until it is removed from here too, so a
 * relaxation cannot be introduced silently — it costs a deliberate
 * edit in two places, in one diff. A newly added gate likewise fails
 * equality until it is listed, forcing the hard-vs-relaxable call to
 * be made explicitly.
 *
 * Structural non-entries, each by construction rather than by
 * omission:
 *
 *   - `QFAI-PROT-010` (screen-id casing) is emitted at `warning`, so
 *     there is nothing for the relaxation to downgrade.
 *   - `R-EXPLORATION-CERTIFY-ATTEMPT` is raised by the certify
 *     command, which does not run this post-filter at all.
 *   - The license gate has no code. `licenseVerify` produces no
 *     `Issue`: its failure is an exit-66 hard stop raised in
 *     `cli/commands/prototypingIterate.ts` before any `Issue[]`
 *     exists, so it is out of reach of a code allowlist.
 *
 * Codes emitted through a computed expression (a parameter or a
 * property read) cannot be attributed by a static scan and so cannot
 * be listed. The unit test pins those call sites and asserts that none
 * of the codes behind them appears in `EXPLORATION_RELAXABLE_CODES`,
 * which is the property this list exists to protect.
 */
export const EXPLORATION_HARD_ERROR_CODES: readonly string[] = [
  // validators/prototypingEvidence.ts — prototyping.json structure
  "QFAI-PROT-001", // prototyping.json missing / unparseable / not an object
  "QFAI-PROT-002", // schema / required-field gate
  "QFAI-PROT-003", // iterations[] must exist and contain at least iter-00
  "QFAI-PROT-004", // iter layout: iterations[i].index contiguity
  "QFAI-PROT-005", // stopReason presence / enum / consistency
  "QFAI-PROT-006", // iterations.length exceeds MAX_ITERATIONS
  "QFAI-PROT-007", // acceptedIterationIndex === iterations.length - 1
  // validators/prototyping/** — linkage, paths, completion certificate
  "QFAI-PROT-008", // specsCovered[] id format / missing spec
  "QFAI-PROT-009", // artifact path integrity (empty / outside-root / missing ref)
  "QFAI-PROT-311", // delegation map: entries must name a role the skill declares
  "QFAI-PROT-335", // completion certificate: required evidence
  "QFAI-PROT-336", // completion certificate: completion claimed without seal
  // validators/uiEvidenceArtifacts.ts — evidence artifact presence / naming
  "QFAI-UIE-001",
  "QFAI-UIE-002",
  "QFAI-UIE-003",
  // validators/configReferenceIntegrity.ts — config path references
  "QFAI-CFG-LINK-001",
  "QFAI-CFG-LINK-003",
  // validators/reviewerGate.ts + evidenceMutationUnlogged.ts
  "R-MOCK-HREF-DRIFT",
  "R-EVIDENCE-MUTATION-UNLOGGED",
  // validators/renderCritique.ts — critique record structure
  "QFAI-CRIT-001",
  "QFAI-CRIT-002",
  "QFAI-CRIT-003",
  "QFAI-CRIT-004",
  "QFAI-CRIT-005",
  "QFAI-CRIT-006",
  "QFAI-CRIT-009",
  "QFAI-CRIT-010",
  // validators/designContractReadiness.ts — non-drift readiness gates
  "QFAI-DCON-001",
  "QFAI-DCON-005",
  "QFAI-DCON-009",
  "QFAI-DCON-012",
  "QFAI-DCON-013",
  "QFAI-DCON-033",
  // validators/designFidelity.ts — statically attributable fidelity gates
  "QFAI-FID-001",
  "QFAI-FID-002",
  "QFAI-FID-003",
  "QFAI-FID-004",
  "QFAI-FID-005",
  "QFAI-FID-006",
  "QFAI-FID-007",
  "QFAI-FID-008",
  "QFAI-FID-009",
  // validators/designToken.ts
  "QFAI-DT-001",
  "QFAI-DT-002",
  "QFAI-DT-004",
  "QFAI-DT-007",
  "QFAI-DT-008",
  "QFAI-DT-009",
  "QFAI-DT-010",
  // validators/htmlMock.ts
  "QFAI-MOCK-001",
  "QFAI-MOCK-002",
  "QFAI-MOCK-003",
  "QFAI-MOCK-004",
  "QFAI-MOCK-010",
  "QFAI-MOCK-011",
  "QFAI-MOCK-012",
  // validators/agentDefinition.ts — statically attributable agent gates
  "QFAI-AGENT-004",
  "QFAI-AGENT-005",
  "QFAI-AGENT-006",
  "QFAI-AGENT-007",
  "QFAI-AGENT-008",
  "QFAI-AGENT-009",
  "QFAI-AGENT-010",
  "QFAI-AGENT-011",
  "QFAI-AGENT-012",
  "QFAI-AGENT-013",
  // validators/bpApDb.ts
  "QFAI-BPAP-001",
  "QFAI-BPAP-002",
  "QFAI-BPAP-003",
  "QFAI-BPAP-004",
  "QFAI-BPAP-005",
  "QFAI-BPAP-006",
  "QFAI-BPAP-007",
  "QFAI-BPAP-008",
  "QFAI-BPAP-009",
  "QFAI-BPAP-010",
  "QFAI-BPAP-011",
  // validators/researchSummary.ts
  "QFAI-RESEARCH-001",
  "QFAI-RESEARCH-003",
  "QFAI-RESEARCH-004",
  "QFAI-RESEARCH-005",
  "QFAI-RESEARCH-006",
  "QFAI-RESEARCH-007",
  "QFAI-RESEARCH-008",
  "QFAI-RESEARCH-009",
  "QFAI-RESEARCH-010",
  "QFAI-RESEARCH-011",
  // validators/uix/** — canonical discussion-pack gates.
  //
  // Reached through `CANONICAL_UIX_VALIDATORS`, the module-level array
  // `runCanonicalUixValidators` maps over: the aggregate holds the only
  // reference to each of these validators, so they run whenever a discussion
  // pack is present and their errors are real gates.
  "UIX-VAL-3LAYER-FORBIDDEN-FILE",
  "UIX-VAL-3LAYER-INCOMPLETE-FAMILY",
  "UIX-VAL-3LAYER-LEGACY-FORMAT",
  "UIX-VAL-3LAYER-MIXED-FORMAT",
  "UIX-VAL-CLASSIFICATION-CONTRADICTION",
  "UIX-VAL-CLASSIFICATION-DUPLICATE-SECONDARY-SURFACE",
  "UIX-VAL-CLASSIFICATION-INVALID-BOOLEAN",
  "UIX-VAL-CLASSIFICATION-INVALID-SECONDARY-SURFACE",
  "UIX-VAL-CLASSIFICATION-INVALID-SURFACE",
  "UIX-VAL-CLASSIFICATION-MISSING",
  "UIX-VAL-CLASSIFICATION-RATIONALE-PLACEHOLDER",
  "UIX-VAL-CLASSIFICATION-REQUIRED-FIELD",
  "UIX-VAL-CLASSIFICATION-SECONDARY-ARRAY",
  "UIX-VAL-CLASSIFICATION-SECONDARY-DUPLICATE",
  "UIX-VAL-OQ-OPEN-CRITICAL",
  "UIX-VAL-SCREEN-CONTRACT-DUPLICATE-ID",
  "UIX-VAL-SCREEN-CONTRACT-LEGACY-FORMAT",
  "UIX-VAL-SCREEN-CONTRACT-SCHEMA-INCOMPLETE",
  "UIX-VAL-SCREEN-CONTRACT-STATE-COVERAGE",
  "UIX-VAL-SIDECAR-MISSING",
  // `validateTrendScan` joined the aggregate after this list was last derived,
  // and the walk could not see it either; its gates are listed for the first
  // time here.
  "UIX-VAL-TREND-CATEGORY-MISSING",
  "UIX-VAL-TREND-ENTRY-MISSING",
  "UIX-VAL-TREND-FIELD-MISSING",
  "UIX-VAL-TREND-SCAN-MISSING",
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
 *
 * Every downgraded finding is stamped with `relaxedFrom: "error"`, the
 * relaxation counterpart of the waiver engine's `suppressed: true`. A
 * consumer reading `validate.json#issues[]` can then tell a gate that
 * a mode flag weakened apart from one the validator authored at
 * `warning` in the first place.
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
    const relaxedFrom: IssueSeverity = iss.severity;
    return { ...iss, severity: downgraded, relaxedFrom };
  });
}

/** Code of the one-per-run notice that reports an applied relaxation. */
export const EXPLORATION_RELAXATION_NOTICE_CODE = "QFAI-PROT-337" as const;

/** Rule slug carried by the relaxation notice. */
export const EXPLORATION_RELAXATION_NOTICE_RULE = "prototypingMode.explorationRelaxation" as const;

/**
 * Tally the `relaxedFrom` stamps left by `relaxIssuesForMode`, keyed by
 * issue code and ordered so the notice message is stable across runs.
 */
function countRelaxedByCode(issues: readonly Issue[]): readonly (readonly [string, number])[] {
  const byCode = new Map<string, number>();
  for (const iss of issues) {
    if (iss.relaxedFrom === undefined) continue;
    byCode.set(iss.code, (byCode.get(iss.code) ?? 0) + 1);
  }
  return [...byCode.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * Build the single `info` finding that reports an applied relaxation,
 * or `null` when nothing was downgraded. Emitting it puts the mode, the
 * file it was read from and the affected codes into `validate.json` and
 * into the CLI's human-readable output, so a reviewer who did not run
 * the gates can see that four declared-`error` gates were weakened.
 */
export function buildExplorationRelaxationNotice(
  issues: readonly Issue[],
  mode: PrototypingMode,
): Issue | null {
  if (mode !== "exploration") return null;
  const byCode = countRelaxedByCode(issues);
  if (byCode.length === 0) return null;
  const total = byCode.reduce((acc, [, count]) => acc + count, 0);
  const breakdown = byCode.map(([code, count]) => `${code} x${count}`).join(", ");
  return {
    code: EXPLORATION_RELAXATION_NOTICE_CODE,
    severity: "info",
    category: "change",
    message: `prototyping.mode=exploration relaxed ${total} finding(s) from error to warning: ${breakdown}.`,
    suggested_action: `Re-run under prototyping.mode=convergence (or clear the mode in ${PROTOTYPING_JSON_REL}) to see these gates at their declared severity.`,
    file: PROTOTYPING_JSON_REL,
    rule: EXPLORATION_RELAXATION_NOTICE_RULE,
    refs: byCode.map(([code]) => code),
  };
}
