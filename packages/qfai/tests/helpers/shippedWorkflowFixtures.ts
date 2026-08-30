/**
 * Shared fixtures for the shipped GitHub Actions workflow-set suites
 * (ownership / topology / pins): the packaged shipped-tree locations, a
 * per-suite temp-directory pool, and the common type guard. Pure test
 * plumbing — no assertions live here.
 */
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";

/** The real shipped `.github/` tree inside the packaged init assets. */
export const shippedGithubDir = (): string => path.join(getInitAssetsDir(), "root", ".github");

/** The real shipped workflows directory inside the packaged init assets. */
export const shippedWorkflowsDir = (): string => path.join(shippedGithubDir(), "workflows");

/**
 * Everything outside `.github/**` that the hygiene lane's verification-body digest reads,
 * repo-relative and POSIX-separated. Directories are copied whole.
 *
 * Every fixture that stages a tree for that lane has to copy all of it, and the list lives here
 * so a fixture cannot be missed when it grows — three staged that tree independently and two of
 * them reddened the first time it did.
 *
 * The manifests, because `run: pnpm ci:build-verify` is a REFERENCE and review finding [36]
 * measured that pinning the reference pins the pointer rather than the work: the digest resolves
 * the script out of the manifest. The root one holds the `ci:` family; the package one is where a
 * `pnpm -C packages/qfai <script>` invocation lands.
 *
 * The script directories, because review finding [42] measured the same thing one hop further
 * out: replacing `check-no-internal-version-leakage.sh`'s body with `exit 0` left the step's
 * name, its `run` and its digest unchanged. The digest hashes the contents of the files a
 * verification reaches inside those two roots, so a staged tree without them is one where every
 * declared body reads as running an absent guard.
 */
export const DIGESTED_LANE_INPUTS_REL: readonly string[] = [
  "package.json",
  "packages/qfai/package.json",
  "scripts",
  "packages/qfai/scripts",
];

/** Absolute path of one packaged shipped workflow file. */
export const shippedWorkflowPath = (name: string): string => path.join(shippedWorkflowsDir(), name);

/** Reads every shipped workflow as `[fileName, body]`, sorted by name. */
export async function loadShippedWorkflows(): Promise<Array<[string, string]>> {
  const names = (await readdir(shippedWorkflowsDir())).sort();
  const files: Array<[string, string]> = [];
  for (const name of names) {
    files.push([name, await readFile(shippedWorkflowPath(name), "utf-8")]);
  }
  return files;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Every job of a parsed workflow document as `{ jobId, job }` records. */
export function collectWorkflowJobs(
  doc: unknown,
): Array<{ jobId: string; job: Record<string, unknown> }> {
  const jobs: Array<{ jobId: string; job: Record<string, unknown> }> = [];
  if (!isRecord(doc)) {
    return jobs;
  }
  const jobsNode = doc["jobs"];
  if (!isRecord(jobsNode)) {
    return jobs;
  }
  for (const [jobId, job] of Object.entries(jobsNode)) {
    if (isRecord(job)) {
      jobs.push({ jobId, job });
    }
  }
  return jobs;
}

/** One job of a parsed workflow document by id, or undefined when absent. */
export function findWorkflowJob(doc: unknown, jobId: string): Record<string, unknown> | undefined {
  return collectWorkflowJobs(doc).find((entry) => entry.jobId === jobId)?.job;
}

/** Every step of one job, in declaration order (empty for step-less jobs). */
export function collectJobSteps(job: Record<string, unknown>): Array<Record<string, unknown>> {
  const steps = job["steps"];
  if (!Array.isArray(steps)) {
    return [];
  }
  return steps.filter(isRecord);
}

/**
 * The leading comment block of a shipped workflow file — its header per
 * NFR-C0011. Blank lines inside the block are skipped and the block ends at
 * the first non-comment, non-blank line (i.e. at the YAML body).
 */
export function headerComment(body: string): string {
  const lines: string[] = [];
  for (const line of body.split(/\r\n|\r|\n/)) {
    if (line.startsWith("#")) {
      lines.push(line);
      continue;
    }
    if (line.trim() === "") {
      continue;
    }
    break;
  }
  return lines.join("\n");
}

/**
 * A header-table row label reduced to its identity: backticks dropped,
 * lowercased, every run of non-alphanumerics collapsed to one space. A
 * re-padded, re-cased or re-punctuated table is still the same table, so the
 * shipped headers stay human-formattable without breaking either oracle that
 * reads them.
 */
export function normalizeHeaderLabel(label: string): string {
  return label
    .replace(/`/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A table cell holding only a separator run (`---`, `:--:`). */
const SEPARATOR_CELL_RE = /^:?-{2,}:?$/;

/** Header-row values that fill a row without stating anything. */
export const HEADER_PLACEHOLDER_VALUE_RE = /^(?:[-–—.]+|tbd|todo|n\/?a|none|see above)$/i;

/**
 * Parses the pipe table out of a header block: comment lines whose body starts
 * and ends with `|`, separator rows dropped. Returns every value seen per
 * normalized label, so a duplicated row is visible as a second entry rather
 * than silently overwriting the first.
 *
 * Shared on purpose: the header row's own oracle and the declared shape's
 * dimension-2 observer must read a shipped header the same way, or the gate and
 * the row it defers to could disagree about what a header states.
 */
export function parseHeaderTable(header: string): Map<string, string[]> {
  const rows = new Map<string, string[]>();
  for (const line of header.split(/\r\n|\r|\n/)) {
    const body = line.replace(/^#\s?/, "").trim();
    if (!body.startsWith("|") || !body.endsWith("|") || body.length < 3) {
      continue;
    }
    const cells = body
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    if (cells.length < 2 || cells.every((cell) => SEPARATOR_CELL_RE.test(cell))) {
      continue;
    }
    const label = normalizeHeaderLabel(cells[0] ?? "");
    if (label === "") {
      continue;
    }
    const value = cells.slice(1).join(" | ").trim();
    rows.set(label, [...(rows.get(label) ?? []), value]);
  }
  return rows;
}

/** The first step body of a job carrying a string `run:`, or undefined. */
export function firstRunBody(job: Record<string, unknown>): string | undefined {
  for (const step of collectJobSteps(job)) {
    const run = step["run"];
    if (typeof run === "string") {
      return run;
    }
  }
  return undefined;
}

/**
 * Registers an afterEach-scoped temp-directory pool for the calling suite
 * and returns its allocator. Cleanup drains the whole pool at once
 * (splice) and removes the directories in parallel via allSettled, so a
 * failed removal neither aborts the remaining removals nor drops a pool
 * entry mid-loop.
 */
export function useTempDirPool(prefix: string): () => Promise<string> {
  const tempDirs: string[] = [];
  afterEach(async () => {
    const dirs = tempDirs.splice(0, tempDirs.length);
    await Promise.allSettled(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  });
  return async (): Promise<string> => {
    const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  };
}
