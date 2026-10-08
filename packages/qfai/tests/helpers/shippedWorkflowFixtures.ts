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
 * The manifests, because `run: pnpm ci:build-verify` is a REFERENCE: pinning the reference only
 * pins the pointer, not the work, so the digest has to resolve the script out of the manifest
 * too. The root one holds the `ci:` family; the package one is where a
 * `pnpm -C packages/qfai <script>` invocation lands.
 *
 * The script directories, because the same gap exists one hop further out: replacing
 * `check-no-internal-version-leakage.sh`'s body with `exit 0` would leave the step's name, its
 * `run` and its digest unchanged unless the digest also hashes the contents of the files a
 * verification reaches inside those two roots. A staged tree without them is one where every
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

/**
 * The grammar a shipped `runs-on` selector is written in: one or more
 * repository-variable reads, then a literal default.
 *
 * **One home, three readers.** The declared shape reports dimension 3, the
 * runner row owns the selector literal and the public-label list, and the
 * end-to-end row reads the tree `qfai init` actually writes. All three have to
 * agree on what a selector *looks like*, and each carried its own copy of this
 * pattern — so widening the form for the second runner class was found one CI
 * round at a time, because each site rejects on its own and the first failure
 * hides the next.
 *
 * What the form is belongs here. What the values are stays with the row that
 * owns them: which variable chains are sanctioned, and which labels are public,
 * are the runner row's and are not restated here.
 */
const RUNNER_SELECTOR_RE =
  /^\$\{\{\s*((?:vars\.[A-Za-z_][A-Za-z0-9_]*\s*\|\|\s*)+)'([^']*)'\s*\}\}$/;

/** A `runs-on` selector taken apart: the variables it reads, and its default. */
export interface ParsedRunnerSelector {
  /** The variable names, in the order the selector falls back through them. */
  readonly variables: readonly string[];
  /** The literal label the chain ends in. */
  readonly fallback: string;
}

/**
 * A selector parsed into its parts, or `null` when it is not written in the
 * form above — a bare label, a label array, a runner `group:` mapping, or an
 * expression with no literal at the end.
 */
export function parseRunnerSelector(value: string): ParsedRunnerSelector | null {
  const match = RUNNER_SELECTOR_RE.exec(value.trim());
  if (match === null) return null;
  return {
    variables: [...(match[1] ?? "").matchAll(/vars\.([A-Za-z_][A-Za-z0-9_]*)/g)].map(
      (read) => read[1] ?? "",
    ),
    fallback: match[2] ?? "",
  };
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
 * Removes every directory, attempting each one even when another removal
 * rejects, then throws one error naming each path whose removal failed and
 * its cause. A failed removal is reported rather than lost.
 */
export async function removeOwnedDirs(
  dirs: readonly string[],
  remove: (dir: string) => Promise<void> = (dir) => rm(dir, { recursive: true, force: true }),
): Promise<void> {
  const results = await Promise.allSettled(dirs.map((dir) => remove(dir)));
  const failures: Error[] = [];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const reason: unknown = result.reason;
      const detail = reason instanceof Error ? reason.message : String(reason);
      failures.push(new Error(`${dirs[index]}: ${detail}`, { cause: reason }));
    }
  });
  if (failures.length > 0) {
    const noun = failures.length === 1 ? "directory" : "directories";
    const lines = failures.map((failure) => failure.message).join("\n");
    throw new AggregateError(
      failures,
      `Could not remove ${failures.length} temp ${noun}:\n${lines}`,
    );
  }
}

/**
 * Registers an afterEach-scoped temp-directory pool for the calling suite
 * and returns its allocator. Cleanup drains the whole pool at once
 * (splice) and removes the directories in parallel, so a failed removal
 * neither aborts the remaining removals nor drops a pool entry mid-loop.
 * A failed removal fails the hook once every removal has been attempted.
 */
export function useTempDirPool(prefix: string): () => Promise<string> {
  const tempDirs: string[] = [];
  afterEach(async () => {
    await removeOwnedDirs(tempDirs.splice(0, tempDirs.length));
  });
  return async (): Promise<string> => {
    const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  };
}

/** What a job or step condition reads: context paths and status functions, each as a string. */
export type ConditionContext = Readonly<Record<string, string>>;

/**
 * Evaluates the subset of GitHub's expression grammar the shipped conditions use: string literals,
 * context paths, status functions, `==`, `!=`, `!`, `&&`, `||` and parentheses.
 *
 * `always()` is true unless the context says otherwise. Any other reference or function must be
 * given by the context, and one that is not throws, so a condition grown beyond what this reads
 * fails the test instead of scoring as true. Comparisons ignore case, as GitHub's do.
 */
export function evaluateCondition(condition: unknown, context: ConditionContext): boolean {
  if (typeof condition !== "string") {
    throw new Error("a condition is evaluated from its string form");
  }
  const wrapped = /^\$\{\{([\s\S]*)\}\}$/.exec(condition.trim());
  const source = (wrapped?.[1] ?? condition).trim();
  const tokens =
    source.match(/'[^']*'|&&|\|\||!=|==|[()!]|[A-Za-z_][A-Za-z0-9_.-]*(?:\(\))?/g) ?? [];
  if (tokens.join("").length !== source.replace(/\s+/g, "").length) {
    throw new Error(`condition has text this evaluator does not read: ${source}`);
  }
  let position = 0;
  const peek = (): string | undefined => tokens[position];
  const take = (): string => {
    const token = tokens[position];
    position += 1;
    if (token === undefined) {
      throw new Error(`condition ends early: ${source}`);
    }
    return token;
  };
  const text = (token: string): string => {
    if (token.startsWith("'")) {
      return token.slice(1, -1);
    }
    if (token === "always()" && context["always()"] === undefined) {
      return "true";
    }
    const value = context[token];
    if (value === undefined) {
      throw new Error(`condition reads ${token}, which the context does not give`);
    }
    return value;
  };
  const primary = (): boolean => {
    const token = take();
    if (token === "(") {
      const inner = disjunction();
      if (take() !== ")") {
        throw new Error(`condition has an unclosed parenthesis: ${source}`);
      }
      return inner;
    }
    if (token === "!") {
      return !primary();
    }
    const left = text(token);
    const operator = peek();
    if (operator === "==" || operator === "!=") {
      take();
      const equal = left.toLowerCase() === text(take()).toLowerCase();
      return operator === "==" ? equal : !equal;
    }
    return left === "true";
  };
  const conjunction = (): boolean => {
    let result = primary();
    while (peek() === "&&") {
      take();
      const next = primary();
      result = result && next;
    }
    return result;
  };
  const disjunction = (): boolean => {
    let result = conjunction();
    while (peek() === "||") {
      take();
      const next = conjunction();
      result = result || next;
    }
    return result;
  };
  const result = disjunction();
  if (position !== tokens.length) {
    throw new Error(`condition has trailing text: ${source}`);
  }
  return result;
}
