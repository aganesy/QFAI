import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";

export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const REPO_ROOT = path.resolve(PACKAGE_ROOT, "..", "..");

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function workflowJobs(file: string): Record<string, Record<string, unknown>> {
  const document: unknown = parseYaml(
    readFileSync(path.join(REPO_ROOT, ".github", "workflows", file), "utf-8"),
  );
  if (!isRecord(document) || !isRecord(document["jobs"])) {
    throw new Error(`${file} declares no jobs`);
  }
  const jobs: Record<string, Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(document["jobs"])) {
    if (!isRecord(value)) throw new Error(`${file}'s ${key} job is not a mapping`);
    jobs[key] = value;
  }
  return jobs;
}

export function workflowJob(file: string, job: string): Record<string, unknown> {
  const found = workflowJobs(file)[job];
  if (found === undefined) throw new Error(`${file} declares no ${job} job`);
  return found;
}

export function matrixSlices(file: string, job: string): string[] {
  const strategy = workflowJob(file, job)["strategy"];
  const matrix = isRecord(strategy) ? strategy["matrix"] : undefined;
  const slices = isRecord(matrix) ? matrix["slice"] : undefined;
  if (!Array.isArray(slices) || !slices.every((slice) => typeof slice === "string")) {
    throw new Error(`${file}'s ${job} job declares no string matrix.slice list`);
  }
  return slices;
}

export function jobSteps(file: string, job: string): Record<string, unknown>[] {
  const steps = workflowJob(file, job)["steps"];
  if (!Array.isArray(steps)) throw new Error(`${file}'s ${job} job declares no steps`);
  return steps.filter(isRecord);
}

export function runnerProjects(): string[] {
  const source = readFileSync(path.join(PACKAGE_ROOT, "vitest.workspace.ts"), "utf-8");
  const names = [...source.matchAll(/name:\s*"([^"]+)"/g)].map((match) => match[1]);
  if (names.length === 0 || names.some((name) => name === undefined)) {
    throw new Error("vitest.workspace.ts declares no project names");
  }
  return names.filter((name): name is string => name !== undefined);
}

export function perSliceScriptEntries(): { key: string; slice: string }[] {
  const manifest: unknown = JSON.parse(
    readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf-8"),
  );
  if (!isRecord(manifest) || !isRecord(manifest["scripts"])) {
    throw new Error("packages/qfai/package.json declares no scripts");
  }
  const entries: { key: string; slice: string }[] = [];
  for (const [key, value] of Object.entries(manifest["scripts"])) {
    if (typeof value !== "string") continue;
    const match = /^vitest run --project ([a-z0-9-]+)$/.exec(value.trim());
    if (match?.[1] !== undefined) entries.push({ key, slice: match[1] });
  }
  return entries;
}

export function releaseShapeSlices(): string[] {
  const shape = jobSteps("release.yml", "verify").find((step) => step["id"] === "shape");
  const env = shape?.["env"];
  const value = isRecord(env) ? env["SUITE_SLICES"] : undefined;
  if (typeof value !== "string") {
    throw new Error("release.yml's shape step declares no SUITE_SLICES list");
  }
  return value.trim().split(/\s+/).filter(Boolean);
}

export const SLICED_JOBS = [
  { workflow: "ci.yml", job: "test" },
  { workflow: "ci.yml", job: "node-floor" },
  { workflow: "release.yml", job: "gate-tests" },
  { workflow: "release.yml", job: "gate-floor" },
] as const;

export const sorted = (values: readonly string[]): string[] => [...values].sort();
