/**
 * Whether a gate-family table entry covers a finding code.
 *
 * A `GATE_GROUP_FAMILIES` entry may carry an ANNOTATION after its pattern —
 * `tdd` holds `"TDDLIST_* (execution state)"` — and a matcher that reads the
 * whole entry as one pattern matches **nothing** against it: `endsWith("*")` is
 * false, so it falls through to an equality test no code can satisfy. A guard
 * built on that reports coverage it never checked (#1200).
 *
 * So the pattern is the first whitespace-delimited token and everything after
 * it is prose for a human reading the table.
 *
 * It lives here because two test files each carried their own copy, and the
 * identical defect in the sibling copy was **not** latent: repairing it there
 * immediately surfaced a real contradiction — `--profile sdd` emitting
 * `TDDLIST_MISSING` while the notice called that prefix unevaluated (#887). A
 * matcher that can silently match nothing is the failure mode where a guard
 * passes because it checked nothing, and two copies are two chances at it.
 */
export function familyMatches(family: string, code: string): boolean {
  const pattern = family.trim().split(/\s+/)[0] ?? "";
  // An entry that is nothing but an annotation covers no code. Answering
  // `false` rather than treating the empty string as a prefix, which
  // `startsWith("")` would make match every code there is.
  if (pattern === "") {
    return false;
  }
  return pattern.endsWith("*") ? code.startsWith(pattern.slice(0, -1)) : pattern === code;
}
