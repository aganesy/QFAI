export type HtmlMockParseResult = {
  externalUrls: string[];
  localRefs: string[];
  unsafeUrls: string[];
  eventHandlers: string[];
  varUsages: VarUsage[];
  stateAttributes: string[];
  breakpointAttributes: string[];
  inlineDimensions: InlineDimension[];
  colorPairs: ColorPair[];
  scriptTags: number;
  parseErrors: string[];
};

export type VarUsage = {
  property: string;
  tokenName: string;
  fallback: string;
};

export type VarCallUsage = {
  index: number;
  tokenName: string;
  fallback: string;
};

export type InlineDimension = {
  element: string;
  width: number | null;
  height: number | null;
  interactive: boolean;
};

export type ColorPair = {
  element: string;
  color: string;
  backgroundColor: string;
};

const TOKEN_COMMENT_RE = /\/\*\s*token:\s*\{([^}]+)\}\s*\*\//g;

export function extractTokenComments(text: string): string[] {
  const comments: string[] = [];
  for (const match of text.matchAll(TOKEN_COMMENT_RE)) {
    if (match[1]) comments.push(match[1].trim());
  }
  return comments;
}

export function collectVarUsages(text: string | null): VarCallUsage[] {
  if (!text) {
    return [];
  }

  const usages: VarCallUsage[] = [];
  let searchFrom = 0;

  while (searchFrom < text.length) {
    const start = text.indexOf("var(", searchFrom);
    if (start < 0) {
      break;
    }

    const parsed = parseVarCall(text, start);
    if (!parsed) {
      searchFrom = start + 4;
      continue;
    }

    const tokenName = parsed.tokenExpr.trim();
    if (tokenName.startsWith("--")) {
      usages.push({
        index: start,
        tokenName,
        fallback: parsed.fallbackExpr.trim(),
      });
    }
    searchFrom = parsed.nextIndex;
  }

  return usages;
}

const CSS_COMMENT_RE = /\/\*[\s\S]*?(?:\*\/|$)/g;
// `@namespace` names a namespace, not a resource, even in its `url()` form.
const CSS_NAMESPACE_RULE_RE = /@namespace\b[^;]*;?/gi;
const CSS_URL_FUNCTION_RE =
  /\b(?:url|src)\(\s*(?:"((?:[^"\\]|\\[\s\S])*)"|'((?:[^'\\]|\\[\s\S])*)'|((?:[^)\s"'\\]|\\[0-9a-f]{1,6}[ \t\n\r\f]?|\\[\s\S])*))\s*\)/gi;
const CSS_IMPORT_STRING_RE = /@import\s+(?:"((?:[^"\\]|\\[\s\S])*)"|'((?:[^'\\]|\\[\s\S])*)')/gi;
const CSS_IMAGE_SET_RE = /(?:-webkit-)?image-set\(/gi;
const CSS_STRING_RE = /"((?:[^"\\]|\\[\s\S])*)"|'((?:[^'\\]|\\[\s\S])*)'/g;
const CSS_TYPE_FUNCTION_RE = /\btype\(\s*(?:"(?:[^"\\]|\\[\s\S])*"|'(?:[^'\\]|\\[\s\S])*')\s*\)/gi;
const CSS_ESCAPE_RE = /\\(?:([0-9a-f]{1,6})[ \t\n\r\f]?|([\s\S]))/gi;

function unescapeCss(value: string): string {
  return value.replace(
    CSS_ESCAPE_RE,
    (_match, hex: string | undefined, char: string | undefined) => {
      if (hex !== undefined) {
        const codePoint = Number.parseInt(hex, 16);
        return codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : "�";
      }
      // An escaped line break continues a string onto the next line and stands for nothing.
      return char === "\n" ? "" : (char ?? "");
    },
  );
}

/** The first non-undefined capture group of a match: one of the quoted or bare alternatives. */
function firstCapture(match: RegExpMatchArray): string {
  // A group that did not take part is undefined at run time, whatever the array type says.
  const groups: (string | undefined)[] = match.slice(1);
  return groups.find((group) => group !== undefined) ?? "";
}

/**
 * Every URL a stylesheet or a `style` attribute value names as a resource: each
 * `url()` and `src()` in its quoted and unquoted forms, the string form of
 * `@import`, and the bare strings of `image-set()`. Comments are skipped, and so is
 * `@namespace`, which names a namespace rather than a resource. Each URL is
 * returned with its CSS escapes resolved and its surrounding whitespace trimmed.
 */
export function collectCssUrlReferences(css: string | null): string[] {
  if (!css) {
    return [];
  }
  const text = css.replace(CSS_COMMENT_RE, " ").replace(CSS_NAMESPACE_RULE_RE, " ");
  const refs: string[] = [];

  for (const match of text.matchAll(CSS_URL_FUNCTION_RE)) {
    refs.push(firstCapture(match));
  }
  for (const match of text.matchAll(CSS_IMPORT_STRING_RE)) {
    refs.push(firstCapture(match));
  }
  for (const match of text.matchAll(CSS_IMAGE_SET_RE)) {
    const open = match.index + match[0].length;
    const close = findClosingParen(text, open);
    const inner = text
      .slice(open, close)
      .replace(CSS_TYPE_FUNCTION_RE, " ")
      .replace(CSS_URL_FUNCTION_RE, " ");
    for (const str of inner.matchAll(CSS_STRING_RE)) {
      refs.push(firstCapture(str));
    }
  }

  return refs.map((ref) => unescapeCss(ref).trim()).filter((ref) => ref !== "");
}

/** The index of the `)` closing the group opened just before `from`, or the text's end. */
function findClosingParen(text: string, from: number): number {
  let depth = 1;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") {
      depth += 1;
    } else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return text.length;
}

const HTML_WHITESPACE_RE = /[\t\n\f\r ]/;

/**
 * The URLs of a `srcset` or `imagesrcset` value, read as the HTML standard reads
 * image candidates: a URL runs to the next whitespace, trailing commas end it, and
 * its descriptors run to the next comma outside parentheses. A `data:` URL keeps
 * the commas inside it.
 */
export function parseSrcsetUrls(value: string): string[] {
  const urls: string[] = [];
  let i = 0;
  while (i < value.length) {
    while (i < value.length && (HTML_WHITESPACE_RE.test(value[i] ?? "") || value[i] === ",")) {
      i += 1;
    }
    const start = i;
    while (i < value.length && !HTML_WHITESPACE_RE.test(value[i] ?? "")) {
      i += 1;
    }
    let url = value.slice(start, i);
    if (url.endsWith(",")) {
      url = url.replace(/,+$/, "");
    } else {
      let depth = 0;
      while (i < value.length) {
        const ch = value[i];
        if (ch === "(") {
          depth += 1;
        } else if (ch === ")") {
          depth = Math.max(0, depth - 1);
        } else if (ch === "," && depth === 0) {
          break;
        }
        i += 1;
      }
    }
    if (url !== "") {
      urls.push(url);
    }
  }
  return urls;
}

/**
 * The URL a `<meta http-equiv="refresh">` `content` value redirects to, or `null`
 * when it only reloads: the delay, a `;` or `,`, an optional `url=` and the URL,
 * quoted or not.
 */
export function parseRefreshUrl(content: string): string | null {
  const delay = /^[\t\n\f\r ]*[\d.]*[\t\n\f\r ]*[;,]?[\t\n\f\r ]*/.exec(content);
  let rest = content.slice(delay ? delay[0].length : 0);
  const label = /^url[\t\n\f\r ]*=[\t\n\f\r ]*/i.exec(rest);
  if (label) {
    rest = rest.slice(label[0].length);
  }
  const quote = rest[0];
  if (quote === '"' || quote === "'") {
    const end = rest.indexOf(quote, 1);
    rest = rest.slice(1, end < 0 ? undefined : end);
  }
  const url = rest.trim();
  return url === "" ? null : url;
}

function parseVarCall(
  text: string,
  start: number,
): { tokenExpr: string; fallbackExpr: string; nextIndex: number } | null {
  let i = start + 4;
  let depth = 1;
  while (i < text.length && depth > 0) {
    const ch = text[i];
    if (ch === "(") {
      depth += 1;
    } else if (ch === ")") {
      depth -= 1;
    }
    i += 1;
  }

  if (depth !== 0) {
    return null;
  }

  const inner = text.slice(start + 4, i - 1);
  const commaIndex = findTopLevelComma(inner);
  const tokenExpr = commaIndex >= 0 ? inner.slice(0, commaIndex) : inner;
  const fallbackExpr = commaIndex >= 0 ? inner.slice(commaIndex + 1) : "";
  return { tokenExpr, fallbackExpr, nextIndex: i };
}

function findTopLevelComma(text: string): number {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") {
      depth += 1;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (ch === "," && depth === 0) {
      return i;
    }
  }
  return -1;
}
