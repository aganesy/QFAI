/**
 * Shared constants and helpers for TDD list processing.
 *
 * The layer constants and the TC-Refs / parent-ID helpers are shared by the
 * `tddList` validator and the report generator, which is what keeps their
 * classification identical. The status sets below are the report generator's
 * alone — the validator owns its own `VALID_STATUSES` and does not read them.
 */

/**
 * Level values that ARE TDD coverage targets, in every spelling the shipped
 * artifacts use. `06_Test-Cases.md` writes `L1`…`L5`; the ledger schema and
 * the layer catalog write words. Both must classify identically.
 *
 * **Membership is lower-case only.** The artifacts write `L1` and `Unit`, but
 * the entries here are the normalized forms, so a caller MUST apply
 * `.trim().toLowerCase()` before `has()` — `UNIT_COMPONENT_LAYERS.has("L1")` is
 * `false`. Use {@link classifyCoverageLevel} or {@link isCoverageTargetLevel},
 * which normalize for you; reach for the raw set only to enumerate the
 * vocabulary.
 */
export const UNIT_COMPONENT_LAYERS = new Set(["unit", "component", "l1", "l2"]);

/**
 * Layers explicitly excluded from TDD coverage targets.
 * Unknown Level values are conservatively included to avoid silent false negatives.
 *
 * The `l3` / `l4` / `l5` / `api` spellings are the same ATDD vocabulary the
 * TC-layer routing in `atddTraceability.ts` accepts. Without them a
 * `Level: L4` TC is unknown here, so `--profile full` counted it as a TDD
 * obligation and raised `TDDLIST_TC_NOT_COVERED` even when the TC carried its
 * correct `tests/api/**` annotation.
 *
 * **Membership is lower-case only**, on the same terms as
 * {@link UNIT_COMPONENT_LAYERS}: `NON_COVERAGE_LAYERS.has("L3")` is `false`.
 */
export const NON_COVERAGE_LAYERS = new Set([
  "integration",
  "e2e",
  "system",
  "acceptance",
  "api",
  "l3",
  "l4",
  "l5",
]);

export type LevelClassification = "coverage-target" | "non-coverage" | "unrecognized";

/**
 * Classifies a `Level` cell against the known vocabulary.
 *
 * Previously the check was exclusion-only against a word set the shipped
 * template never produces (`L1`…`L5` matched nothing), so the documented
 * "unit/component only" filter excluded no test case at all and
 * `TDDLIST_TC_NOT_COVERED` demanded a ledger row for every TC. Classifying
 * positively means an unrecognized value is *visible* rather than silently
 * becoming a coverage target.
 */
export function classifyCoverageLevel(level: string): LevelClassification {
  const normalized = level.trim().toLowerCase();
  if (normalized.length === 0) return "coverage-target";
  if (UNIT_COMPONENT_LAYERS.has(normalized)) return "coverage-target";
  if (NON_COVERAGE_LAYERS.has(normalized)) return "non-coverage";
  return "unrecognized";
}
/**
 * Determine whether a Level value should be treated as a coverage target.
 * An unrecognized value still returns `true` (conservative: avoids silent
 * coverage gaps) — callers that can report it should use
 * `classifyCoverageLevel` and surface the `unrecognized` case.
 */
export function isCoverageTargetLevel(level: string): boolean {
  return classifyCoverageLevel(level) !== "non-coverage";
}

/**
 * The only status that means an item is finished.
 *
 * This used to include `green` and `refactor`, so `qfai report` counted rows
 * toward `done:` that `qfai-implement` names as grounds for *refusing* to
 * declare completion. A `green` or `refactor` row has by construction not
 * cleared its blocking reviewers or checkpoint verification — exactly the
 * checks that separate "a test passes" from "this item is done". The bias was
 * one-directional (never pessimistic) and unbounded, since the discount equals
 * the number of `green` + `refactor` rows, which the report did not print.
 */
export const TDD_DONE_STATUSES = new Set(["done"]);

/**
 * Has a passing test, has not finished its gates.
 *
 * Kept as its own bucket rather than folded into either neighbour: "the test
 * passes" is real progress worth reporting, and conflating it with `done` is
 * what made the headline unusable.
 */
export const TDD_IN_REVIEW_STATUSES = new Set(["green", "refactor", "review-fix"]);

/**
 * Split a TC-Refs cell value into individual TC reference strings.
 * Accepts comma, semicolon, or whitespace as delimiters.
 */
export function splitTcRefs(cell: string): string[] {
  return cell
    .trim()
    .split(/[,;\s]+/)
    .filter((r) => r.length > 0);
}

/**
 * Resolve the parent TC-ID from a sub-ID reference.
 * Example: "TC-0001-0001" → "TC-0001".
 * Returns `undefined` when the reference is already a parent-level ID
 * (i.e., has only one numeric segment like "TC-0001").
 */
export function resolveParentTcId(tcRef: string): string | undefined {
  // Only strip when there are at least two -NNNN segments (sub-ID)
  if (!/^TC-\d{4}-\d{4}/i.test(tcRef)) return undefined;
  const parent = tcRef.replace(/-\d{4}$/, "");
  return parent !== tcRef ? parent : undefined;
}
