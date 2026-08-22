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
 * it would do at the twenty-first round: the needle failed at the hyphenated word, backtracked, and
 * matched at the trailing `one`, reporting a count of 1 against a correct record — without even
 * reaching the branch built to say a numeral table cannot read it. The hyphenated keys are the point: `[ \t]+` does not cross a hyphen, so `twenty-one` has to be one key.
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

/**
 * A numeral alternation over `WORDS`, longest key first.
 *
 * `Object.keys` order puts `twenty` before `twenty-one`, and a regex alternation is first-match, not
 * longest-match — so `twenty-one` captured as `twenty` in two of the three needles that used it, which
 * is the exact defect `WORDS`'s own doc comment above says the hyphenated keys exist to prevent. The
 * keys were right and the alternation built from them was not.
 */
export const NUMERAL_PATTERN = `\\d+|${Object.keys(WORDS)
  .sort((a, b) => b.length - a.length)
  .join("|")}`;

/** A numeral token — digits or a spelled-out word — as the number it names, or NaN. */
export function numeralValue(token: string): number {
  return /^\d+$/.test(token) ? Number(token) : (WORDS[token.toLowerCase()] ?? Number.NaN);
}

/**
 * The index of the next markdown heading at or after `from`, or `-1`, **ignoring headings inside a
 * fenced block**.
 *
 * Round 19 widened three region terminators from an enumeration of heading levels (`#{2,4}`, `^## `,
 * `#{3}`) to any level, because each was one heading away from round 17's defect. Round 20 showed the
 * widening opened a different hole in the same place: a `# comment` inside a ```text block now ends a
 * section, so a phantom class C member hidden behind one is invisible — round 15's finding restored by
 * the repair for round 19's.
 *
 * A heading is a heading only outside a fence, and this is the one place that is decided.
 */
export function nextHeadingAt(text: string, from: number): number {
  let inFence = false;
  let at = from;
  while (at < text.length) {
    const lineEnd = text.indexOf("\n", at);
    const stop = lineEnd === -1 ? text.length : lineEnd;
    const line = text.slice(at, stop);
    if (/^\s{0,3}(?:```|~~~)/.test(line)) inFence = !inFence;
    else if (!inFence && at > from && /^#{1,6} /.test(line)) return at;
    if (lineEnd === -1) return -1;
    at = lineEnd + 1;
  }
  return -1;
}
