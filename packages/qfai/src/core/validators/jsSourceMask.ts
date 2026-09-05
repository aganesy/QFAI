/**
 * Blanks the spans of a JS/TS source that can hold the *text* of a construct
 * but never an executing one: comments, string literals, template literals and
 * regular-expression literals.
 *
 * A regex detector run over a raw file cannot tell `it.skip("x", fn)` from
 * `const source = 'it.skip("x", fn)'` in a code-generator fixture, or from an
 * example spelled out in a comment. That matters most for a validator whose
 * whole job is to scan a repository's own test files, where both are routine:
 * a generator/parser suite that holds the construct as data would be reported
 * as a parked test and fail `--fail-on warning` with nothing actually skipped.
 *
 * Blanked characters are replaced **one for one** with a space, and newlines
 * are kept, so the returned text has the same length and the same line breaks
 * as the input: a match offset in the masked text is the same offset in the
 * original, and the line a finding reports is still the line the construct is
 * written on. It also means a comment standing *inside* a member chain — one
 * written between the root identifier and the `.skip` link — collapses to
 * whitespace rather than splitting the chain, so a real call written that way
 * still matches.
 *
 * This is a lexer, not a parser — it is called once per test file over a scan
 * of thousands of them, and the constructs it has to recognise are lexical.
 * Two deliberate bounds keep a misread cheap:
 *
 * - a quoted string ends at its closing quote **or at the newline**, because
 *   JS has none that span lines. A stray `'` this lexer misreads therefore
 *   costs one line, not the rest of the file.
 * - a regex literal likewise ends at the newline. The regex/division split is
 *   decided from whether the previous token ends an expression, which is a
 *   heuristic; bounding it to the line bounds the cost of getting it wrong.
 *
 * Over-blanking can only ever hide a construct (a false negative). It cannot
 * invent one, because blanking never introduces a character other than a
 * space.
 */

/** Identifier / numeric-literal characters. */
const WORD = /[A-Za-z0-9_$]/;

/** Whitespace, matched one character at a time. */
const SPACE = /\s/;

/**
 * Keywords a `/` may directly follow while still opening a regex literal.
 *
 * Every other identifier ends an expression, which makes the `/` a division.
 */
const REGEX_AFTER_KEYWORD: ReadonlySet<string> = new Set([
  "await",
  "case",
  "delete",
  "do",
  "else",
  "in",
  "instanceof",
  "new",
  "of",
  "return",
  "throw",
  "typeof",
  "void",
  "yield",
]);

/** Blanks `[start, end)`, keeping newlines, and answers `end` for the caller. */
function blank(out: string[], start: number, end: number): number {
  for (let i = start; i < end; i += 1) {
    if (out[i] !== "\n") {
      out[i] = " ";
    }
  }
  return end;
}

/** End of a `//` comment — the newline itself is left in place. */
function endOfLineComment(source: string, start: number): number {
  const newline = source.indexOf("\n", start);
  return newline === -1 ? source.length : newline;
}

/** End of a block comment, or end of file when it is never closed. */
function endOfBlockComment(source: string, start: number): number {
  const close = source.indexOf("*/", start + 2);
  return close === -1 ? source.length : close + 2;
}

/** End of a `'` / `"` string, or the newline when it is left unterminated. */
function endOfQuoted(source: string, start: number, quote: string): number {
  for (let i = start + 1; i < source.length; i += 1) {
    const ch = source[i] ?? "";
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === "\n") {
      return i;
    }
    if (ch === quote) {
      return i + 1;
    }
  }
  return source.length;
}

/**
 * End of a template literal, treated as opaque.
 *
 * A `${…}` substitution is blanked with the rest of it. Nothing declares a
 * test inside one, so resolving the nesting would buy this validator nothing.
 */
function endOfTemplate(source: string, start: number): number {
  for (let i = start + 1; i < source.length; i += 1) {
    const ch = source[i] ?? "";
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === "`") {
      return i + 1;
    }
  }
  return source.length;
}

/** End of a regex literal — `[…]` may hold an unescaped `/`; a newline cannot. */
function endOfRegexLiteral(source: string, start: number): number {
  let inCharClass = false;
  for (let i = start + 1; i < source.length; i += 1) {
    const ch = source[i] ?? "";
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === "\n") {
      return i;
    }
    if (inCharClass) {
      inCharClass = ch !== "]";
      continue;
    }
    if (ch === "[") {
      inCharClass = true;
      continue;
    }
    if (ch === "/") {
      return i + 1;
    }
  }
  return source.length;
}

/** Which span kinds {@link maskJsNonCode} blanks. */
export type JsMaskOptions = {
  /**
   * Blank comment spans. Default `true`.
   *
   * `false` for a scanner whose subject LIVES in comments — the ATDD
   * annotation scan reads `/* QFAI:SPEC-0001:TC-0001 *\/`, so blanking
   * comments would stop it finding every real annotation while it went on
   * reading ids out of string and regex literals (#1141). The lexer still
   * WALKS the comment either way: skipping it is what keeps a `/` inside it
   * from being read as a regex literal.
   */
  readonly comments?: boolean;
};

export function maskJsNonCode(source: string, options: JsMaskOptions = {}): string {
  const blankComments = options.comments ?? true;
  const out = source.split("");
  // Whether the token just read closes an expression. It is the whole
  // regex-vs-division test: `a / b` divides, `= /re/` does not. Comments leave
  // it untouched — they are transparent to the token before them.
  let endsExpression = false;
  let i = 0;
  while (i < source.length) {
    const ch = source[i] ?? "";
    const next = source[i + 1] ?? "";
    if (ch === "/" && next === "/") {
      const end = endOfLineComment(source, i);
      i = blankComments ? blank(out, i, end) : end;
    } else if (ch === "/" && next === "*") {
      const end = endOfBlockComment(source, i);
      i = blankComments ? blank(out, i, end) : end;
    } else if (ch === "'" || ch === '"') {
      i = blank(out, i, endOfQuoted(source, i, ch));
      endsExpression = true;
    } else if (ch === "`") {
      i = blank(out, i, endOfTemplate(source, i));
      endsExpression = true;
    } else if (ch === "/" && !endsExpression) {
      i = blank(out, i, endOfRegexLiteral(source, i));
      endsExpression = true;
    } else if (WORD.test(ch)) {
      const start = i;
      while (i < source.length && WORD.test(source[i] ?? "")) {
        i += 1;
      }
      endsExpression = !REGEX_AFTER_KEYWORD.has(source.slice(start, i));
    } else {
      if (!SPACE.test(ch)) {
        // `)` and `]` close a call, a group or an index — all expressions. A
        // `}` is left open on purpose: after a block it does not end one, and
        // reading a regex as a division is the costlier mistake of the two.
        endsExpression = ch === ")" || ch === "]";
      }
      i += 1;
    }
  }
  return out.join("");
}
