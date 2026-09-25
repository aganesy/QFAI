/**
 * JSONC with its comments and trailing commas taken out, so `JSON.parse` reads
 * it. A `//` or `/*` inside a string is text, not a comment.
 */
export function withoutJsoncSyntax(content: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < content.length; i += 1) {
    const char = content[i] ?? "";
    const next = content[i + 1] ?? "";
    if (inString) {
      out += char;
      if (char === "\\") {
        out += next;
        i += 1;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
    } else if (char === "/" && next === "/") {
      const end = content.indexOf("\n", i);
      i = end === -1 ? content.length : end - 1;
    } else if (char === "/" && next === "*") {
      const end = content.indexOf("*/", i + 2);
      i = end === -1 ? content.length : end + 1;
    } else if (char === "," && /^\s*[}\]]/.test(withoutLeadingComments(content.slice(i + 1)))) {
      // A trailing comma: the next thing that is not a comment closes the value.
    } else {
      out += char;
    }
  }
  return out;
}

/** Text with leading whitespace and comments removed, up to its first token. */
function withoutLeadingComments(text: string): string {
  let rest = text;
  for (;;) {
    const trimmed = rest.trimStart();
    if (trimmed.startsWith("//")) {
      const end = trimmed.indexOf("\n");
      rest = end === -1 ? "" : trimmed.slice(end + 1);
    } else if (trimmed.startsWith("/*")) {
      const end = trimmed.indexOf("*/");
      rest = end === -1 ? "" : trimmed.slice(end + 2);
    } else {
      return trimmed;
    }
  }
}
