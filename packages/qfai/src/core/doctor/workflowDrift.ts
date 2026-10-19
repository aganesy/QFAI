import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { getInitAssetsDir } from "../../shared/assets.js";
import { SHIPPED_WORKFLOW_NAMES } from "../../shared/shippedWorkflowNames.js";

const WORKFLOWS_DIR = [".github", "workflows"] as const;

export type WorkflowDriftCheck = {
  id: string;
  severity: "warning" | "info";
  title: string;
  message: string;
  details: { path: string; packagedCopy: string; acceptedReason?: string };
};

export async function readText(target: string): Promise<string | undefined> {
  try {
    return await readFile(target, "utf-8");
  } catch {
    return undefined;
  }
}

/** Line endings are not an edit: a checkout may convert them. */
export function withLf(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

function packagedWorkflowsDir(): string | undefined {
  try {
    return path.join(getInitAssetsDir(), "root", ...WORKFLOWS_DIR);
  } catch {
    return undefined;
  }
}

/** A value with every mapping's keys in sorted order, so two equal definitions compare equal as text. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, child]) => [key, canonical(child)]),
    );
  }
  return value;
}

/** The job definitions of a workflow text by job name, or `undefined` when it does not parse. */
function jobsOf(text: string): Record<string, string> | undefined {
  try {
    const document: unknown = parseYaml(text);
    if (document === null || typeof document !== "object" || !("jobs" in document)) return {};
    const { jobs } = document;
    if (jobs === null || typeof jobs !== "object") return {};
    return Object.fromEntries(
      Object.entries(jobs).map(([name, job]) => [name, JSON.stringify(canonical(job))]),
    );
  } catch {
    return undefined;
  }
}

/** How many lines of `lines` have no counterpart in `others`, counting a repeated line once each. */
function linesWithoutCounterpart(lines: readonly string[], others: readonly string[]): number {
  const remaining = new Map<string, number>();
  for (const line of others) remaining.set(line, (remaining.get(line) ?? 0) + 1);
  let missing = 0;
  for (const line of lines) {
    const left = remaining.get(line) ?? 0;
    if (left === 0) missing += 1;
    else remaining.set(line, left - 1);
  }
  return missing;
}

const USES_LINE = /^\s*(?:-\s*)?uses:\s*["']?([^@\s"']+)@([^\s"'#]+)/gm;

/** The refs each action is pinned to in a workflow text, by action name. */
function pinnedActions(text: string): Map<string, string> {
  const refs = new Map<string, Set<string>>();
  for (const [, action = "", ref = ""] of withLf(text).matchAll(USES_LINE)) {
    refs.set(action, (refs.get(action) ?? new Set()).add(ref));
  }
  return new Map([...refs].map(([action, set]) => [action, [...set].sort().join(", ")]));
}

/** Each action both texts use whose pinned refs differ, with the refs on each side. */
function pinsThatDiffer(installed: string, packaged: string): string[] {
  const here = pinnedActions(installed);
  const shipped = pinnedActions(packaged);
  return [...here.keys()]
    .filter((action) => shipped.has(action) && shipped.get(action) !== here.get(action))
    .sort()
    .map(
      (action) =>
        `${action} (installed ${here.get(action) ?? ""}, shipped ${shipped.get(action) ?? ""})`,
    );
}

/**
 * A short statement of how the installed workflow differs from the shipped one: the number of
 * lines on only one side, the jobs whose definition differs and the actions both files use whose
 * pinned version differs, so a reader can tell a stale copy from a deliberate change without
 * opening both files.
 *
 * Lines are compared as a multiset, not in order: a moved block reads as unchanged. A change
 * outside the jobs (the triggers, a comment) names no job.
 */
export function describeWorkflowDifference(installed: string, packaged: string): string {
  const here = withLf(installed).split("\n");
  const shipped = withLf(packaged).split("\n");
  const onlyHere = linesWithoutCounterpart(here, shipped);
  const onlyShipped = linesWithoutCounterpart(shipped, here);
  const changed = onlyHere + onlyShipped;
  const lines = `${changed} ${changed === 1 ? "line" : "lines"} (${onlyHere} only in the installed file, ${onlyShipped} only in the shipped copy)`;
  const parts = [lines];
  const hereJobs = jobsOf(installed);
  const shippedJobs = jobsOf(packaged);
  if (hereJobs === undefined || shippedJobs === undefined) {
    parts.push(
      `jobs not compared: ${hereJobs === undefined ? "the installed file does" : "the shipped copy does"} not parse`,
    );
  } else {
    const names = [...new Set([...Object.keys(hereJobs), ...Object.keys(shippedJobs)])].sort();
    const jobs = names.filter((name) => hereJobs[name] !== shippedJobs[name]);
    if (jobs.length > 0) parts.push(`jobs that differ: ${jobs.join(", ")}`);
  }
  const pins = pinsThatDiffer(installed, packaged);
  if (pins.length > 0) parts.push(`pinned actions that differ: ${pins.join(", ")}`);
  return parts.join("; ");
}

/**
 * A warning for each shipped workflow installed in the project whose text is not the text this
 * package ships, and an `info` finding instead for one `accepted` names, carrying its reason.
 * Both copies are read and nothing is written. A workflow the project does not have raises no
 * finding here.
 */
export async function checkWorkflowDrift(
  root: string,
  accepted: ReadonlyMap<string, string>,
): Promise<WorkflowDriftCheck[]> {
  const packagedDir = packagedWorkflowsDir();
  if (packagedDir === undefined) return [];
  const findings: WorkflowDriftCheck[] = [];
  for (const name of [...SHIPPED_WORKFLOW_NAMES].sort()) {
    const installed = await readText(path.join(root, ...WORKFLOWS_DIR, name));
    const packagedCopy = path.join(packagedDir, name);
    const packaged = await readText(packagedCopy);
    if (installed === undefined || packaged === undefined) continue;
    if (withLf(installed) === withLf(packaged)) continue;
    const installedPath = [...WORKFLOWS_DIR, name].join("/");
    const difference = describeWorkflowDifference(installed, packaged);
    const acceptedReason = accepted.get(name);
    if (acceptedReason !== undefined) {
      findings.push({
        id: `workflows.drift.${name.replace(/\.yml$/, "")}`,
        severity: "info",
        title: `Shipped workflow differs, accepted (${installedPath})`,
        message:
          `${installedPath} differs from the copy this qfai package ships in ${difference}. ` +
          `workflow.acceptedDrift in qfai.config.yaml accepts the difference: ${acceptedReason}`,
        details: { path: installedPath, packagedCopy, acceptedReason },
      });
      continue;
    }
    findings.push({
      id: `workflows.drift.${name.replace(/\.yml$/, "")}`,
      severity: "warning",
      title: `Shipped workflow differs (${installedPath})`,
      message:
        `${installedPath} differs from the copy this qfai package ships in ` +
        `${difference}. ` +
        `Doctor changes nothing. To take the shipped text, copy ${packagedCopy} over it; ` +
        `that replaces every local change. To keep the difference, list the file with a reason ` +
        `under workflow.acceptedDrift in qfai.config.yaml.`,
      details: { path: installedPath, packagedCopy },
    });
  }
  return findings;
}
