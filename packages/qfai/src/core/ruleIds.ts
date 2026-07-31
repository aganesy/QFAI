/**
 * Rule ids shared between an emitter and a reader.
 *
 * A rule id that only one module names can live next to its emission. These
 * cannot: `waivers.ts` has to recognise them to decide how a waiver may match,
 * so the string exists in two places and a rename in one would silently stop
 * the other from matching — the waiver would be accepted and then never apply.
 *
 * Kept in its own module rather than imported across: `waivers.ts` reads them
 * while the validators that emit them import `waivers`-adjacent helpers, so a
 * direct import between the two would close a cycle.
 */

/**
 * `TDDLIST_EXCEPTION_PARKED` — a `tdd/test-list.md` row parked at
 * `Status=exception`.
 *
 * Shaped `^[A-Z]+-\d{3}$` because that is what `waivers.ts#resolveRuleId`
 * accepts; a dotted rule path could never be waived, and the accepted-risk case
 * the finding points at would have no way to clear.
 */
export const EXCEPTION_PARKED_RULE_ID = "TDDLIST-001";
