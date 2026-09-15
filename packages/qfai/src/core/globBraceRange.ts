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
/**
 * An endpoint with its quotes taken off, as the expander takes them.
 *
 * Measured: `{'p'..'p'}` expands to `p`, and so do the double-quoted and
 * backtick forms, while `{'ab'..'c'}` expands to nothing — the quotes come off
 * each endpoint before the range is read, and only a single character is left
 * standing for a character range. An endpoint read with its quotes still on
 * matched neither branch below, so a pattern the scan expands read as one
 * naming no member.
 */
function unquoted(endpoint: string): string {
  const quote = endpoint[0] ?? "";
  if (!"'\"`".includes(quote)) return endpoint;
  return endpoint.length >= 2 && endpoint.endsWith(quote) ? endpoint.slice(1, -1) : endpoint;
}

export function braceRangeMembers(body: string): readonly string[] | null {
  const parts = body.split("..");
  if (parts.length < 2 || parts.length > 3) return null;
  const [rawFrom = "", rawTo = "", increment = ""] = parts;
  const from = unquoted(rawFrom);
  const to = unquoted(rawTo);
  if (!/^[+-]?\d*$/.test(increment)) return null;
  const step = Math.max(1, Math.abs(Number(increment)));
  // The forms the expander reads as numbers, measured: `1e3` expands as 1000
  // and `1.0` as 1, while `0x10` expands as nothing at all. The value has to be
  // a whole number as well as written like one — `1.5` is left as text, so a
  // range holding it names no member and the pattern matches itself.
  const integer = /^[+-]?(?:\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)$/;
  const whole = (endpoint: string): boolean =>
    integer.test(endpoint) && Number.isInteger(Number(endpoint));
  if (whole(from) && whole(to)) {
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
