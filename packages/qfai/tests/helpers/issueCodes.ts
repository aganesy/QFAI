import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * What the source tree says about one issue code, aggregated over every
 * emission site that raises it — `issue(...)` / `makeIssue(...)` calls and
 * object literals that build an `Issue` inline.
 */
export type IssueCodeUsage = {
  /** At least one emission site can raise the code at `error` severity. */
  errorCapable: boolean;
  /**
   * Every error-capable emission site passes its own `suggested_action`.
   * Aggregating with AND (not OR) is deliberate: one call site that carries a
   * remediation says nothing about the other call sites of the same code, and
   * those are exactly the paths that would print the generic `fix` line.
   */
  everyErrorSiteHasSuggestedAction: boolean;
};

/** One place in the source that constructs an `Issue` with a literal code. */
type EmissionSite = {
  code: string;
  errorCapable: boolean;
  hasSuggestedAction: boolean;
};

async function collectTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTsFiles(full)));
    } else if (entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

/** Skip a string / template literal starting at `start`; returns the index of its closing quote. */
function skipString(source: string, start: number): number {
  const quote = source[start];
  let i = start + 1;
  while (i < source.length) {
    if (source[i] === "\\") {
      i += 2;
      continue;
    }
    if (source[i] === quote) {
      return i;
    }
    i++;
  }
  return source.length;
}

/**
 * Split the top-level members of the bracketed list whose opening bracket sits
 * at `open` — call arguments for `(`, object properties for `{`.
 * Returns `null` when the list is not balanced (a truncated or malformed file).
 */
function splitBalancedList(source: string, open: number): string[] | null {
  const members: string[] = [];
  let depth = 0;
  let start = open + 1;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(source, i);
      continue;
    }
    if (ch === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      if (end < 0) return null;
      i = end + 1;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) {
        members.push(source.slice(start, i).trim());
        return members;
      }
      continue;
    }
    if (ch === "," && depth === 1) {
      members.push(source.slice(start, i).trim());
      start = i + 1;
    }
  }
  return null;
}

/**
 * Index of the `{` that opens the innermost object/block still open at `index`,
 * or `null` when `index` sits at the top level.
 */
function findEnclosingBrace(source: string, index: number): number | null {
  const open: number[] = [];
  for (let i = 0; i < index; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(source, i);
      continue;
    }
    if (ch === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      if (end < 0) return null;
      i = end + 1;
      continue;
    }
    if (ch === "{") {
      open.push(i);
    } else if (ch === "}") {
      open.pop();
    }
  }
  return open.length > 0 ? open[open.length - 1] : null;
}

const ISSUE_CALL_RE = /\b(issue|makeIssue)\(\s*"([A-Za-z][A-Za-z0-9_-]*)"/g;
const OBJECT_CODE_RE = /(?:^|[\s{,(])code:\s*"([A-Za-z][A-Za-z0-9_-]*)"/g;
const PROPERTY_RE = /^([A-Za-z_$][A-Za-z0-9_$]*)\s*(?::([\s\S]*))?$/;
const SEVERITY_ARG_INDEX = 2;
const SUGGESTED_ACTION_ARG_INDEX = 7;
const NON_ERROR_SEVERITY_RE = /^"(?:warning|info)"$/;

function isPresentValue(value: string): boolean {
  return value !== "" && value !== "undefined";
}

/** Emission sites of the form `issue("CODE", ...)` / `makeIssue("CODE", ...)`. */
function readCallSites(source: string): EmissionSite[] {
  const sites: EmissionSite[] = [];
  for (const match of source.matchAll(ISSUE_CALL_RE)) {
    const helper = match[1];
    const code = match[2];
    if (match.index === undefined) continue;
    const openParen = source.indexOf("(", match.index + helper.length);
    const args = splitBalancedList(source, openParen);
    // `makeIssue` has no severity parameter and always produces an error.
    const severity = helper === "makeIssue" ? '"error"' : (args?.[SEVERITY_ARG_INDEX] ?? "");
    const suggested = args?.[SUGGESTED_ACTION_ARG_INDEX] ?? "";
    sites.push({
      code,
      // A computed severity expression is treated as error-capable: the catalog
      // requirement should err towards demanding metadata, not towards skipping it.
      errorCapable: !NON_ERROR_SEVERITY_RE.test(severity),
      hasSuggestedAction: isPresentValue(suggested),
    });
  }
  return sites;
}

/**
 * Emission sites of the form `{ code: "CODE", severity: ..., ... }`. An object
 * literal counts as an `Issue` only when it also names `severity` directly:
 * that field is required by the type, and demanding it keeps look-alike shapes
 * (schema-validation records, config descriptors) out of the catalog census.
 */
function readObjectSites(source: string): EmissionSite[] {
  const sites: EmissionSite[] = [];
  for (const match of source.matchAll(OBJECT_CODE_RE)) {
    if (match.index === undefined) continue;
    const codeIndex = source.indexOf("code:", match.index);
    const brace = findEnclosingBrace(source, codeIndex);
    if (brace === null) continue;
    const members = splitBalancedList(source, brace);
    if (members === null) continue;

    const properties = new Map<string, string>();
    for (const member of members) {
      const property = PROPERTY_RE.exec(member);
      if (!property) continue;
      properties.set(property[1], (property[2] ?? property[1]).trim());
    }
    const code = properties.get("code");
    if (code !== `"${match[1]}"`) continue;
    const severity = properties.get("severity");
    if (severity === undefined) continue;

    sites.push({
      code: match[1],
      errorCapable: !NON_ERROR_SEVERITY_RE.test(severity),
      hasSuggestedAction: isPresentValue(properties.get("suggested_action") ?? ""),
    });
  }
  return sites;
}

function foldSites(sites: Iterable<EmissionSite>, into: Map<string, IssueCodeUsage>): void {
  for (const site of sites) {
    const previous = into.get(site.code);
    into.set(site.code, {
      errorCapable: (previous?.errorCapable ?? false) || site.errorCapable,
      everyErrorSiteHasSuggestedAction:
        (previous?.everyErrorSiteHasSuggestedAction ?? true) &&
        (!site.errorCapable || site.hasSuggestedAction),
    });
  }
}

/**
 * Scan `srcDir` for literal issue-code emissions. Only codes written as a
 * literal — the first argument of `issue`/`makeIssue`, or a `code:` property of
 * an inline `Issue` object — are collected; codes assembled at runtime are out
 * of scope.
 */
export async function collectIssueCodeUsage(srcDir: string): Promise<Map<string, IssueCodeUsage>> {
  const merged = new Map<string, IssueCodeUsage>();
  for (const filePath of await collectTsFiles(srcDir)) {
    const source = await readFile(filePath, "utf-8");
    foldSites(readCallSites(source), merged);
    foldSites(readObjectSites(source), merged);
  }
  return merged;
}
