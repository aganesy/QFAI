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
 * ## The eight paths
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
 * contract permits, and `.qfai/spec/03_contract/cli/cli-0018-shipped-workflows.md` BR-CLI-0018-0033 is what keeps that
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
 * `event` decides the triggering shape, `documentsOnly` whether the change touched documents and
 * no source, `documentsTouched` whether it touched documents at all — which is what the document
 * lane's scope reads — and `testScripts` which `test:<layer>` scripts the adopter's manifest
 * declares, the opt-in the test lanes read through the detection job's outputs. `pushPolicy` is the
 * adopter's `QFAI_CI_PUSH_POLICY`: `protected` declares that every merge passed a pull request's
 * checks first, so a push runs no lane and no document check, and `none` also declines the
 * validation job.
 */
export const COST_PATHS = [
  {
    id: "documentation-only-pull-request",
    what: "a pull request that touches documents and no source",
    event: "pull_request",
    documentsOnly: true,
    documentsTouched: true,
    testScripts: [],
  },
  {
    id: "code-pull-request",
    what: "a pull request that touches source and no document",
    event: "pull_request",
    documentsOnly: false,
    documentsTouched: false,
    testScripts: [],
  },
  {
    id: "no-test-scripts",
    what: "an adopter whose manifest declares no test:<layer> script",
    event: "pull_request",
    documentsOnly: false,
    documentsTouched: false,
    testScripts: [],
  },
  {
    id: "all-test-scripts",
    what: "an adopter whose manifest declares all five test:<layer> scripts",
    event: "pull_request",
    documentsOnly: false,
    documentsTouched: false,
    testScripts: ["unit", "component", "integration", "api", "e2e"],
  },
  {
    id: "pull-request-close",
    what: "a pull request closing while its last push is still being tested",
    event: "pull_request",
    action: "closed",
    documentsOnly: false,
    documentsTouched: true,
    testScripts: ["unit", "component", "integration", "api", "e2e"],
  },
  {
    id: "default-branch-push",
    what: "a push to the default branch",
    event: "push",
    documentsOnly: false,
    // A push carries whatever the merged pull request carried, which the path does not know, so
    // it is costed as touching documents — the figure it states is then an upper bound.
    documentsTouched: true,
    testScripts: ["unit", "component", "integration", "api", "e2e"],
  },
  {
    id: "protected-default-branch-push",
    what: "a push to the default branch where the adopter declares the protected push policy",
    event: "push",
    pushPolicy: "protected",
    documentsOnly: false,
    documentsTouched: true,
    testScripts: ["unit", "component", "integration", "api", "e2e"],
  },
  {
    id: "none-default-branch-push",
    what: "a push to the default branch where the adopter declares the none push policy",
    event: "push",
    pushPolicy: "none",
    documentsOnly: false,
    documentsTouched: true,
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
const SCOPE_GATE = "needs.scope.outputs.run == 'true' && github.event.action != 'closed'";

const SELECTED_GATE =
  "needs.detection.outputs.selected != '[]' && needs.detection.outputs.selected != ''";

/**
 * The aggregates that decline to start when the job they read said, explicitly, that nothing was to
 * run. The document aggregate reads the scope's answer and the test verdict reads the selection, so
 * each starts on exactly the paths where the lane it reports on runs.
 */
const SCOPE_AGGREGATE = `always() && ${CLOSE_GATE} && needs.scope.outputs.run != 'false'`;
const SELECTED_AGGREGATE = `always() && ${CLOSE_GATE} && needs.detection.outputs.selected != '[]'`;

/** The validation job: the close gate, and a push the adopter turned off. */
const PUSH_POLICY_GATE = `${CLOSE_GATE} && (github.event_name != 'push' || vars.QFAI_CI_PUSH_POLICY != 'none')`;

/**
 * Whether a job allocates a runner on this path.
 *
 * Throws on a condition it does not recognise: an unread condition would be counted as running,
 * and a cost figure that over- or under-counts is worse than none.
 */
export function jobRuns(job, pathSpec) {
  const closed = pathSpec.action === "closed";
  // The scope and detection bodies answer "run nothing" for this push before they read the diff.
  const coveredPush =
    pathSpec.event === "push" &&
    (pathSpec.pushPolicy === "protected" || pathSpec.pushPolicy === "none");
  const text = conditionText(isRecord(job) ? job["if"] : undefined);
  if (text === "") return true;
  if (text === CLOSE_GATE) return !closed;
  if (text === `always() && ${CLOSE_GATE}`) return !closed;
  if (text === "always()") return true;
  if (text === PUSH_POLICY_GATE) {
    return !closed && !(pathSpec.event === "push" && pathSpec.pushPolicy === "none");
  }
  if (text === SCOPE_AGGREGATE) {
    // Starts exactly when the scope did not answer false, which is when the checks run.
    return !closed && !coveredPush && pathSpec.documentsTouched === true;
  }
  if (text === SELECTED_AGGREGATE) {
    // Starts exactly when the selection is not empty, which is when the test lane runs.
    return !closed && !coveredPush && !pathSpec.documentsOnly && pathSpec.testScripts.length > 0;
  }
  if (text === SCOPE_GATE) {
    // The document lane runs when its scope found a change a document check reads.
    return !closed && !coveredPush && pathSpec.documentsTouched === true;
  }
  if (text === SELECTED_GATE) {
    // The same two halves the per-layer gate read, asked once: a documents-only change selects no
    // lane, and a path declaring no test script has nothing for the axis to hold.
    return !closed && !coveredPush && !pathSpec.documentsOnly && pathSpec.testScripts.length > 0;
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

/** The entries of a matrix `include` or `exclude` list; throws when it is not a list of mappings. */
function matrixEntries(name, list) {
  if (list === undefined) return [];
  if (!Array.isArray(list) || !list.every(isRecord)) {
    throw new Error(`unrecognised matrix ${name}, refusing to cost it: ${JSON.stringify(list)}`);
  }
  return list;
}

/** True when every match is, false when one is not, and `undefined` when that cannot be read. */
function allOf(matches) {
  if (matches.includes(false)) return false;
  return matches.includes(undefined) ? undefined : true;
}

/** True when one match is, false when none is, and `undefined` when that cannot be read. */
function anyOf(matches) {
  if (matches.includes(true)) return true;
  return matches.includes(undefined) ? undefined : false;
}

/**
 * Whether two matrix values are the same: a mapping whatever its key order, a list item by item.
 * A number or boolean and a string spelled the same may be merged by the runner, so their match is
 * `undefined` rather than guessed.
 */
function sameValue(left, right) {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    return allOf(left.map((value, index) => sameValue(value, right[index])));
  }
  if (isRecord(left) || isRecord(right)) {
    if (!isRecord(left) || !isRecord(right)) return false;
    const keys = Object.keys(left);
    if (keys.length !== Object.keys(right).length || keys.some((key) => !(key in right))) {
      return false;
    }
    return allOf(keys.map((key) => sameValue(left[key], right[key])));
  }
  if (left === right) return true;
  return String(left) === String(right) ? undefined : false;
}

/** Whether a matrix value holds a `${{ }}` expression anywhere, whose value the text does not give. */
function holdsExpression(value) {
  if (typeof value === "string") return value.includes("${{");
  if (Array.isArray(value)) return value.some(holdsExpression);
  return isRecord(value) && Object.values(value).some(holdsExpression);
}

/**
 * The legs of a matrix whose axes are all written out, the way GitHub expands it: every
 * combination of the axes, less each one an `exclude` entry matches, plus one leg for each
 * `include` entry that extends no remaining combination. Throws where `qfai doctor` names the
 * workflow as not counted: an `exclude` key that is not an axis, a match that cannot be read, or a
 * matrix with no leg.
 */
function expandMatrix(axes, exclude, include) {
  const names = Object.keys(axes);
  const refuse = (why) => {
    throw new Error(`unrecognised matrix: ${why}, refusing to cost it`);
  };
  if (exclude.some((entry) => Object.keys(entry).some((key) => !names.includes(key)))) {
    refuse("an exclude key is not an axis");
  }
  let combinations = names.length === 0 ? [] : [{}];
  for (const name of names) {
    combinations = combinations.flatMap((combination) =>
      axes[name].map((value) => ({ ...combination, [name]: value })),
    );
  }
  const excluded = combinations.map((combination) =>
    anyOf(
      exclude.map((entry) =>
        allOf(Object.entries(entry).map(([key, value]) => sameValue(combination[key], value))),
      ),
    ),
  );
  if (excluded.includes(undefined)) refuse("an exclude match cannot be read");
  const kept = combinations.filter((_, index) => excluded[index] === false);
  const extended = include.map((entry) =>
    anyOf(
      kept.map((combination) =>
        allOf(
          Object.entries(entry)
            .filter(([key]) => names.includes(key))
            .map(([key, value]) => sameValue(combination[key], value)),
        ),
      ),
    ),
  );
  if (extended.includes(undefined)) refuse("an include match cannot be read");
  const legs = kept.length + extended.filter((match) => match === false).length;
  if (legs === 0) refuse("it has no leg");
  return legs;
}

/**
 * How many runners a job allocates. A matrix job is billed per leg, counted as `qfai doctor`
 * counts it: the product of the axes, less each `exclude` match, plus each `include` entry that
 * extends no remaining combination.
 *
 * The one matrix whose width depends on the path is the test lane's layer list, which the
 * template writes as a `fromJSON` over the detection job's output; it is read here rather than
 * evaluated, as one leg per layer the path declares a script for, and only with no `include` or
 * `exclude`, whose match against legs whose values are not known cannot be read. For the same
 * reason no value inside a literal axis, an `include` or an `exclude` may be an expression.
 */
export function instancesOf(job, pathSpec) {
  const strategy = isRecord(job) ? job.strategy : undefined;
  const matrix = isRecord(strategy) ? strategy.matrix : undefined;
  if (!isRecord(matrix)) return 1;
  const include = matrixEntries("include", matrix.include);
  const exclude = matrixEntries("exclude", matrix.exclude);
  const axes = {};
  let layerAxes = 0;
  for (const [name, value] of Object.entries(matrix)) {
    if (name === "include" || name === "exclude") continue;
    if (Array.isArray(value) && value.length > 0) {
      axes[name] = value;
      continue;
    }
    const text = Array.isArray(value) ? "[]" : String(value);
    if (text.includes("needs.detection.outputs.selected")) {
      layerAxes += 1;
      continue;
    }
    throw new Error(`unrecognised matrix axis, refusing to cost it: ${text}`);
  }
  if ([...Object.values(axes), include, exclude].some(holdsExpression)) {
    throw new Error("unrecognised matrix value, refusing to cost an expression inside a list");
  }
  if (layerAxes === 0) return expandMatrix(axes, exclude, include);
  if (include.length > 0 || exclude.length > 0) {
    throw new Error("unrecognised matrix: the layer axis with an include or exclude");
  }
  // `jobRuns` has already refused the path where the layer list is empty, so the axis here is
  // never zero-width.
  return Object.values(axes).reduce(
    (legs, axis) => legs * axis.length,
    pathSpec.testScripts.length ** layerAxes,
  );
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
