import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * What the source tree says about one issue code, aggregated over every
 * `issue("CODE", ...)` / `makeIssue("CODE", ...)` call site that raises it.
 */
export type IssueCodeUsage = {
  /** At least one call site can raise the code at `error` severity. */
  errorCapable: boolean;
  /** At least one call site passes a `suggested_action`. */
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
 * Split the top-level arguments of the call whose `(` sits at `openParen`.
 * Returns `null` when the call is not balanced (a truncated or malformed file).
 */
function splitCallArguments(source: string, openParen: number): string[] | null {
  const args: string[] = [];
  let depth = 0;
  let start = openParen + 1;
  for (let i = openParen; i < source.length; i++) {
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
        args.push(source.slice(start, i).trim());
        return args;
      }
      continue;
    }
    if (ch === "," && depth === 1) {
      args.push(source.slice(start, i).trim());
      start = i + 1;
    }
  }
  return null;
}

const ISSUE_CALL_RE = /\b(issue|makeIssue)\(\s*"([A-Za-z][A-Za-z0-9_-]*)"/g;
const SEVERITY_ARG_INDEX = 2;
const SUGGESTED_ACTION_ARG_INDEX = 7;
const NON_ERROR_SEVERITY_RE = /^"(?:warning|info)"$/;

function readUsage(source: string): Map<string, IssueCodeUsage> {
  const usage = new Map<string, IssueCodeUsage>();
  for (const match of source.matchAll(ISSUE_CALL_RE)) {
    const helper = match[1];
    const code = match[2];
    if (match.index === undefined) continue;
    const openParen = source.indexOf("(", match.index + helper.length);
    const args = splitCallArguments(source, openParen);
    // `makeIssue` has no severity parameter and always produces an error.
    const severity = helper === "makeIssue" ? '"error"' : (args?.[SEVERITY_ARG_INDEX] ?? "");
    const suggested = args?.[SUGGESTED_ACTION_ARG_INDEX] ?? "";
    const previous = usage.get(code);
    usage.set(code, {
      // A computed severity expression is treated as error-capable: the catalog
      // requirement should err towards demanding metadata, not towards skipping it.
      errorCapable: (previous?.errorCapable ?? false) || !NON_ERROR_SEVERITY_RE.test(severity),
      hasSuggestedAction:
        (previous?.hasSuggestedAction ?? false) || (suggested !== "" && suggested !== "undefined"),
    });
  }
  return usage;
}

/**
 * Scan `srcDir` for literal issue-code emissions. Only codes passed as a literal
 * first argument are collected; codes assembled at runtime are out of scope.
 */
export async function collectIssueCodeUsage(srcDir: string): Promise<Map<string, IssueCodeUsage>> {
  const merged = new Map<string, IssueCodeUsage>();
  for (const filePath of await collectTsFiles(srcDir)) {
    const source = await readFile(filePath, "utf-8");
    for (const [code, usage] of readUsage(source)) {
      const previous = merged.get(code);
      merged.set(code, {
        errorCapable: (previous?.errorCapable ?? false) || usage.errorCapable,
        hasSuggestedAction: (previous?.hasSuggestedAction ?? false) || usage.hasSuggestedAction,
      });
    }
  }
  return merged;
}
