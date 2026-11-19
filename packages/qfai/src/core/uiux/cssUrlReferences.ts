/**
 * The resource URLs a piece of CSS names, read in one pass from left to right.
 *
 * A tokenizer rather than regular expressions, for two reasons. Order matters: a
 * `/*` inside a string or an unquoted `url()` opens no comment, so comments cannot
 * be stripped first. And every step consumes at least one character with no
 * backtracking, so the time stays linear however a hostile mock is written.
 */

const CSS_WHITESPACE = new Set([" ", "\t", "\n", "\r", "\f"]);
const LINE_BREAKS = new Set(["\n", "\r", "\f"]);
const HEX_DIGIT_RE = /^[0-9a-f]$/i;
const IDENT_CHAR_RE = /^[a-z0-9_\u0080-￿-]$/i;
const DIGIT_RE = /^[0-9]$/;
const IDENT_START_RE = /^[a-z_\u0080-￿-]$/i;

/** Functions whose own string arguments are resource URLs. */
const STRING_URL_FUNCTIONS = new Set(["src", "image-set", "-webkit-image-set"]);

type Scanned = { value: string; next: number };

/** U+FFFD, which an escape stands for when it names no character or ends the text. */
const REPLACEMENT_CHARACTER = String.fromCodePoint(0xfffd);

/**
 * Whether `css[i]` starts an escape: a backslash not followed by a line break. A
 * backslash that ends the text is one too, standing for U+FFFD.
 */
function startsEscape(css: string, i: number): boolean {
  return css[i] === "\\" && !LINE_BREAKS.has(css[i + 1] ?? "");
}

/** Reads the escape at `css[i]`: up to six hex digits and one whitespace, or one character. */
function readEscape(css: string, i: number): Scanned {
  let j = i + 1;
  let hex = "";
  while (j < css.length && hex.length < 6 && HEX_DIGIT_RE.test(css[j] ?? "")) {
    hex += css[j] ?? "";
    j += 1;
  }
  if (hex === "") {
    return { value: css[j] ?? REPLACEMENT_CHARACTER, next: Math.min(j + 1, css.length) };
  }
  if (CSS_WHITESPACE.has(css[j] ?? "")) {
    j += 1;
  }
  const codePoint = Number.parseInt(hex, 16);
  const valid =
    codePoint > 0 && codePoint <= 0x10ffff && (codePoint < 0xd800 || codePoint > 0xdfff);
  return { value: valid ? String.fromCodePoint(codePoint) : REPLACEMENT_CHARACTER, next: j };
}

/** Reads an identifier from `css[i]`, its escapes resolved. */
function readIdent(css: string, i: number): Scanned {
  let j = i;
  let value = "";
  while (j < css.length) {
    if (startsEscape(css, j)) {
      const escape = readEscape(css, j);
      value += escape.value;
      j = escape.next;
    } else if (IDENT_CHAR_RE.test(css[j] ?? "")) {
      value += css[j] ?? "";
      j += 1;
    } else {
      break;
    }
  }
  return { value, next: j };
}

/** Reads the string opening at `css[i]`; an unescaped line break or the end closes it. */
function readString(css: string, i: number): Scanned {
  const quote = css[i];
  let j = i + 1;
  let value = "";
  while (j < css.length) {
    const ch = css[j] ?? "";
    if (ch === quote) {
      return { value, next: j + 1 };
    }
    if (LINE_BREAKS.has(ch)) {
      return { value, next: j };
    }
    if (ch === "\\") {
      if (LINE_BREAKS.has(css[j + 1] ?? "")) {
        // An escaped line break continues the string and stands for nothing.
        j += 2;
        continue;
      }
      if (j + 1 >= css.length) {
        // A backslash that ends the text inside a string stands for nothing.
        j += 1;
        continue;
      }
      const escape = readEscape(css, j);
      value += escape.value;
      j = escape.next;
      continue;
    }
    value += ch;
    j += 1;
  }
  return { value, next: j };
}

/**
 * Reads the body of a `url(` from `css[i]`, just after its parenthesis, through the
 * closing one. The URL is `null` when the body is not a single URL, which a browser
 * does not load; an unclosed body at the end of the text is still a URL, as CSS reads it.
 */
function readUrlBody(css: string, i: number): { value: string | null; next: number } {
  let j = i;
  while (CSS_WHITESPACE.has(css[j] ?? "")) j += 1;
  let value = "";
  let valid = true;
  if (css[j] === '"' || css[j] === "'") {
    const str = readString(css, j);
    value = str.value;
    j = str.next;
  } else {
    while (j < css.length && css[j] !== ")" && !CSS_WHITESPACE.has(css[j] ?? "")) {
      if (startsEscape(css, j)) {
        const escape = readEscape(css, j);
        value += escape.value;
        j = escape.next;
        continue;
      }
      const ch = css[j] ?? "";
      if (ch === '"' || ch === "'" || ch === "(" || ch === "\\") valid = false;
      value += ch;
      j += 1;
    }
  }
  while (CSS_WHITESPACE.has(css[j] ?? "")) j += 1;
  if (j < css.length && css[j] !== ")") {
    // A bad URL: skip its remnants to the closing parenthesis, which an escape does not close.
    valid = false;
    while (j < css.length && css[j] !== ")") {
      j = startsEscape(css, j) ? readEscape(css, j).next : j + 1;
    }
  }
  return { value: valid ? value : null, next: j + 1 };
}

/**
 * Every URL a stylesheet or a `style` attribute value names as a resource: each
 * `url()`, quoted or not, the strings of `src()` and `image-set()`, and the string
 * form of `@import`. A function name is read with its escapes resolved, so
 * `\75rl(` is `url(`. Comments are skipped, and so is `@namespace`, which names a
 * namespace rather than a resource. Each URL is returned with its escapes
 * resolved and its surrounding whitespace trimmed.
 */
export function collectCssUrlReferences(css: string | null): string[] {
  if (!css) {
    return [];
  }
  const refs: string[] = [];
  const push = (value: string | null): void => {
    const trimmed = value?.trim();
    if (trimmed) refs.push(trimmed);
  };
  // The function each open parenthesis belongs to, "" for a bare one.
  const open: string[] = [];
  let afterImport = false;
  let i = 0;

  while (i < css.length) {
    const ch = css[i] ?? "";
    if (CSS_WHITESPACE.has(ch)) {
      i += 1;
      continue;
    }
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end < 0 ? css.length : end + 2;
      continue;
    }
    const wasAfterImport = afterImport;
    afterImport = false;

    if (ch === '"' || ch === "'") {
      const str = readString(css, i);
      if (wasAfterImport || STRING_URL_FUNCTIONS.has(open.at(-1) ?? "")) push(str.value);
      i = str.next;
    } else if (ch === "@") {
      const name = readIdent(css, i + 1);
      const keyword = name.value.toLowerCase();
      if (keyword === "namespace") {
        const end = css.indexOf(";", name.next);
        i = end < 0 ? css.length : end + 1;
      } else {
        afterImport = keyword === "import";
        i = name.next;
      }
    } else if (ch === "#" || DIGIT_RE.test(ch)) {
      // A hash such as `#url(` or a dimension such as `1url(` holds a name but
      // opens no function: read past the name with its prefix.
      let j = i + 1;
      while (j < css.length && (DIGIT_RE.test(css[j] ?? "") || css[j] === ".")) j += 1;
      i = readIdent(css, j).next;
    } else if (IDENT_START_RE.test(ch) || startsEscape(css, i)) {
      const name = readIdent(css, i);
      i = name.next;
      if (css[i] === "(") {
        const fn = name.value.toLowerCase();
        if (fn === "url") {
          const body = readUrlBody(css, i + 1);
          push(body.value);
          i = body.next;
        } else {
          open.push(fn);
          i += 1;
        }
      }
    } else if (ch === "(") {
      open.push("");
      i += 1;
    } else if (ch === ")") {
      open.pop();
      i += 1;
    } else {
      i += 1;
    }
  }

  return refs;
}
