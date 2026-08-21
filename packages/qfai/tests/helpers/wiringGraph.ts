/**
 * Text primitives for the "this validator is actually invoked" meta-test.
 *
 * The wiring guard used to decide reachability with `String.includes` over raw
 * file text. Raw text makes three non-calls look like calls: a name mentioned
 * in a doc comment, a name inside a string literal, and a name that only ever
 * appears in an `export { name } from "..."` barrel line. All three kept the
 * guard green for validators that nothing calls — and one of them kept it green
 * for a function that no longer exists in `src/` at all.
 *
 * The primitives here reduce a TypeScript source file to the text that can
 * actually execute, then look for a call expression rather than a bare
 * identifier:
 *
 *   1. {@link stripCommentsAndLiterals} deletes comments, string literals,
 *      template literals and regex literals.
 *   2. {@link stripDeclarationHeaders} deletes `function name(` headers so a
 *      function's own definition never counts as a call to itself.
 *   3. {@link isInvoked} requires `name(` — which an `import`/`export`
 *      statement can never produce.
 *
 * Known limitation: a call written inside a template literal (never how a
 * validator is dispatched) is stripped along with the literal and will not be
 * seen. The primitives err towards "not invoked", which fails loudly rather
 * than passing silently.
 */

/**
 * Punctuation that, as the last significant character, means a following `/`
 * opens a regex literal rather than a division. Without this the scanner reads
 * a pattern such as `/["']/` as the start of a string and swallows the code
 * after it.
 */
const REGEX_OPENING_PUNCTUATION = new Set([
  "(",
  ",",
  "=",
  ":",
  "[",
  "!",
  "&",
  "|",
  "?",
  "{",
  "}",
  ";",
  "+",
  "-",
  "*",
  "%",
  "~",
  "^",
  "<",
  ">",
]);

/** Keywords after which a `/` also opens a regex literal (`return /x/` etc.). */
const REGEX_OPENING_KEYWORD_RE =
  /(?:^|[^\w$])(?:return|typeof|case|in|of|new|delete|void|do|else|yield|await|instanceof|throw)\s*$/;

/** Returns the index just past a `//` line comment starting at `start`. */
function skipLineComment(source: string, start: number): number {
  const end = source.indexOf("\n", start);
  return end === -1 ? source.length : end;
}

/** Returns the index just past a block comment starting at `start`. */
function skipBlockComment(source: string, start: number): number {
  const end = source.indexOf("*/", start + 2);
  return end === -1 ? source.length : end + 2;
}

/**
 * Returns the index just past the quoted run starting at `start`, honouring
 * backslash escapes. An unterminated literal consumes the rest of the file.
 */
function skipQuoted(source: string, start: number, quote: string): number {
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === quote) return i + 1;
    i += 1;
  }
  return source.length;
}

/**
 * Returns the index just past a regex literal starting at `start`. `/` inside a
 * character class does not close the literal.
 */
function skipRegexLiteral(source: string, start: number): number {
  let i = start + 1;
  let inClass = false;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "\n") return i;
    if (ch === "[") inClass = true;
    else if (ch === "]") inClass = false;
    else if (ch === "/" && !inClass) return i + 1;
    i += 1;
  }
  return source.length;
}

/** Decides whether a `/` at this point opens a regex literal. */
function opensRegexLiteral(emitted: string, lastSignificant: string): boolean {
  if (lastSignificant === "") return true;
  if (REGEX_OPENING_PUNCTUATION.has(lastSignificant)) return true;
  return REGEX_OPENING_KEYWORD_RE.test(emitted.slice(-16));
}

/**
 * Removes comments, string/template literals and regex literals from a
 * TypeScript source, replacing each removed run with a single space so token
 * boundaries survive.
 */
export function stripCommentsAndLiterals(source: string): string {
  let out = "";
  let lastSignificant = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i] ?? "";
    const next = source[i + 1] ?? "";
    if (ch === "/" && next === "/") {
      i = skipLineComment(source, i);
    } else if (ch === "/" && next === "*") {
      i = skipBlockComment(source, i);
      out += " ";
    } else if (ch === '"' || ch === "'" || ch === "`") {
      i = skipQuoted(source, i, ch);
      out += " ";
    } else if (ch === "/" && opensRegexLiteral(out, lastSignificant)) {
      i = skipRegexLiteral(source, i);
      out += " ";
    } else {
      out += ch;
      if (!/\s/.test(ch)) lastSignificant = ch;
      i += 1;
    }
  }
  return out;
}

/**
 * Removes `function name(` headers so a definition is never mistaken for a call
 * to itself. The `(` is kept so the parameter list still reads as balanced.
 */
export function stripDeclarationHeaders(code: string): string {
  return code.replace(
    /\b(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*[A-Za-z_$][\w$]*\s*\(/g,
    "function (",
  );
}

/** Reduces a source file to the text a call expression can be searched in. */
export function toExecutableCode(source: string): string {
  return stripDeclarationHeaders(stripCommentsAndLiterals(source));
}

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True when `code` contains a call expression for `name`.
 *
 * `code` must already have gone through {@link toExecutableCode}. A member call
 * (`validators.validateFoo(...)`) counts; a bare identifier in an `import` /
 * `export` statement cannot, because those never place a `(` after the name.
 */
export function isInvoked(name: string, code: string): boolean {
  return new RegExp(String.raw`(?<![\w$])${escapeRegExp(name)}\s*\(`).test(code);
}
