/**
 * The predicate `BR-0017-0030` and `BR-0017-0031` describe: a cost, wall-clock or parallelism claim is
 * backed by captured before-and-after numbers, or it does not land.
 *
 * ## Why the claim is an input and not something this module infers
 *
 * The obvious shape is `evaluate(record)` — scan the prose for claim vocabulary, decide what is being
 * claimed, then look for numbers. It does not work, and the counter-example is in this repository's own
 * decision record rather than in a fixture:
 *
 * - `DR-0017-0009` says the declared parallelism value "measured flakier" and quotes `22.90s` to
 *   `5.49s`. A claim, with numbers.
 * - `DR-0017-0002` says the requirement "is therefore satisfied by ... recording a measurement that
 *   shows a wall-clock regression and keeping the rebuilds". Not a claim — it is describing what the
 *   rule accepts, and it says in the same breath that the baseline "does not exist yet".
 *
 * Both sit inside a `- Decision` bullet. Both cite `BR-0017-0030`. Both contain the word `regression`.
 * Every lexical discriminator that admits the first admits the second, so a scanner would either
 * redden a record that claims nothing, or be narrowed until it catches nothing at all.
 *
 * So the direction is declared by the caller, who is the only party that knows what is being asserted,
 * and this module checks the thing that IS decidable: whether the numbers are there. That is also what
 * the rule is actually about — `BR-0017-0030` forbids a claim "landing on argument", and the argument
 * is exactly the part a machine cannot grade.
 *
 * A first attempt here scanned for `rose` and matched `prose`. Word boundaries, always.
 */

/** What the author asserts the change does. `none` carries no numbers obligation. */
export type ClaimDirection = "saving" | "regression" | "none";

export interface MeasurementPair {
  readonly before: string;
  readonly after: string;
}

export interface ClaimVerdict {
  readonly satisfied: boolean;
  readonly pairs: readonly MeasurementPair[];
  /** Why, in the words the failure should be read in. Non-empty on both outcomes. */
  readonly reason: string;
}

// A quantity: a number, optionally fractional, optionally carrying a unit. Bold markers are stripped
// by the patterns below rather than here, because they wrap the quantity rather than belong to it.
const QUANTITY = String.raw`\d+(?:\.\d+)?\s?(?:ms|s|min|h|%|MB|GB|KB|x)?`;
const BOLD = String.raw`\*{0,2}`;

// The two ways a before-and-after pair is written in prose. Both are anchored on the relation, not on
// the numbers, so two unrelated quantities in one sentence are not read as a measurement.
const PAIR_PATTERNS: readonly RegExp[] = [
  new RegExp(
    String.raw`\bfrom\s+${BOLD}(${QUANTITY})${BOLD}\s+to\s+${BOLD}(${QUANTITY})${BOLD}`,
    "gi",
  ),
  new RegExp(String.raw`${BOLD}(${QUANTITY})${BOLD}\s*(?:->|→)\s*${BOLD}(${QUANTITY})${BOLD}`, "g"),
];

/** Every before-and-after pair the record quotes, in source order, de-duplicated. */
export function capturedPairs(record: string): MeasurementPair[] {
  const seen = new Set<string>();
  const pairs: MeasurementPair[] = [];
  for (const pattern of PAIR_PATTERNS) {
    // `matchAll` requires the global flag and reads `lastIndex`; these literals are module-level and
    // therefore shared, so reset before each walk rather than trusting the previous one to finish.
    pattern.lastIndex = 0;
    for (const match of record.matchAll(pattern)) {
      const before = (match[1] ?? "").trim();
      const after = (match[2] ?? "").trim();
      if (before === "" || after === "") continue;
      const key = `${before}->${after}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ before, after });
    }
  }
  return pairs;
}

/**
 * `BR-0017-0030`. A declared claim must quote at least one before-and-after pair in the record itself,
 * because the evidence tree is ignored by git and a number that lives only there is unreviewable.
 */
export function evaluateMeasurementClaim(input: {
  readonly claim: ClaimDirection;
  readonly record: string;
}): ClaimVerdict {
  const pairs = capturedPairs(input.record);
  if (input.claim === "none") {
    return { satisfied: true, pairs, reason: "no cost, wall-clock or parallelism claim is made" };
  }
  if (pairs.length === 0) {
    return {
      satisfied: false,
      pairs,
      reason:
        `a ${input.claim} is claimed and the record quotes no before-and-after numbers, so the claim ` +
        "lands on argument",
    };
  }
  return {
    satisfied: true,
    pairs,
    reason: `a ${input.claim} is claimed and the record quotes ${String(pairs.length)} captured pair(s)`,
  };
}

/**
 * `AC-0017-0015` via `BR-0017-0031`. A measured wall-clock regression is an ACCEPTING outcome — the
 * rebuilds are kept and the measurement is recorded as the reason. Re-running the comparison until it
 * agrees is forbidden, which is why a negative result has to be able to close the requirement at all.
 */
export function resolveArtifactReuse(input: {
  readonly claim: ClaimDirection;
  readonly record: string;
  readonly rebuildsPresent: boolean;
}): ClaimVerdict {
  const backing = evaluateMeasurementClaim({ claim: input.claim, record: input.record });
  if (input.claim !== "regression") {
    return {
      satisfied: false,
      pairs: backing.pairs,
      reason:
        "this criterion resolves on a measured regression; a saving lands the reuse under the sibling " +
        "criterion instead",
    };
  }
  if (!backing.satisfied) return backing;
  if (!input.rebuildsPresent) {
    return {
      satisfied: false,
      pairs: backing.pairs,
      reason: "a measured regression keeps the rebuilds, and they are gone",
    };
  }
  return {
    satisfied: true,
    pairs: backing.pairs,
    reason: "a measured regression is recorded and the rebuilds are kept",
  };
}
