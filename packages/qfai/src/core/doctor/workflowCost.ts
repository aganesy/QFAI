import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { SHIPPED_WORKFLOW_NAMES } from "../../shared/shippedWorkflowNames.js";
import { isRecord } from "../workflow/parse.js";

const WORKFLOWS_DIR = [".github", "workflows"] as const;

/** The test layers the shipped orchestrator runs at most, one matrix leg each. */
const TEST_LAYERS = 5;

/**
 * What decides which jobs of a shipped workflow a pull request event starts: whether the change
 * touched documents and no source, whether it touched documents at all, and how many test layers
 * the project declares a script for.
 */
export type PullRequestScenario = {
  readonly documentsOnly: boolean;
  readonly documentsTouched: boolean;
  readonly layers: number;
};

/** A change no lane reads: the shipped workflows start only the job that decides that. */
export const IDLE_SCENARIO: PullRequestScenario = {
  documentsOnly: true,
  documentsTouched: false,
  layers: 0,
};

/** A change every lane reads, in a project that declares a script for every test layer. */
export const LANE_RUNS_SCENARIO: PullRequestScenario = {
  documentsOnly: false,
  documentsTouched: true,
  layers: TEST_LAYERS,
};

export type StartedJob = {
  readonly id: string;
  /** Runner allocations: one per matrix leg. */
  readonly instances: number;
  /** The job's `runs-on` as written. */
  readonly runner: string;
};

export type WorkflowJobCounts = {
  readonly file: string;
  readonly idle: readonly StartedJob[];
  readonly laneRuns: readonly StartedJob[];
};

const CLOSE_GATE = "github.event.action != 'closed'";
const PUSH_POLICY_GATE = `${CLOSE_GATE} && (github.event_name != 'push' || vars.QFAI_CI_PUSH_POLICY != 'none')`;
const SCOPE_GATE = "needs.scope.outputs.run == 'true' && github.event.action != 'closed'";
const SELECTED_GATE =
  "needs.detection.outputs.selected != '[]' && needs.detection.outputs.selected != ''";
const SCOPE_AGGREGATE = `always() && ${CLOSE_GATE} && needs.scope.outputs.run != 'false'`;
const SELECTED_AGGREGATE = `always() && ${CLOSE_GATE} && needs.detection.outputs.selected != '[]'`;

/** A condition with its `${{ }}` wrapper removed. */
function conditionText(condition: unknown): string {
  return (typeof condition === "string" ? condition : "")
    .trim()
    .replace(/^\$\{\{\s*([\s\S]*?)\s*\}\}$/, "$1")
    .trim();
}

/**
 * Whether a pull request event that is not a close starts the job, or `undefined` for a condition
 * this does not recognise. Only the forms the shipped templates use are read: a count taken from a
 * condition that was guessed would be a figure nobody can check.
 *
 * SIMPLIFIED: compares the condition text with the shipped forms instead of evaluating it.
 * Lift when: a shipped template gains a condition form, which the job-count test reports.
 */
function jobStarts(
  job: Record<string, unknown>,
  scenario: PullRequestScenario,
): boolean | undefined {
  const text = conditionText(job["if"]);
  if (text === "" || text === CLOSE_GATE || text === PUSH_POLICY_GATE) return true;
  if (text === `always() && ${CLOSE_GATE}` || text === "always()") return true;
  if (text === SCOPE_GATE || text === SCOPE_AGGREGATE) return scenario.documentsTouched;
  if (text === SELECTED_GATE || text === SELECTED_AGGREGATE) {
    return !scenario.documentsOnly && scenario.layers > 0;
  }
  return undefined;
}

/** How many runners the job allocates, or `undefined` for a matrix axis this does not recognise. */
function instancesOf(
  job: Record<string, unknown>,
  scenario: PullRequestScenario,
): number | undefined {
  const strategy = job["strategy"];
  const matrix = isRecord(strategy) ? strategy["matrix"] : undefined;
  if (!isRecord(matrix)) return 1;
  let widest = 1;
  for (const axis of Object.values(matrix)) {
    if (Array.isArray(axis)) {
      widest = Math.max(widest, axis.length);
    } else if (typeof axis === "string" && axis.includes("needs.detection.outputs.selected")) {
      widest = Math.max(widest, scenario.layers);
    } else {
      return undefined;
    }
  }
  return widest;
}

function jobsStarted(
  jobs: Record<string, unknown>,
  scenario: PullRequestScenario,
): StartedJob[] | undefined {
  const started: StartedJob[] = [];
  for (const [id, job] of Object.entries(jobs)) {
    if (!isRecord(job)) return undefined;
    const starts = jobStarts(job, scenario);
    const instances = instancesOf(job, scenario);
    if (starts === undefined || instances === undefined) return undefined;
    if (!starts) continue;
    const runner = job["runs-on"];
    started.push({ id, instances, runner: typeof runner === "string" ? runner : "" });
  }
  return started;
}

/**
 * The jobs a pull request event starts in a workflow's text, in the two scenarios, or `undefined`
 * when the text is not a workflow this can read. Nothing is written and no variable is looked up.
 */
export function countWorkflowJobs(file: string, text: string): WorkflowJobCounts | undefined {
  let parsed: unknown;
  try {
    parsed = parseYaml(text);
  } catch {
    return undefined;
  }
  const jobs = isRecord(parsed) ? parsed["jobs"] : undefined;
  if (!isRecord(jobs)) return undefined;
  const idle = jobsStarted(jobs, IDLE_SCENARIO);
  const laneRuns = jobsStarted(jobs, LANE_RUNS_SCENARIO);
  if (idle === undefined || laneRuns === undefined) return undefined;
  return { file, idle, laneRuns };
}

/** The jobs as the headers and the finding list them: ids in file order, a matrix width as `xN`. */
export function describeJobs(jobs: readonly StartedJob[]): string {
  return jobs
    .map((job) => (job.instances === 1 ? job.id : `${job.id} x${job.instances}`))
    .join(", ");
}

export function totalInstances(jobs: readonly StartedJob[]): number {
  return jobs.reduce((sum, job) => sum + job.instances, 0);
}

const SELECTOR = /^\$\{\{\s*((?:vars\.[A-Za-z_][A-Za-z0-9_]*\s*\|\|\s*)+)'([^']*)'\s*\}\}$/;

/**
 * The runner a job asks for, spelled out: each repository variable it reads in turn, then the label
 * it falls back to. A repository variable is not readable from the checkout, so the selector is
 * reported rather than resolved.
 */
function describeRunner(runner: string): string {
  const match = SELECTOR.exec(runner.trim());
  if (match === null) return runner === "" ? "an unreadable runner" : runner;
  const variables = [...(match[1] ?? "").matchAll(/vars\.([A-Za-z_][A-Za-z0-9_]*)/g)].map(
    (read) => `vars.${read[1] ?? ""}`,
  );
  return `${variables.join(", else ")}, else ${match[2] ?? ""}`;
}

/** The runner of each job, jobs that share a selector named together. */
function describeRunners(jobs: readonly StartedJob[]): string {
  const byRunner = new Map<string, string[]>();
  for (const job of jobs) {
    const runner = describeRunner(job.runner);
    byRunner.set(runner, [...(byRunner.get(runner) ?? []), job.id]);
  }
  return [...byRunner].map(([runner, ids]) => `${ids.join(" and ")} on ${runner}`).join("; ");
}

function pluralJobs(count: number): string {
  return `${count} ${count === 1 ? "job" : "jobs"}`;
}

function describeWorkflow(counts: WorkflowJobCounts): string {
  const idle = describeJobs(counts.idle);
  const lane = describeJobs(counts.laneRuns);
  const started =
    idle === lane
      ? `${counts.file} starts ${pluralJobs(totalInstances(counts.laneRuns))} (${lane})`
      : `${counts.file} starts ${pluralJobs(totalInstances(counts.idle))} when nothing is to run (${idle}) and up to ${totalInstances(counts.laneRuns)} when its lane runs (${lane})`;
  return `${started}, with ${describeRunners(counts.laneRuns)}.`;
}

export type WorkflowCostCheck = {
  id: "workflows.cost";
  severity: "info";
  title: string;
  message: string;
  details: {
    workflows: {
      file: string;
      idle: { jobs: number; ids: string };
      laneRuns: { jobs: number; ids: string };
    }[];
    unread: string[];
  };
};

/**
 * What a pull request event costs in jobs, by shipped workflow installed in the project. GitHub
 * bills each job as at least a minute, so the count is what the project's choices cost. It reads
 * the installed workflow text only, never raises more than `info`, and names a workflow it cannot
 * read rather than guessing a count.
 */
export async function checkWorkflowCost(root: string): Promise<WorkflowCostCheck | undefined> {
  const counted: WorkflowJobCounts[] = [];
  const unread: string[] = [];
  for (const name of [...SHIPPED_WORKFLOW_NAMES].sort()) {
    let text: string;
    try {
      text = await readFile(path.join(root, ...WORKFLOWS_DIR, name), "utf-8");
    } catch {
      continue;
    }
    const counts = countWorkflowJobs(name, text);
    if (counts === undefined) unread.push(name);
    else counted.push(counts);
  }
  if (counted.length === 0 && unread.length === 0) return undefined;
  const clauses = counted.map(describeWorkflow);
  if (unread.length > 0) {
    clauses.push(
      `${unread.join(" and ")} could not be counted: the file or one of its job conditions is not one this check reads.`,
    );
  }
  return {
    id: "workflows.cost",
    severity: "info",
    title: "Jobs the shipped workflows start per pull request event",
    message: `GitHub bills each job as at least a minute. ${clauses.join(" ")}`,
    details: {
      workflows: counted.map((counts) => ({
        file: counts.file,
        idle: { jobs: totalInstances(counts.idle), ids: describeJobs(counts.idle) },
        laneRuns: { jobs: totalInstances(counts.laneRuns), ids: describeJobs(counts.laneRuns) },
      })),
      unread,
    },
  };
}
