/**
 * Reading where a migration report item points. The contract says an item names a file and a line;
 * it does not fix the separator, so a test accepts every common spelling.
 */

/** Matches an item that names `file` and `line` together, in either order. */
export function atLocation(file: string, line: number): RegExp {
  const name = file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `${name}(?:\\s*[:,]\\s*|\\s*\\(\\s*line\\s+|\\s+line\\s+)${line}\\b|\\bline\\s+${line}\\b[^\\n]*${name}`,
    "i",
  );
}
