/**
 * The two rules the record guards share for reading this record's prose.
 *
 * Both are here for the same reason, which is the lesson those guards keep proving about themselves:
 * **two copies of a rule diverge, and the one nobody is looking at is the one that is wrong.** Each of
 * these existed in two or three places, each was fixed at the site a finding named, and each time the
 * other copy carried the defect into the next round.
 */

/**
 * Whether a markdown line is SHOWN rather than ASSERTED.
 *
 * Markdown renders a blockquote as a quotation, so a claim inside one appears to the reader as quoted —
 * which is why `retractedClaims.test.ts` records the exemption as a decision rather than an oversight,
 * "the one route round 10 demonstrated that is meant to stay open".
 *
 * Round 18 widened the depth-score pin's anchor to `^[ \t>]*[-*+] ` to catch a `> - ` bullet carrying a
 * contradicting score, and in doing so made a blockquote an assertion in that guard while it stayed a
 * quotation in the other. A record quoting its own withdrawn score — the practice `retractedClaims`
 * exists to require — then reddened a required `e2e` leg.
 */
export function isQuotation(line: string): boolean {
  return /^\s*>/.test(line);
}

/**
 * Spelled-out numerals, because that is how this record's sentences read.
 *
 * The table's job is to READ a numeral, not to bound one, so a word it cannot read is reported as
 * unreadable rather than treated as a mismatch. It ran out at `fifteen` until round 15's gatekeeper
 * pointed out that round 16 was therefore red whatever the record said — a pin whose needle is a closed
 * enumeration, which is the defect the retracted-claims guard names in its own words about its own
 * alternation.
 *
 * **That fix reached one of the two copies.** The other stopped at `twenty`, and round 19 evaluated what
 * it would do at round 21: against "Twenty-one packs, one per round" the needle fails at `Twenty`,
 * backtracks, matches at `one`, and reports "states one where the tree holds 21" — a true record called
 * wrong, without even reaching the branch built to say "no numeral table here can read this". The
 * hyphenated keys are the point: `[ \t]+` does not cross a hyphen, so `twenty-one` has to be one key.
 */
export const WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  "twenty-one": 21,
  "twenty-two": 22,
  "twenty-three": 23,
  "twenty-four": 24,
  "twenty-five": 25,
  "twenty-six": 26,
  "twenty-seven": 27,
  "twenty-eight": 28,
  "twenty-nine": 29,
  thirty: 30,
  "thirty-one": 31,
  "thirty-two": 32,
  "thirty-three": 33,
  "thirty-four": 34,
  "thirty-five": 35,
};
