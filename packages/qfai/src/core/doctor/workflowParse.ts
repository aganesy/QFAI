import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { parseDocument } from "yaml";

/** The directories whose YAML files GitHub reads as workflows and as composite actions. */
const YAML_DIRS = [
  [".github", "workflows"],
  [".github", "actions"],
] as const;

export type WorkflowParseIssue = {
  line: number | null;
  code: string;
  reason: string;
};

export type WorkflowParseCheck = {
  id: string;
  severity: "warning";
  title: string;
  message: string;
  details: { path: string; issues: WorkflowParseIssue[] };
};

/** Findings reach a terminal, so control characters in a file name or a parser message go. */
function printable(text: string): string {
  return text.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " ").trim();
}

/** The first line of a parser message, without the position and the source excerpt it appends. */
function reasonOf(message: string): string {
  const first = message.split("\n")[0] ?? "";
  return printable(first.replace(/ at line \d+, column \d+:?$/, ""));
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

/**
 * A warning for a file that cannot be read or a directory that cannot be listed, naming the path
 * and the cause, so a scan that missed files does not read as one that found nothing wrong.
 */
function unreadFinding(
  where: string,
  kind: "file" | "directory",
  error: unknown,
): WorkflowParseCheck {
  const cause = printable(error instanceof Error ? error.message : String(error));
  const verb = kind === "file" ? "read" : "listed";
  const shown = printable(where);
  const skipped = kind === "file" ? "it" : "the files in it";
  return {
    id: `workflows.parse.${where.replace(/^\.github\//u, "")}`,
    severity: "warning",
    title: `Workflow ${kind} cannot be ${verb} (${shown})`,
    message:
      `${shown} cannot be ${verb}: ${cause}. doctor did not parse ${skipped}, so a file GitHub ` +
      `cannot parse there would go unreported. Make it readable, then run doctor again.`,
    details: {
      path: where,
      issues: [{ line: null, code: errorCode(error) ?? "unknown", reason: cause }],
    },
  };
}

type YamlListing = { files: string[]; unlisted: WorkflowParseCheck | null };

/** The YAML files under one directory; a directory that does not exist holds none. */
async function yamlFilesUnder(root: string, dir: readonly string[]): Promise<YamlListing> {
  let entries;
  try {
    entries = await readdir(path.join(root, ...dir), { recursive: true, withFileTypes: true });
  } catch (error) {
    if (errorCode(error) === "ENOENT") return { files: [], unlisted: null };
    return { files: [], unlisted: unreadFinding(dir.join("/"), "directory", error) };
  }
  const files = entries
    .filter((entry) => entry.isFile() && /\.ya?ml$/u.test(entry.name))
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)))
    .map((relative) => relative.split(path.sep).join("/"));
  return { files, unlisted: null };
}

/**
 * A warning for each YAML file under `.github/workflows/` and `.github/actions/` that cannot be
 * parsed, naming the line. A file with a key twice is one: GitHub starts no job from it, so the
 * workflow stops running on every event and its checks never report, and a loader that accepts the
 * duplicate silently lets the edit that wrote it pass its own check. A file that cannot be read
 * and a directory that cannot be listed are warnings too; a directory that does not exist is not.
 * Nothing is written.
 */
export async function checkWorkflowParse(root: string): Promise<WorkflowParseCheck[]> {
  const listings = await Promise.all(YAML_DIRS.map((dir) => yamlFilesUnder(root, dir)));
  const findings: WorkflowParseCheck[] = listings.flatMap((listing) =>
    listing.unlisted === null ? [] : [listing.unlisted],
  );
  for (const file of listings.flatMap((listing) => listing.files).sort()) {
    let text: string;
    try {
      text = await readFile(path.join(root, ...file.split("/")), "utf-8");
    } catch (error) {
      findings.push(unreadFinding(file, "file", error));
      continue;
    }
    const issues = parseDocument(text).errors.map((error) => ({
      line: error.linePos?.[0].line ?? null,
      code: error.code,
      reason: reasonOf(error.message),
    }));
    const first = issues[0];
    if (first === undefined) continue;
    const where = first.line === null ? "" : ` at line ${first.line}`;
    const shown = printable(file);
    findings.push({
      id: `workflows.parse.${file.replace(/^\.github\//u, "")}`,
      severity: "warning",
      title: `Workflow file cannot be parsed (${shown})`,
      message:
        `${shown} cannot be parsed${where}: ${first.reason}. GitHub starts no job from a file it ` +
        `cannot parse, so its checks never report. Fix the file, then run actionlint on it.`,
      details: { path: file, issues },
    });
  }
  return findings;
}
