/**
 * Whether a markdown line is SHOWN rather than ASSERTED.
 *
 * Markdown renders a blockquote as a quotation, so a claim inside one appears to the reader as
 * quoted — which is why `retractedClaims.test.ts` records the exemption as a decision rather than an
 * oversight, "the one route round 10 demonstrated that is meant to stay open".
 *
 * **It lives here because two instruments in this stage's work decided it opposite ways.** Round 18
 * widened the depth-score pin's anchor to `^[ \t>]*[-*+] ` to catch a `> - ` bullet carrying a
 * contradicting score, and in doing so made a blockquote an assertion in that guard while it stayed a
 * quotation in this one. A record quoting its own withdrawn score — the practice `retractedClaims`
 * exists to require — then reddened a required `e2e` leg. Two copies of one rule, and the one nobody
 * was looking at was wrong: the sixth time this stage has recorded that about its own work, and the
 * reason the rule is a shared function now instead of a spelling in two regexes.
 */
export function isQuotation(line: string): boolean {
  return /^\s*>/.test(line);
}
