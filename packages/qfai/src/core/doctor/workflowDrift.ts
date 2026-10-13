import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { getInitAssetsDir } from "../../shared/assets.js";
import { SHIPPED_WORKFLOW_NAMES } from "../../shared/shippedWorkflowNames.js";

const WORKFLOWS_DIR = [".github", "workflows"] as const;

export type WorkflowDriftCheck = {
  id: string;
  severity: "warning";
  title: string;
  message: string;
  details: { path: string; packagedCopy: string };
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

/**
 * A short statement of how the installed workflow differs from the shipped one: the number of
 * lines on only one side, and the jobs whose definition differs, so a reader can tell a stale
 * copy from a deliberate change without opening both files.
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
  const hereJobs = jobsOf(installed);
  const shippedJobs = jobsOf(packaged);
  if (hereJobs === undefined || shippedJobs === undefined) return lines;
  const names = [...new Set([...Object.keys(hereJobs), ...Object.keys(shippedJobs)])].sort();
  const jobs = names.filter((name) => hereJobs[name] !== shippedJobs[name]);
  return jobs.length === 0 ? lines : `${lines}; jobs that differ: ${jobs.join(", ")}`;
}

/**
 * A warning for each shipped workflow installed in the project whose text is not the text this
 * package ships. Both copies are read and nothing is written. A workflow the project does not have
 * raises no finding here.
 */
export async function checkWorkflowDrift(root: string): Promise<WorkflowDriftCheck[]> {
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
    findings.push({
      id: `workflows.drift.${name.replace(/\.yml$/, "")}`,
      severity: "warning",
      title: `Shipped workflow differs (${installedPath})`,
      message:
        `${installedPath} differs from the copy this qfai package ships in ` +
        `${describeWorkflowDifference(installed, packaged)}. ` +
        `Doctor changes nothing. To take the shipped text, copy ${packagedCopy} over it; ` +
        `that replaces every local change.`,
      details: { path: installedPath, packagedCopy },
    });
  }
  return findings;
}
