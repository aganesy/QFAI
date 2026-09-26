/**
 * The repository's own CI workflow and the package's `test:windows-parity` script, parsed once,
 * for the modules that read the Windows job.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { parse as parseYaml } from "yaml";

export const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..", "..", "..");
export const PACKAGE_ROOT = path.join(REPO_ROOT, "packages", "qfai");
export const WINDOWS_JOB = "windows-parity";
export const SCRIPT = "test:windows-parity";

export type Job = Record<string, unknown>;
export type Step = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Every job of `.github/workflows/ci.yml`, by id. */
export function ciJobs(): Record<string, Job> {
  const workflow: unknown = parseYaml(
    readFileSync(path.join(REPO_ROOT, ".github", "workflows", "ci.yml"), "utf-8"),
  );
  const jobs = isRecord(workflow) ? workflow.jobs : undefined;
  if (!isRecord(jobs)) throw new Error("ci.yml declares no jobs");
  const narrowed: Record<string, Job> = {};
  for (const [id, job] of Object.entries(jobs)) if (isRecord(job)) narrowed[id] = job;
  return narrowed;
}

/** The job named `id`, or an empty job when the workflow declares none, so a case fails on its assertion. */
export function job(id: string): Job {
  return ciJobs()[id] ?? {};
}

export function stepsOf(target: Job): Step[] {
  return Array.isArray(target.steps) ? target.steps.filter(isRecord) : [];
}

export function runOf(step: Step): string {
  return typeof step.run === "string" ? step.run : "";
}

/** The `needs` of a job as a list, whichever form it is written in. */
export function needsOf(target: Job): string[] {
  const needs = target.needs;
  if (typeof needs === "string") return [needs];
  return Array.isArray(needs) ? needs.filter((each) => typeof each === "string") : [];
}

// A step that runs a test command: a package test script or the test runner itself.
const TEST_COMMAND = /\bpnpm\b[^\n]*\btest\b|\bvitest\b/;

/** The index of the first step of `target` that runs a test command. */
export function firstTestStep(target: Job): number {
  return stepsOf(target).findIndex((step) => TEST_COMMAND.test(runOf(step)));
}

/** Every test command the job's steps run, one per line that runs one. */
export function testCommands(target: Job): string[] {
  return stepsOf(target).flatMap((step) =>
    runOf(step)
      .split("\n")
      .filter((line) => TEST_COMMAND.test(line))
      .map((line) => line.trim()),
  );
}

/** The package script's suite list: the arguments `vitest run` receives; none without the script. */
export function suiteList(): string[] {
  const manifest: unknown = JSON.parse(
    readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf-8"),
  );
  const scripts = isRecord(manifest) ? manifest.scripts : undefined;
  const script = isRecord(scripts) ? scripts[SCRIPT] : undefined;
  if (typeof script !== "string") return [];
  const [runner, verb, ...entries] = script.trim().split(/\s+/);
  if (runner !== "vitest" || verb !== "run") throw new Error(`${SCRIPT} is not a vitest run`);
  return entries;
}

/** The verdict program the `ci-pass` job runs: its quoted heredoc, byte for byte. */
export function verdictProgram(): string {
  const body = stepsOf(job("ci-pass"))
    .map(runOf)
    .find((run) => run.includes("<<'NODE'"));
  const match = body === undefined ? null : /<<'NODE'\n([\s\S]*?)\nNODE\n/.exec(body);
  if (match?.[1] === undefined) throw new Error("ci-pass carries no quoted NODE heredoc");
  return match[1];
}

/** Runs the verdict program over a needs map and returns its exit status. */
export function verdictExit(needs: Record<string, { result: string }>): number | null {
  const dir = mkdtempSync(path.join(os.tmpdir(), "qfai-verdict-"));
  try {
    const file = path.join(dir, "ci-verdict.mjs");
    writeFileSync(file, verdictProgram());
    const result = spawnSync(process.execPath, [file], {
      env: { ...process.env, NEEDS_JSON: JSON.stringify(needs) },
      encoding: "utf-8",
    });
    return result.status;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
