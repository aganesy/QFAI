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

async function yamlFilesUnder(root: string, dir: readonly string[]): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(path.join(root, ...dir), { recursive: true, withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && /\.ya?ml$/u.test(entry.name))
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)))
    .map((relative) => relative.split(path.sep).join("/"));
}

/**
 * A warning for each YAML file under `.github/workflows/` and `.github/actions/` that cannot be
 * parsed, naming the line. A file with a key twice is one: GitHub starts no job from it, so the
 * workflow stops running on every event and its checks never report, and a loader that accepts the
 * duplicate silently lets the edit that wrote it pass its own check. Nothing is written.
 */
export async function checkWorkflowParse(root: string): Promise<WorkflowParseCheck[]> {
  const files = (await Promise.all(YAML_DIRS.map((dir) => yamlFilesUnder(root, dir)))).flat();
  const findings: WorkflowParseCheck[] = [];
  for (const file of files.sort()) {
    let text: string;
    try {
      text = await readFile(path.join(root, ...file.split("/")), "utf-8");
    } catch {
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
