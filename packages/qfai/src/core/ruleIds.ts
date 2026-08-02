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
 *
 * Both spellings of each rule live here — the `code` the CLI prints and the
 * `rule` the finding carries. `waivers.ts#resolveRuleKeys` accepts either, so a
 * reader that knows only one of them would misclassify a waiver written with
 * the other.
 */

/**
 * `TDDLIST_EXCEPTION_PARKED` — a `tdd/test-list.md` row parked at
 * `Status=exception`.
 *
 * This is the `rule` the finding carries; {@link EXCEPTION_PARKED_CODE} is the
 * `code` an operator reads out of `validate.json`. Kept as a rule id rather than
 * a dotted validator path so the pre-`resolveRuleKeys` grammar could accept it;
 * the code spelling is now the canonical waiver key and this one a back-compat
 * alias.
 */
export const EXCEPTION_PARKED_RULE_ID = "TDDLIST-001";

/** The `code` published for {@link EXCEPTION_PARKED_RULE_ID}. */
export const EXCEPTION_PARKED_CODE = "TDDLIST_EXCEPTION_PARKED";

/**
 * `TDDLIST_UNKNOWN_LEVEL` — a `06_Test-Cases.md` row whose `Level` is outside
 * the vocabulary QFAI knows.
 *
 * A project may deliberately ship its own Level vocabulary; `.qfai/waivers.yml`
 * is the mechanism for that, so the finding is emitted under a waivable rule id.
 * {@link UNKNOWN_LEVEL_CODE} is the spelling an operator reads.
 */
export const UNKNOWN_LEVEL_RULE_ID = "TDDLIST-002";

/** The `code` published for {@link UNKNOWN_LEVEL_RULE_ID}. */
export const UNKNOWN_LEVEL_CODE = "TDDLIST_UNKNOWN_LEVEL";
