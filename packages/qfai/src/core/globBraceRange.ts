/**
 * Brace ranges, expanded the way fast-glob expands them.
 *
 * A matcher that reads test globs itself, rather than handing them to
 * fast-glob, has to agree with it about which names a range selects, or it
 * vouches for a file the scan never collects, or refuses one it does.
 */

/**
 * The number of steps from which fast-glob refuses a numeric brace range written
 * without an increment. It refuses the whole pattern then, not only the range.
 */
const BRACE_RANGE_LIMIT = 1000;

/** The most members a range is enumerated to, so a compiled glob stays bounded. */
const BRACE_RANGE_MEMBER_CAP = 10_000;

/** A range fast-glob refuses, which leaves the pattern holding it selecting nothing. */
export class BraceRangeRefused extends Error {}

/**
 * The members a brace body expands to when it is a range, or `null` when the
 * body is not one.
 *
 * Two integers give a numeric range, `1..5` or `5..1`. It is zero-padded to its
 * widest part when any of the endpoints or the increment is written with a
 * leading zero, as `01..10` and `0..10..05` are. Two single characters give a
 * range over their code points, as `a..e` does. A third part is the increment,
 * whose sign is ignored and which is `1` when it is `0` or empty. An empty
 * result is a range too wide to enumerate, which matches nothing.
 *
 * @throws {BraceRangeRefused} for a numeric range fast-glob refuses to expand.
 */
export function braceRangeMembers(body: string): readonly string[] | null {
  const parts = body.split("..");
  if (parts.length < 2 || parts.length > 3) return null;
  const [from = "", to = "", increment = ""] = parts;
  if (!/^[+-]?\d*$/.test(increment)) return null;
  const step = Math.max(1, Math.abs(Number(increment)));
  const integer = /^[+-]?\d+$/;
  if (integer.test(from) && integer.test(to)) {
    return numericRangeMembers(from, to, increment, step);
  }
  if (Array.from(from).length === 1 && Array.from(to).length === 1) {
    return characterRangeMembers(from, to, step);
  }
  return null;
}

function numericRangeMembers(
  from: string,
  to: string,
  increment: string,
  step: number,
): readonly string[] {
  const start = Number(from);
  const end = Number(to);
  // fast-glob's own test, which it applies to an ascending range written without
  // an increment and to no other.
  if (increment === "" && (end - start) / step >= BRACE_RANGE_LIMIT) {
    throw new BraceRangeRefused();
  }
  const count = Math.floor(Math.abs(end - start) / step) + 1;
  // SIMPLIFIED: a range past the member cap matches nothing here, though
  // fast-glob expands one written with an increment whatever its length.
  // Lift when: a project's glob names a range of more than ten thousand values.
  if (count > BRACE_RANGE_MEMBER_CAP) return [];
  // A leading minus sign still pads, and a leading plus sign never does.
  const padded = [from, to, increment].some((part) => /^-?0\d/.test(part));
  const width = padded ? Math.max(from.length, to.length, increment.length) : 0;
  const direction = start <= end ? 1 : -1;
  return Array.from({ length: count }, (_, index) => {
    const value = start + direction * index * step;
    const sign = value < 0 ? "-" : "";
    return sign + String(Math.abs(value)).padStart(width - sign.length, "0");
  });
}

function characterRangeMembers(from: string, to: string, step: number): readonly string[] {
  const start = from.codePointAt(0) ?? 0;
  const end = to.codePointAt(0) ?? 0;
  const count = Math.floor(Math.abs(end - start) / step) + 1;
  // SIMPLIFIED: a character range past the member cap matches nothing here,
  // though fast-glob expands it whole.
  // Lift when: a project's glob names a range of more than ten thousand characters.
  if (count > BRACE_RANGE_MEMBER_CAP) return [];
  const direction = start <= end ? 1 : -1;
  return Array.from({ length: count }, (_, index) =>
    String.fromCodePoint(start + direction * index * step),
  );
}
