/**
 * C0, DEL and C1 — the ranges a terminal reads as commands, not as text.
 *
 * A predicate rather than a character-class regex: the class is a
 * `no-control-regex` violation, and spelling the ranges as numbers keeps them
 * readable without an eslint suppression.
 */
function isControlChar(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return code < 0x20 || (code >= 0x7f && code <= 0x9f);
}

/**
 * Renders one relative path for stdout.
 *
 * A path only reaches here from the filesystem, and that includes names an
 * untrusted repository chose: an entry whose name carries a newline or an ANSI
 * escape and is printed verbatim is enough to forge the report's own headings
 * or drive the terminal. A report
 * whose purpose is reviewing changes before they happen must not be
 * counterfeitable by the thing it reports on.
 *
 * Ordinary paths are returned untouched — quoting every line would churn the
 * output for the case that is not a threat. Only a name that actually carries a
 * control character is escaped, and then it is quoted so the escapes are read
 * as one token.
 */
export function formatReportPath(relative: string): string {
  let escaped = "";
  let sawControl = false;
  for (const char of relative) {
    if (isControlChar(char)) {
      sawControl = true;
      escaped += `\\x${(char.codePointAt(0) ?? 0).toString(16).padStart(2, "0")}`;
    } else if (char === "\\" || char === '"') {
      escaped += `\\${char}`;
    } else {
      escaped += char;
    }
  }
  return sawControl ? `"${escaped}"` : relative;
}
