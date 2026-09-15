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

/**
 * Keywords whose parenthesised header ends a STATEMENT rather than a value.
 *
 * `if (enabled) /^\s*```/.test(value)` is a legal regex literal, and the `)` before it reads as
 * the end of a call on the character test alone — which leaves the backtick inside the regex free
 * to open a template literal and blank every line down to the next backtick, taking a real
 * declaration with it.
 *
 * The rule is here rather than in `atddTraceability.ts` so that there is one of it: two readers
 * with two rules drift, and the one wired to this function ends up with the older one. Whichever
 * reader is wired next inherits whatever is here.
 */
const CONTROL_STATEMENT_KEYWORDS: ReadonlySet<string> = new Set([
  "if",
  "for",
  "while",
  "switch",
  "catch",
  "with",
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
      // The FLAGS are part of the literal. Left out, they were read as an identifier — and an
      // identifier sets `endsExpression` from the keyword set, so a flag string that happened to
      // spell one would have flipped the next `/` from division to regex.
      let end = i + 1;
      while (end < source.length && /[A-Za-z]/.test(source[end] ?? "")) {
        end += 1;
      }
      return end;
    }
  }
  return source.length;
}

/** End of a `"""` / `\'\'\'` docstring, or end of file when it is never closed. */
/** The closing delimiter for a `%` literal's opening one. */
const PERCENT_PAIRS: ReadonlyMap<string, string> = new Map([
  ["(", ")"],
  ["[", "]"],
  ["{", "}"],
  ["<", ">"],
]);

/**
 * The end of a Ruby `%` literal beginning at `start`, or `-1` where what stands
 * there is a modulo operator rather than a literal.
 *
 * The delimiter is whatever follows the optional type letter, and a bracketing
 * pair nests: `%w[a [b] c]` is one literal, not two.
 */
function endOfPercentLiteral(source: string, start: number): number {
  const letter = source[start + 1] ?? "";
  const opens = /[A-Za-z]/.test(letter) ? start + 2 : start + 1;
  const open = source[opens] ?? "";
  if (open === "" || /[A-Za-z0-9\s]/.test(open)) return -1;
  if (/[A-Za-z]/.test(letter) && !"qQwWiIrsx".includes(letter)) return -1;
  const close = PERCENT_PAIRS.get(open) ?? open;
  let depth = 1;
  for (let index = opens + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === "\\") {
      index += 1;
      continue;
    }
    if (close !== open && char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return source.length;
}

/**
 * The end of a Ruby heredoc whose header begins at `start`, or `-1` where `<<`
 * there is a shift or an append rather than a header.
 *
 * The body runs from the next line to the line holding the terminator alone.
 * The header itself is left in place: it is code, and only what it opens is a
 * literal.
 */
function endOfHeredoc(source: string, start: number): number {
  const header = /^<<([~-]?)(?:(["'])([A-Za-z_][A-Za-z0-9_]*)\2|([A-Z_][A-Z0-9_]*))/.exec(
    source.slice(start),
  );
  if (header === null) return -1;
  const terminator = header[3] ?? header[4] ?? "";
  if (terminator === "") return -1;
  const bodyStart = source.indexOf("\n", start + header[0].length);
  if (bodyStart === -1) return source.length;
  const indented = header[1] !== "";
  const closer = new RegExp(`^${indented ? "[ \\t]*" : ""}${terminator}[ \\t]*\\r?$`);
  let index = bodyStart + 1;
  while (index <= source.length) {
    const lineEnd = source.indexOf("\n", index);
    const line = source.slice(index, lineEnd === -1 ? source.length : lineEnd);
    if (closer.test(line)) return lineEnd === -1 ? source.length : lineEnd;
    if (lineEnd === -1) return source.length;
    index = lineEnd + 1;
  }
  return source.length;
}

/**
 * The end of a Rust character literal beginning at `start`, or `-1` where the
 * apostrophe opens a lifetime instead.
 *
 * A lifetime is an apostrophe and a name with no closing one, so it is told
 * from a literal by what closes rather than by what follows.
 */
function endOfCharLiteral(source: string, start: number): number {
  const literal = /^'(?:\\(?:u\{[0-9A-Fa-f]{1,6}\}|x[0-9A-Fa-f]{2}|.)|[^\\'])'/.exec(
    source.slice(start),
  );
  return literal === null ? -1 : start + literal[0].length;
}

/**
 * The end of a C# verbatim or raw string beginning at `start`, or `-1` where
 * neither opens there.
 *
 * A verbatim string ends at a quote that is not doubled; a raw string ends at a
 * run of quotes at least as long as the one that opened it.
 */
function endOfVerbatimString(source: string, start: number): number {
  if (source.startsWith('"""', start)) {
    const open = /^"{3,}/.exec(source.slice(start))?.[0] ?? '"""';
    const close = source.indexOf(open, start + open.length);
    return close === -1 ? source.length : close + open.length;
  }
  if (!source.startsWith('@"', start)) return -1;
  for (let index = start + 2; index < source.length; index += 1) {
    if (source[index] !== '"') continue;
    if (source[index + 1] === '"') {
      index += 1;
      continue;
    }
    return index + 1;
  }
  return source.length;
}

/** The end of a `(* … *)` comment beginning at `start`, counting nesting. */
function endOfParenStarComment(source: string, start: number): number {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source.startsWith("(*", index)) {
      depth += 1;
      index += 1;
      continue;
    }
    if (source.startsWith("*)", index)) {
      depth -= 1;
      if (depth === 0) return index + 2;
      index += 1;
    }
  }
  return source.length;
}

/** The end of a raw backtick span, which no escape can extend. */
function endOfRawBacktick(source: string, start: number): number {
  const close = source.indexOf("`", start + 1);
  return close === -1 ? source.length : close + 1;
}

function endOfTripleQuoted(source: string, start: number, fence: string): number {
  const close = source.indexOf(fence, start + fence.length);
  return close === -1 ? source.length : close + fence.length;
}

/** Which span kinds {@link maskJsNonCode} blanks. */
export type JsMaskOptions = {
  /**
   * Blank comment spans. Default `true`.
   *
   * `false` for a scanner whose subject LIVES in comments — the ATDD
   * annotation scan reads `/* QFAI:SPEC-0001:TC-0001 *\/`, so blanking
   * comments would stop it finding every real annotation while it went on
   * reading ids out of string and regex literals. The lexer still
   * WALKS the comment either way: skipping it is what keeps a `/` inside it
   * from being read as a regex literal.
   */
  readonly comments?: boolean;

  /**
   * Read `#` as a line comment. Default `false`.
   *
   * `true` for the multi-language carrier scan, which meets Python, Ruby and Gherkin. It stays
   * OFF by default because `#` is not a comment in JavaScript — it opens a private field, and
   * `this.#count = 1;` under a hash-comment rule loses the rest of its line. `#[` (a Rust
   * attribute) and `#!` (a shebang) are excluded whatever this says, because neither is one.
   */
  readonly hashComments?: boolean;

  /**
   * Recognise `\"\"\"` / `\'\'\'` docstrings, which span lines. Default `false`.
   *
   * `true` for the same scan and for the same reason: a Python docstring is one literal, and
   * reading it as three empty strings leaves its body as code.
   */
  readonly tripleQuoted?: boolean;

  /**
   * Recognise Ruby's `%` literals and heredocs. Default `false`.
   *
   * `true` for a Ruby suite. `%q{...}`, `%w[...]` and `<<~SQL ... SQL` are each
   * one literal, and a lexer that knows only quoted strings walks straight past
   * them: an id written in one stays visible, and a scan counting visible ids
   * reads data as an annotation.
   */
  readonly percentLiterals?: boolean;

  /**
   * Read `'` as a lifetime where it does not open a character literal. Default
   * `false`.
   *
   * `true` for Rust. `fn f<'a>(x: &'a str)` holds an odd number of apostrophes,
   * and paired as quotes they swallow the rest of the line — the trailing
   * comment an annotation sits in included.
   */
  readonly lifetimes?: boolean;

  /**
   * Read `//` as a line comment. Default `true`.
   *
   * `false` for Python, where `//` is floor division. Read as a comment, the
   * rest of the line goes unscanned and a quoted id after it stays visible to a
   * caller that keeps comments.
   */
  readonly slashComments?: boolean;

  /**
   * Recognise C#'s verbatim (`@"…"`) and raw (`\"\"\"…\"\"\"`) strings. Default
   * `false`.
   *
   * Both span lines, and the single-line scanner stops at the first newline: an
   * id after that point stays visible while the literal around it is masked.
   */
  readonly verbatimStrings?: boolean;

  /**
   * Recognise `(* … *)` block comments, which nest. Default `false`.
   *
   * `true` for F#, where the generic quote rule reads an apostrophe inside one
   * as a string opener and blanks the comment's remainder — the annotation a
   * comment is a valid place for included.
   */
  readonly parenStarComments?: boolean;

  /**
   * Read a backtick span as raw, with no escapes. Default `false`.
   *
   * `true` for Go, whose raw string ends at the next backtick whatever stands
   * before it. Read with JavaScript's escaping, a trailing backslash consumed
   * the closer and the mask ran on to the next one.
   */
  readonly rawBacktick?: boolean;

  /**
   * Read an unexpected `/` as opening a regular expression. Default `true`.
   *
   * `false` for every language that has no such literal. There a `/` is
   * division, and `4 // 2` put the lexer in front of a second slash where a
   * value had not just ended — read as a regex opener, it blanked the rest of
   * the line and took a trailing comment with it.
   */
  readonly regexLiterals?: boolean;
};

export function maskJsNonCode(source: string, options: JsMaskOptions = {}): string {
  const blankComments = options.comments ?? true;
  const hashComments = options.hashComments ?? false;
  const tripleQuoted = options.tripleQuoted ?? false;
  const percentLiterals = options.percentLiterals ?? false;
  const lifetimes = options.lifetimes ?? false;
  const slashComments = options.slashComments ?? true;
  const verbatimStrings = options.verbatimStrings ?? false;
  const parenStarComments = options.parenStarComments ?? false;
  const rawBacktick = options.rawBacktick ?? false;
  const regexLiterals = options.regexLiterals ?? true;
  const out = source.split("");
  // Whether the token just read closes an expression. It is the whole
  // regex-vs-division test: `a / b` divides, `= /re/` does not. Comments leave
  // it untouched — they are transparent to the token before them.
  let endsExpression = false;
  // The identifier last read, for the `(` that may follow it. Whitespace and comments do not
  // clear it — `if /* why */ (x)` is still a control header — and every other token does.
  let lastWord = "";
  // One entry per open `(`: whether it opened a control statement's header. A STACK rather than
  // the backward walk this rule arrived with, which had to bound itself with a lookback limit to
  // stay linear and counted parens inside strings and comments on the way. The stack is exact and
  // costs nothing, because the pass has already skipped those spans by the time it gets here.
  const controlHeader: boolean[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i] ?? "";
    const next = source[i + 1] ?? "";
    if (hashComments && ch === "#" && next !== "[" && next !== "!") {
      const end = endOfLineComment(source, i);
      i = blankComments ? blank(out, i, end) : end;
    } else if (tripleQuoted && (ch === '"' || ch === "'") && source.startsWith(ch.repeat(3), i)) {
      i = blank(out, i, endOfTripleQuoted(source, i, ch.repeat(3)));
      endsExpression = true;
      lastWord = "";
    } else if (parenStarComments && ch === "(" && next === "*") {
      const end = endOfParenStarComment(source, i);
      i = blankComments ? blank(out, i, end) : end;
    } else if (
      verbatimStrings &&
      (ch === "@" || ch === '"') &&
      endOfVerbatimString(source, i) !== -1
    ) {
      i = blank(out, i, endOfVerbatimString(source, i));
      endsExpression = true;
      lastWord = "";
    } else if (slashComments && ch === "/" && next === "/") {
      const end = endOfLineComment(source, i);
      i = blankComments ? blank(out, i, end) : end;
    } else if (ch === "/" && next === "*") {
      const end = endOfBlockComment(source, i);
      i = blankComments ? blank(out, i, end) : end;
    } else if (
      percentLiterals &&
      ch === "%" &&
      // A typed literal names itself: `%q{…}` is one wherever it stands, and a
      // command argument such as `logger.debug %q{…}` follows an identifier. The
      // bare form is the ambiguous one, and only it waits for a position where a
      // modulo operator cannot be.
      (/[A-Za-z]/.test(next) || !endsExpression)
    ) {
      const end = endOfPercentLiteral(source, i);
      if (end === -1) {
        i += 1;
        endsExpression = false;
      } else {
        i = blank(out, i, end);
        endsExpression = true;
        lastWord = "";
      }
    } else if (percentLiterals && ch === "<" && next === "<") {
      const end = endOfHeredoc(source, i);
      if (end === -1) {
        i += 2;
        endsExpression = false;
      } else {
        // The header stays: it is code, and only the body it opens is a literal.
        const bodyStart = source.indexOf("\n", i);
        i = bodyStart === -1 ? end : blank(out, bodyStart, end);
        endsExpression = true;
        lastWord = "";
      }
    } else if (lifetimes && ch === "'") {
      const end = endOfCharLiteral(source, i);
      if (end === -1) {
        // A lifetime, so the apostrophe names nothing and closes nothing.
        i += 1;
        endsExpression = true;
      } else {
        i = blank(out, i, end);
        endsExpression = true;
        lastWord = "";
      }
    } else if (ch === "'" || ch === '"') {
      i = blank(out, i, endOfQuoted(source, i, ch));
      endsExpression = true;
      lastWord = "";
    } else if (ch === "`") {
      i = blank(out, i, rawBacktick ? endOfRawBacktick(source, i) : endOfTemplate(source, i));
      endsExpression = true;
      lastWord = "";
    } else if (regexLiterals && ch === "/" && !endsExpression) {
      i = blank(out, i, endOfRegexLiteral(source, i));
      endsExpression = true;
      lastWord = "";
    } else if (WORD.test(ch)) {
      const start = i;
      while (i < source.length && WORD.test(source[i] ?? "")) {
        i += 1;
      }
      lastWord = source.slice(start, i);
      endsExpression = !REGEX_AFTER_KEYWORD.has(lastWord);
    } else {
      if (!SPACE.test(ch)) {
        if (ch === "(") {
          controlHeader.push(CONTROL_STATEMENT_KEYWORDS.has(lastWord));
          endsExpression = false;
        } else if (ch === ")") {
          // A control header closes a STATEMENT, so what follows starts a new expression and a
          // `/` there opens a regex. Every other `)` closes a call or a group, which is a value.
          // An unmatched `)` falls back to "a value ended", the reading before this rule existed.
          endsExpression = !(controlHeader.pop() ?? false);
        } else {
          // `]` closes an index — an expression. A `}` is left open on purpose: after a block it
          // does not end one, and reading a regex as a division is the costlier mistake.
          endsExpression = ch === "]";
        }
        lastWord = "";
      }
      i += 1;
    }
  }
  return out.join("");
}
