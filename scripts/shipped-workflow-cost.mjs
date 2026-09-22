/**
 * What the shipped workflows cost an adopter, per path, derived from the templates.
 *
 * This repository already pins the cost of its own CI — `documentationOnlyCostPin` and
 * `codePathCostPin` in `.github/required-status-contexts.json`. The templates `qfai init`
 * writes into an adopter's repository had no equivalent, and they are the surface where the
 * money is somebody else's: a template change that adds a runner-allocating job spends an
 * adopter's minutes on every pull request they open, and nothing made that visible in review.
 *
 * ## What a figure is, and is not
 *
 * Not a bound. Enforcement is equality against a value recomputed from the same templates, so a
 * clause forbidding a higher cost could not fail once the pinner has run. What the pin refuses is
 * a change that moved the cost and did not move the figure. Whether the new figure is acceptable
 * is a cost claim, and a claim arrives with measurements rather than with arithmetic.
 *
 * Not a measurement either. Wall time and billed minutes are properties of a run, and no lint has
 * one. What is derived here is what the templates *declare*: which jobs allocate a runner on a
 * given path, on which runner class, under what timeout ceiling, and how many billable job-minutes
 * the per-job floor costs before any work happens. That last figure is the one the adopter's
 * evidence turned on — a job that runs for four seconds is billed as a minute.
 *
 * ## The six paths
 *
 * Each names the facts that decide which jobs run. They are declared rather than inferred,
 * because a path is a claim about an adopter's repository — whether their `package.json`
 * declares `test:e2e`, whether the change touched documents — and the templates cannot know it.
 *
 * ## Refusing rather than guessing
 *
 * Every `if:` the templates use is read against the path's facts, and a condition this does not
 * recognise throws. A pin that guessed would be a figure nobody can check, and the next condition
 * shape would enter the cost silently. The recognised forms are exactly the ones the shipped
 * contract permits, and `.qfai/contracts/cli/shipped-workflows.md` dimension 6 is what keeps that
 * list short.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
/** The parser the other cost pins use, out of the workspace that depends on it. */
const { parse: parseYaml } = require("../packages/qfai/node_modules/yaml");

/** Where `qfai init` reads the templates from. */
export const SHIPPED_DIR = "packages/qfai/assets/init/root/.github/workflows";

/** The templates a cost path is expanded over, in the order a reader meets them. */
export const SHIPPED_WORKFLOWS = ["qfai-validate.yml", "qfai-docs.yml", "qfai-tests.yml"];

/** GitHub bills a job that allocated a runner at one minute even when it finishes sooner. */
export const BILLABLE_JOB_FLOOR_MINUTES = 1;

/**
 * The paths a shipped template is costed over.
 *
 * `event` decides the triggering shape, `documentsOnly` whether a documents change selected the
 * document lanes, and `testScripts` which `test:<layer>` scripts the adopter's manifest declares —
 * the opt-in the test lanes read through the detection job's outputs.
 */
export const COST_PATHS = [
  {
    id: "documentation-only-pull-request",
    what: "a pull request that touches documents and no source",
    event: "pull_request",
    documentsOnly: true,
    testScripts: [],
  },
  {
    id: "code-pull-request",
    what: "a pull request that touches source",
    event: "pull_request",
    documentsOnly: false,
    testScripts: [],
  },
  {
    id: "no-test-scripts",
    what: "an adopter whose manifest declares no test:<layer> script",
    event: "pull_request",
    documentsOnly: false,
    testScripts: [],
  },
  {
    id: "all-test-scripts",
    what: "an adopter whose manifest declares all five test:<layer> scripts",
    event: "pull_request",
    documentsOnly: false,
    testScripts: ["unit", "component", "integration", "api", "e2e"],
  },
  {
    id: "pull-request-close",
    what: "a pull request closing while its last push is still being tested",
    event: "pull_request",
    action: "closed",
    documentsOnly: false,
    testScripts: ["unit", "component", "integration", "api", "e2e"],
  },
  {
    id: "default-branch-push",
    what: "a push to the default branch",
    event: "push",
    documentsOnly: false,
    testScripts: ["unit", "component", "integration", "api", "e2e"],
  },
];

const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

/** A condition with its `${{ … }}` wrapper removed. */
function conditionText(condition) {
  return String(condition ?? "")
    .trim()
    .replace(/^\$\{\{\s*([\s\S]*?)\s*\}\}$/, "$1")
    .trim();
}

const CLOSE_GATE = "github.event.action != 'closed'";
const LANE_GATE =
  /^contains\(needs\.detection\.outputs\.scripts, '([a-z0-9]+)'\) && contains\(needs\.detection\.outputs\.lanes, '\1'\)$/;

/**
 * The test orchestrator's one lane, gated on the intersection its detection job publishes.
 *
 * The five per-layer conditions became one matrix axis, so the gate no longer names a layer: it
 * asks whether the axis is non-empty, and `instancesOf` reads the width from the same path spec.
 */
const SELECTED_GATE =
  "needs.detection.outputs.selected != '[]' && needs.detection.outputs.selected != ''";

/**
 * Whether a job allocates a runner on this path.
 *
 * Throws on a condition it does not recognise: an unread condition would be counted as running,
 * and a cost figure that over- or under-counts is worse than none.
 */
export function jobRuns(job, pathSpec) {
  const closed = pathSpec.action === "closed";
  const text = conditionText(isRecord(job) ? job["if"] : undefined);
  if (text === "") return true;
  if (text === CLOSE_GATE) return !closed;
  if (text === `always() && ${CLOSE_GATE}`) return !closed;
  if (text === "always()") return true;
  if (text === SELECTED_GATE) {
    // The same two halves the per-layer gate read, asked once: a documents-only change selects no
    // lane, and a path declaring no test script has nothing for the axis to hold.
    return !closed && !pathSpec.documentsOnly && pathSpec.testScripts.length > 0;
  }
  const lane = LANE_GATE.exec(text);
  if (lane !== null) {
    if (closed) return false;
    const layer = lane[1];
    // The detection job selects a lane from the diff, and the manifest declares the script. A
    // documents-only change selects no test lane, so the two halves are read together.
    return !pathSpec.documentsOnly && pathSpec.testScripts.includes(layer);
  }
  throw new Error(`unrecognised job condition, refusing to cost it: ${text}`);
}

/**
 * How many runners a job allocates. A matrix job is billed per leg.
 *
 * The one matrix whose width depends on the event is the validate profile list, which the
 * template writes as a `fromJSON` over the event name; it is read here rather than evaluated,
 * because the expression's two branches are the whole of what it can produce.
 */
export function instancesOf(job, pathSpec) {
  const strategy = isRecord(job) ? job.strategy : undefined;
  const matrix = isRecord(strategy) ? strategy.matrix : undefined;
  if (!isRecord(matrix)) return 1;
  let widest = 1;
  for (const value of Object.values(matrix)) {
    if (Array.isArray(value)) {
      widest = Math.max(widest, value.length);
      continue;
    }
    const text = String(value);
    if (text.includes("needs.detection.outputs.selected")) {
      // One leg per layer the path declares a script for. `jobRuns` has already refused the path
      // where that list is empty, so the axis here is never zero-width.
      widest = Math.max(widest, pathSpec.testScripts.length);
      continue;
    }
    if (text.includes("github.event_name == 'pull_request'")) {
      // `'["full","drift"]'` on a pull request, `'["full"]'` otherwise.
      widest = Math.max(widest, pathSpec.event === "pull_request" ? 2 : 1);
      continue;
    }
    throw new Error(`unrecognised matrix axis, refusing to cost it: ${text}`);
  }
  return widest;
}

/** The runner class a job declares, as written. */
function runnerOf(job) {
  return String(isRecord(job) ? (job["runs-on"] ?? "") : "");
}

/** What one path costs across the shipped templates, derived from what they declare. */
export function shippedCostFigures(root, pathSpec) {
  const allocating = [];
  const runners = new Set();
  const jobsWithoutTimeout = [];
  let runnerJobs = 0;
  let timeoutMinutesSum = 0;

  for (const file of SHIPPED_WORKFLOWS) {
    const parsed = parseYaml(readFileSync(path.join(root, SHIPPED_DIR, file), "utf-8"));
    const jobs = isRecord(parsed) && isRecord(parsed.jobs) ? parsed.jobs : {};
    for (const [jobId, job] of Object.entries(jobs)) {
      if (!jobRuns(job, pathSpec)) continue;
      const instances = instancesOf(job, pathSpec);
      allocating.push(`${file}#${jobId}${instances === 1 ? "" : ` x${instances}`}`);
      runnerJobs += instances;
      runners.add(runnerOf(job));
      const declared = isRecord(job) ? job["timeout-minutes"] : undefined;
      if (typeof declared === "number" && Number.isFinite(declared)) {
        timeoutMinutesSum += declared * instances;
      } else {
        jobsWithoutTimeout.push(`${file}#${jobId}`);
      }
    }
  }

  allocating.sort();
  jobsWithoutTimeout.sort();
  return {
    path: pathSpec.id,
    what: pathSpec.what,
    jobs: allocating,
    runnerJobs,
    runners: [...runners].sort(),
    timeoutMinutesSum,
    billableFloorMinutes: runnerJobs * BILLABLE_JOB_FLOOR_MINUTES,
    jobsWithoutTimeout,
  };
}

/** Every path's figures, in the declared order. */
export function allShippedCostFigures(root) {
  return COST_PATHS.map((pathSpec) => shippedCostFigures(root, pathSpec));
}
