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

/** One place in the source that constructs an `Issue` with a statically known code. */
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

const ISSUE_CALL_RE = /\b(issue|makeIssue)\(/g;
const OBJECT_CODE_RE =
  /(?:^|[\s{,(])code:\s*(?=("[A-Za-z][A-Za-z0-9_-]*"|[A-Za-z_$][A-Za-z0-9_$.]*))/g;
const PROPERTY_RE = /^([A-Za-z_$][A-Za-z0-9_$]*)\s*(?::([\s\S]*))?$/;
const CODE_LITERAL_RE = /^"([A-Za-z][A-Za-z0-9_-]*)"$/;
const CODE_VALUE_RE = /^[A-Za-z][A-Za-z0-9_-]*$/;
const CONST_STRING_RE =
  /\bconst\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*"([^"\\\n]*)"(?:\s+as\s+const)?\s*;/g;
const CONST_OBJECT_RE = /\bconst\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*\{/g;
const SEVERITY_ARG_INDEX = 2;
const SUGGESTED_ACTION_ARG_INDEX = 7;
const NON_ERROR_SEVERITY_RE = /^"(?:warning|info)"$/;

function isPresentValue(value: string): boolean {
  return value !== "" && value !== "undefined";
}

/**
 * File-local `const` bindings whose value is a plain string: `NAME` for
 * `const NAME = "CODE";`, and `NAME.key` for a `const NAME = { key: "CODE" }`
 * code table. Emitters routinely name their code once at module scope and pass
 * the binding to `issue(...)`, so a census that only reads string literals
 * misses them entirely.
 *
 * Resolution is deliberately confined to the file being scanned: a code
 * imported from another module would need real module resolution, and no
 * emission site in `src/` does that today.
 */
function readStringConstants(source: string): Map<string, string> {
  const constants = new Map<string, string>();
  for (const match of source.matchAll(CONST_STRING_RE)) {
    constants.set(match[1], match[2]);
  }
  for (const match of source.matchAll(CONST_OBJECT_RE)) {
    if (match.index === undefined) continue;
    const brace = match.index + match[0].length - 1;
    const members = splitBalancedList(source, brace);
    if (members === null) continue;
    for (const member of members) {
      const property = PROPERTY_RE.exec(member);
      if (!property || property[2] === undefined) continue;
      const literal = CODE_LITERAL_RE.exec(property[2].trim());
      if (literal) {
        constants.set(`${match[1]}.${property[1]}`, literal[1]);
      }
    }
  }
  return constants;
}

/**
 * The issue code a `code` argument / property denotes: the literal itself, or
 * the value of the file-local constant it names. `null` when the token is a
 * runtime expression (`error.code`, `group.code`) whose code is not decidable
 * from the source text.
 */
function resolveCodeToken(token: string, constants: Map<string, string>): string | null {
  const trimmed = token.trim();
  const literal = CODE_LITERAL_RE.exec(trimmed);
  if (literal) {
    return literal[1];
  }
  const resolved = constants.get(trimmed);
  return resolved !== undefined && CODE_VALUE_RE.test(resolved) ? resolved : null;
}

/**
 * Emission sites of the form `issue(CODE, ...)` / `makeIssue(CODE, ...)`, where
 * `CODE` is a string literal or a file-local constant holding one.
 */
function readCallSites(source: string, constants: Map<string, string>): EmissionSite[] {
  const sites: EmissionSite[] = [];
  for (const match of source.matchAll(ISSUE_CALL_RE)) {
    const helper = match[1];
    if (match.index === undefined) continue;
    const openParen = match.index + match[0].length - 1;
    const args = splitBalancedList(source, openParen);
    const code = resolveCodeToken(args?.[0] ?? "", constants);
    // A helper declaration (`function issue(code: string, ...)`) and a call that
    // computes its code both land here with nothing to resolve; neither names a
    // code the census can account for.
    if (code === null) continue;
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
 * Emission sites of the form `{ code: CODE, severity: ..., ... }`. An object
 * literal counts as an `Issue` only when it also names `severity` directly:
 * that field is required by the type, and demanding it keeps look-alike shapes
 * (schema-validation records, config descriptors) out of the catalog census.
 */
function readObjectSites(source: string, constants: Map<string, string>): EmissionSite[] {
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
    // The `code:` the regex found must be a direct property of the enclosing
    // object, not one nested a level deeper inside it.
    if (properties.get("code") !== match[1]) continue;
    const code = resolveCodeToken(match[1], constants);
    if (code === null) continue;
    const severity = properties.get("severity");
    if (severity === undefined) continue;

    sites.push({
      code,
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
 * Scan `srcDir` for statically decidable issue-code emissions: the first
 * argument of `issue`/`makeIssue`, or the `code:` property of an inline `Issue`
 * object, written either as a string literal or as a file-local constant that
 * holds one. Codes assembled at runtime are out of scope.
 */
export async function collectIssueCodeUsage(srcDir: string): Promise<Map<string, IssueCodeUsage>> {
  const merged = new Map<string, IssueCodeUsage>();
  for (const filePath of await collectTsFiles(srcDir)) {
    const source = await readFile(filePath, "utf-8");
    const constants = readStringConstants(source);
    foldSites(readCallSites(source, constants), merged);
    foldSites(readObjectSites(source, constants), merged);
  }
  return merged;
}
