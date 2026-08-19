#!/usr/bin/env node
/**
 * Workflow hygiene lane for QFAI's OWN CI trees — `.github/workflows/**` and
 * `.github/actions/**`.
 *
 * Scope is the own tree ONLY. The shipped set under
 * `packages/qfai/assets/init/root/.github/workflows/**` is governed by
 * `.qfai/contracts/cli/shipped-workflows.md` §5/§6 and by a different spec; the
 * rules that reach it arrive with the shipped-file half of this lane, not here.
 * A lane that quietly scanned both would enforce this repository's conventions on
 * every adopter's tree.
 *
 * ## Why a script rather than an off-the-shelf workflow linter
 *
 * `OQ-0017` deferred adopting one, and the honest condition on that deferral is
 * that the coverage boundary stays visible. So on success this lane PRINTS the
 * rules it ran: a green result has to read as a list of checks rather than as a
 * blanket assurance. The contract states that requirement in those terms.
 *
 * ## Usage
 *
 *   node scripts/check-workflow-hygiene.mjs [--root <dir>]
 *
 * `--root` exists for the tests. They plant violations into a COPY of the tree in
 * a temp directory and point the lane at it, rather than editing `.github/` in
 * place: a mutation in the shared working tree produced a false red for a
 * concurrent reviewer earlier in this repository's history, and a test that edits
 * the repository it runs inside leaves it broken if it dies between edit and
 * restore.
 *
 * Exit 0 when every rule passes; exit 1 with `R-WORKFLOW-HYGIENE-DRIFT` on
 * stderr, carrying the offending file, job and rule name, otherwise. The code
 * follows the existing bare-`R-` lint namespace rather than the `QFAI-XXX-NNN`
 * grammar, which is why the three-digit waiver alias rule does not reach it.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { argv, exit, stderr, stdout } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

// pnpm hoists `yaml` under the qfai workspace; resolve from there so this
// root-level script works without adding yaml to the root package.json. Same
// pattern and same reason as `scripts/check-review-profile-consistency.mjs` —
// a bare `import ... from "yaml"` here fails with ERR_MODULE_NOT_FOUND, because
// every other root script imports `node:*` built-ins only.
const require = createRequire(import.meta.url);
const { parse: parseYaml } = require("./../packages/qfai/node_modules/yaml");

const CODE = "R-WORKFLOW-HYGIENE-DRIFT";

/**
 * The rule set, printed on success so a green run names its own coverage.
 * Keyed by the identifier each finding carries, so a red run and this list use
 * the same vocabulary.
 */
const RULES = [
  ["permissions-reachable", "every job has a permission block reachable from it (job or workflow)"],
  ["checkout-credentials", "every checkout step sets persist-credentials: false"],
  ["action-pin", "every `uses:` reference is a full 40-hex commit SHA"],
];

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Whether a permission block is REACHABLE from this job — declared on the job or
 * on its workflow.
 *
 * `"permissions" in x` rather than a truthiness test: an EMPTY map is a valid and
 * deliberate declaration ("this job needs nothing"), and truthiness would read it
 * as missing. That distinction is the whole reason the aggregate verdict declares
 * one.
 *
 * Exported because a `unit` row compares this against the declaration-only
 * counter below. The row imports the lane rather than re-implementing the
 * predicate, so a wrong counter here cannot be masked by a right one in a test.
 */
export function hasReachablePermissions(entry) {
  if (!isRecord(entry)) return false;
  const job = isRecord(entry.job) ? entry.job : {};
  const workflow = isRecord(entry.workflow) ? entry.workflow : {};
  return "permissions" in job || "permissions" in workflow;
}

/**
 * Declaration-only counting — job-level blocks alone.
 *
 * Kept and exported deliberately, even though no rule judges by it:
 * `BR-0017-0014` forbids declaration-only counting *because* it cannot falsify a
 * requirement written against reachability, and the cheapest way to keep that
 * claim honest is for both counters to exist and be compared by a test.
 */
export function hasDeclaredPermissions(entry) {
  if (!isRecord(entry)) return false;
  return isRecord(entry.job) && "permissions" in entry.job;
}

/** Every `*.yml` / `*.yaml` under a directory, recursively, repo-relative. */
function yamlFilesUnder(root, rel) {
  const abs = path.join(root, rel);
  if (!existsSync(abs)) return [];
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.ya?ml$/.test(e.name)) out.push(path.relative(root, p).replace(/\\/g, "/"));
    }
  };
  walk(abs);
  return out;
}

function parseFile(root, rel) {
  try {
    const doc = parseYaml(readFileSync(path.join(root, rel), "utf-8"));
    return isRecord(doc) ? doc : null;
  } catch (error) {
    // A malformed workflow is reported as a finding rather than crashing the
    // lane: a parse error that surfaces as a stack trace reads as a broken tool,
    // and the operator then has no idea which file to look at.
    return { __parseError: error instanceof Error ? error.message : String(error) };
  }
}

/** `{ file, job, jobKey, workflow }` for every job in the own workflows tree. */
function collectJobs(root) {
  const jobs = [];
  const findings = [];
  for (const file of yamlFilesUnder(root, path.join(".github", "workflows"))) {
    const doc = parseFile(root, file);
    if (doc === null || typeof doc.__parseError === "string") {
      findings.push({
        rule: "permissions-reachable",
        file,
        job: "(whole file)",
        detail: `could not be parsed: ${doc?.__parseError ?? "not a mapping"}`,
      });
      continue;
    }
    if (!isRecord(doc.jobs)) {
      findings.push({
        rule: "permissions-reachable",
        file,
        job: "(whole file)",
        detail: "declares no `jobs:` mapping",
      });
      continue;
    }
    for (const [jobKey, job] of Object.entries(doc.jobs)) {
      if (!isRecord(job)) continue;
      jobs.push({ file, jobKey, job, workflow: doc });
    }
  }
  return { jobs, findings };
}

function checkPermissions(jobs) {
  return jobs
    .filter((entry) => !hasReachablePermissions(entry))
    .map((entry) => ({
      rule: "permissions-reachable",
      file: entry.file,
      job: entry.jobKey,
      detail:
        "no permission block is reachable from this job — declare one here or on the workflow",
    }));
}

function checkCheckoutCredentials(jobs) {
  const findings = [];
  for (const entry of jobs) {
    if (!Array.isArray(entry.job.steps)) continue;
    for (const step of entry.job.steps) {
      if (!isRecord(step) || typeof step.uses !== "string") continue;
      if (!step.uses.startsWith("actions/checkout@")) continue;
      const withBlock = isRecord(step.with) ? step.with : {};
      if (withBlock["persist-credentials"] === false) continue;
      findings.push({
        rule: "checkout-credentials",
        file: entry.file,
        job: entry.jobKey,
        detail: "a checkout step does not set `persist-credentials: false`",
      });
    }
  }
  return findings;
}

/** Every `uses:` across the workflows AND actions trees, with where it came from. */
function collectUses(root, jobs) {
  const out = jobs.flatMap((entry) =>
    (Array.isArray(entry.job.steps) ? entry.job.steps : [])
      .filter((step) => isRecord(step) && typeof step.uses === "string")
      .map((step) => ({ file: entry.file, job: entry.jobKey, uses: step.uses })),
  );
  for (const file of yamlFilesUnder(root, path.join(".github", "actions"))) {
    const doc = parseFile(root, file);
    if (doc === null || typeof doc.__parseError === "string") continue;
    const steps = isRecord(doc.runs) ? doc.runs.steps : undefined;
    if (!Array.isArray(steps)) continue;
    for (const step of steps) {
      if (isRecord(step) && typeof step.uses === "string") {
        out.push({ file, job: "(composite action)", uses: step.uses });
      }
    }
  }
  return out;
}

function checkActionPins(uses) {
  // A LOCAL reference (`./.github/actions/setup`) has no pin to check and must
  // not be reported: it resolves inside the repository at the same commit, which
  // is the property pinning exists to buy.
  return uses
    .filter((u) => !u.uses.startsWith("./") && !/@[0-9a-f]{40}$/.test(u.uses))
    .map((u) => ({
      rule: "action-pin",
      file: u.file,
      job: u.job,
      detail: `reference \`${u.uses}\` is not pinned to a full 40-hex commit SHA`,
    }));
}

export function runHygieneLane(root) {
  const { jobs, findings: structural } = collectJobs(root);
  return [
    ...structural,
    ...checkPermissions(jobs),
    ...checkCheckoutCredentials(jobs),
    ...checkActionPins(collectUses(root, jobs)),
  ];
}

function main(argv) {
  const rootFlag = argv.indexOf("--root");
  const root =
    rootFlag >= 0 && argv[rootFlag + 1] !== undefined
      ? path.resolve(argv[rootFlag + 1])
      : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

  const findings = runHygieneLane(root);

  if (findings.length > 0) {
    for (const f of findings) {
      stderr.write(`${CODE}: ${f.rule} — ${f.file} job ${f.job}: ${f.detail}\n`);
    }
    stderr.write(
      `\n${CODE}: ${findings.length} violation(s) across ${new Set(findings.map((f) => f.file)).size} file(s).\n`,
    );
    return 1;
  }

  // The coverage boundary, printed because a green result must not read as a
  // blanket assurance — `OQ-0017`'s deferral of an external linter is only honest
  // while this list is visible.
  stdout.write("workflow hygiene: PASS. Rules run over the own CI tree:\n");
  for (const [id, description] of RULES) {
    stdout.write(`  - ${id}: ${description}\n`);
  }
  stdout.write(
    "Not covered here: the shipped workflow set, runner-label and secret-reference rules, and the required-status-context declaration.\n",
  );
  return 0;
}

if (argv[1] !== undefined && import.meta.url === pathToFileURL(argv[1]).href) {
  exit(main(argv.slice(2)));
}
