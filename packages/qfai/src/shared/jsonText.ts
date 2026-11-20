/**
 * Parses JSON text a user supplied, after dropping one leading UTF-8 byte order mark.
 *
 * Windows PowerShell 5.1 writes `Set-Content -Encoding UTF8` output with a byte order mark, and
 * `readFile(…, "utf8")` keeps it as U+FEFF, which `JSON.parse` refuses. Only one mark is removed:
 * a second one is content, and the parse reports it as the input's problem.
 */
export function parseJsonText(text: string): unknown {
  return JSON.parse(text.startsWith("\uFEFF") ? text.slice(1) : text);
}
