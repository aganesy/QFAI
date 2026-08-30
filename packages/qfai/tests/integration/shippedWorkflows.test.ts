/**
 * Integration: shipped GitHub Actions workflow-set bounding and credential
 * hygiene.
 *
 * Covers the operational-bounding half of the shipped-workflows contract
 * (`.qfai/contracts/cli/shipped-workflows.md`, CLI-WFSET §5 dimension 3 and
 * §6): every shipped job is bounded (reachable least-privilege
 * `permissions:` block, `timeout-minutes:`) and every shipped workflow
 * cancels superseded runs via a ref-scoped `concurrency:` group. The
 * shipped/retired name lists' disjointness invariant (the write/prune sets
 * can never claim the same name) is asserted here as well — its ruled home
 * per the shape-guard scope of this suite. The lockfile-aware install
 * path's survival through the hardening (five branches, nested cache
 * ternary, engines-backed header floor claims) is the third describe's
 * surface.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { RETIRED_WORKFLOW_NAMES, SHIPPED_WORKFLOW_NAMES } from "../../src/cli/commands/init.js";
import { isRecord, loadShippedWorkflows } from "../helpers/shippedWorkflowFixtures.js";

// tests/integration/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Every job of a parsed workflow document as `{ jobId, job }` records. */
function collectJobs(doc: unknown): Array<{ jobId: string; job: Record<string, unknown> }> {
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

/** Every step of one job, in declaration order (empty for step-less jobs). */
function collectSteps(job: Record<string, unknown>): Array<Record<string, unknown>> {
  const steps = job["steps"];
  if (!Array.isArray(steps)) {
    return [];
  }
  return steps.filter(isRecord);
}

describe("TC-0003-0027 (TDD-0027): every shipped job declares a reachable permissions block, a timeout and a cancelling concurrency group", () => {
  // One it() per TC-0003-0027 verify bullet, plus the carried advisory-27
  // obligation (SHIPPED/RETIRED disjointness) whose ruled home is this
  // suite. The permissions bullet reads "block": a job-level or
  // workflow-level `permissions:` MAP reaching the job — the string forms
  // (`read-all` etc.) are not a least-privilege block and do not satisfy it.

  /**
   * The permissions declaration that reaches a job: the job's own block
   * when present, else the workflow-level block (TC-0003-0027 bullet 1's
   * two sanctioned placements).
   */
  function reachablePermissions(doc: unknown, job: Record<string, unknown>): unknown {
    const jobPermissions = job["permissions"];
    if (jobPermissions !== undefined) {
      return jobPermissions;
    }
    return isRecord(doc) ? doc["permissions"] : undefined;
  }

  it("every job has a job-reachable permissions block (job-level or workflow-level map)", async () => {
    const violations: string[] = [];
    let jobCount = 0;
    for (const [name, body] of await loadShippedWorkflows()) {
      const doc: unknown = parse(body);
      for (const { jobId, job } of collectJobs(doc)) {
        jobCount += 1;
        if (!isRecord(reachablePermissions(doc, job))) {
          violations.push(`${name}: job "${jobId}" has no reachable permissions: block`);
        }
      }
    }
    // Non-vacuity: the shipped set carries jobs today; zero collected would
    // mean this oracle stopped observing anything.
    expect(jobCount).toBeGreaterThanOrEqual(1);
    expect(violations).toEqual([]);
  });

  it("every job declares timeout-minutes", async () => {
    const violations: string[] = [];
    let jobCount = 0;
    for (const [name, body] of await loadShippedWorkflows()) {
      for (const { jobId, job } of collectJobs(parse(body))) {
        jobCount += 1;
        if (typeof job["timeout-minutes"] !== "number") {
          violations.push(`${name}: job "${jobId}" declares no timeout-minutes`);
        }
      }
    }
    expect(jobCount).toBeGreaterThanOrEqual(1);
    expect(violations).toEqual([]);
  });

  it("every workflow declares a ref-scoped concurrency group with cancel-in-progress: true", async () => {
    const violations: string[] = [];
    for (const [name, body] of await loadShippedWorkflows()) {
      const doc: unknown = parse(body);
      const concurrency = isRecord(doc) ? doc["concurrency"] : undefined;
      if (!isRecord(concurrency)) {
        violations.push(`${name}: declares no concurrency: block`);
        continue;
      }
      const group = concurrency["group"];
      if (typeof group !== "string" || !group.includes("github.ref")) {
        violations.push(`${name}: concurrency group is not ref-scoped (${String(group)})`);
      }
      if (concurrency["cancel-in-progress"] !== true) {
        violations.push(`${name}: concurrency does not set cancel-in-progress: true`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("the orchestrator's verdict job, when present, declares an empty permissions map", async () => {
    // Vacuously green today, disclosed: the orchestrator's detection /
    // verdict job pair is a later ledger row's surface, so zero jobs named
    // "verdict" ship yet. This it pins the empty-permission-map invariant
    // (BR wording: the verdict job carries an empty map, not merely a
    // minimal one) so the pair cannot land without it.
    const violations: string[] = [];
    for (const [name, body] of await loadShippedWorkflows()) {
      for (const { jobId, job } of collectJobs(parse(body))) {
        if (jobId !== "verdict") {
          continue;
        }
        const permissions = job["permissions"];
        if (!isRecord(permissions) || Object.keys(permissions).length !== 0) {
          violations.push(`${name}: verdict job permissions is not an empty map`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("artifact upload steps, when present, are cancellation-guarded, tolerate missing files and keep retention at 7 days or less", async () => {
    // Vacuously green today, disclosed: no shipped step uploads artifacts
    // yet. The scan is the obligation — any future upload step must skip on
    // cancellation, tolerate missing files and bound retention, or this it
    // names it.
    const violations: string[] = [];
    for (const [name, body] of await loadShippedWorkflows()) {
      for (const { jobId, job } of collectJobs(parse(body))) {
        for (const step of collectSteps(job)) {
          const uses = step["uses"];
          if (typeof uses !== "string" || !uses.startsWith("actions/upload-artifact@")) {
            continue;
          }
          const condition = step["if"];
          if (typeof condition !== "string" || !condition.includes("cancelled")) {
            violations.push(`${name}: job "${jobId}" upload step is not cancellation-guarded`);
          }
          const withNode = step["with"];
          if (!isRecord(withNode)) {
            violations.push(`${name}: job "${jobId}" upload step has no with: block`);
            continue;
          }
          const ifNoFiles = withNode["if-no-files-found"];
          if (ifNoFiles !== "warn" && ifNoFiles !== "ignore") {
            violations.push(`${name}: job "${jobId}" upload step does not tolerate missing files`);
          }
          const retention = withNode["retention-days"];
          if (typeof retention !== "number" || retention > 7) {
            violations.push(
              `${name}: job "${jobId}" upload step retention-days is not bounded to 7`,
            );
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("the shipped and retired workflow name lists are disjoint", () => {
    // Carried obligation (advisory 27, ruled home): the contract's
    // write/prune sets may never claim the same name — a name moves from
    // shipped to retired in the change that stops shipping it, never
    // holding membership in both.
    expect([...SHIPPED_WORKFLOW_NAMES].filter((name) => RETIRED_WORKFLOW_NAMES.has(name))).toEqual(
      [],
    );
  });
});

describe("TC-0003-0028 (TDD-0055): every shipped checkout refuses to persist credentials and full history stays job-scoped", () => {
  // The STATIC half of TC-0003-0028 (AC-0003-0025 / BR-0003-0022): checkout
  // credential hygiene asserted directly against the shipped tree. The
  // TC's lane bullets (planted-tree exit 1 / clean exit 0, and the
  // file+job+rule naming in the lane output) are the workflow-hygiene
  // lane's behaviour and belong to the split-off TDD-0028 row — not
  // covered here.

  /** Every checkout step across a parsed workflow, with its job id. */
  function collectCheckoutSteps(
    doc: unknown,
  ): Array<{ jobId: string; step: Record<string, unknown> }> {
    const checkouts: Array<{ jobId: string; step: Record<string, unknown> }> = [];
    for (const { jobId, job } of collectJobs(doc)) {
      for (const step of collectSteps(job)) {
        const uses = step["uses"];
        if (typeof uses === "string" && uses.startsWith("actions/checkout@")) {
          checkouts.push({ jobId, step });
        }
      }
    }
    return checkouts;
  }

  /** Occurrences of a mapping key anywhere in a parsed YAML tree. */
  function countKeyOccurrences(node: unknown, key: string): number {
    if (Array.isArray(node)) {
      return node.reduce((count: number, member) => count + countKeyOccurrences(member, key), 0);
    }
    if (!isRecord(node)) {
      return 0;
    }
    let count = 0;
    for (const [candidate, value] of Object.entries(node)) {
      if (candidate === key) {
        count += 1;
      }
      count += countKeyOccurrences(value, key);
    }
    return count;
  }

  it("every checkout step sets persist-credentials: false", async () => {
    const violations: string[] = [];
    let checkoutCount = 0;
    for (const [name, body] of await loadShippedWorkflows()) {
      for (const { jobId, step } of collectCheckoutSteps(parse(body))) {
        checkoutCount += 1;
        const withNode = step["with"];
        if (!isRecord(withNode) || withNode["persist-credentials"] !== false) {
          violations.push(
            `${name}: job "${jobId}" checkout step does not set persist-credentials: false`,
          );
        }
      }
    }
    // Non-vacuity: the shipped set carries at least one checkout today
    // (qfai-validate's). The qfai-tests skeleton jobs check nothing out —
    // they contribute zero checkouts, which is why the count guard exists.
    expect(checkoutCount).toBeGreaterThanOrEqual(1);
    expect(violations).toEqual([]);
  });

  it("fetch-depth appears only inside a checkout step's with: block, never as a workflow default", async () => {
    // Vacuously green today, disclosed: no shipped checkout requests full
    // history yet. The scan is the obligation — a future full-history
    // request (e.g. the orchestrator's detection job) must sit on the
    // requesting job's own checkout step; any placement outside a checkout
    // `with:` block (workflow level, defaults:, job level) breaks the
    // count equality and is named.
    const violations: string[] = [];
    for (const [name, body] of await loadShippedWorkflows()) {
      const doc: unknown = parse(body);
      const totalOccurrences = countKeyOccurrences(doc, "fetch-depth");
      let checkoutScoped = 0;
      for (const { step } of collectCheckoutSteps(doc)) {
        const withNode = step["with"];
        if (isRecord(withNode) && "fetch-depth" in withNode) {
          checkoutScoped += 1;
        }
      }
      if (totalOccurrences !== checkoutScoped) {
        violations.push(
          `${name}: ${totalOccurrences - checkoutScoped} fetch-depth key(s) outside a checkout step's with: block`,
        );
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("TC-0003-0029 (TDD-0029): four lockfile branches plus the no-lockfile branch survive hardening", () => {
  // Realizes TC-0003-0029 (AC-0003-0026 / BR-0003-0023 "extend, never
  // replace"), one it() per verify bullet. Scoping decisions, disclosed:
  //   - Install-shape bullets apply to shipped files that HAVE install
  //     steps. The qfai-tests lanes ship install-less by the skeleton's
  //     staging design (their install bodies land with the lane-enabling
  //     rows), so demanding the branch shape of every FILE would contradict
  //     that staging; the set-wide scan below picks up any file the moment
  //     it gains an install step.
  //   - The header bullet pins the explicit engines-citation form present
  //     in the shipped set, judged against `package.json#engines.node` read
  //     at run time (never hardcoded). Prose-form header completeness is
  //     TC-0003-0042's surface.

  /** The five install branches BR-0003-0023 requires, as body markers. */
  const INSTALL_BRANCH_MARKERS: readonly string[] = [
    "pnpm install --frozen-lockfile",
    "yarn install --immutable",
    "yarn install --frozen-lockfile",
    "npm ci",
    "npm install --no-audit --no-fund",
  ];

  /** The three lockfile probes the branch selection detects. */
  const LOCKFILE_PROBES: readonly string[] = ["pnpm-lock.yaml", "yarn.lock", "package-lock.json"];

  /** Steps whose run body invokes a package-manager install, per job. */
  function collectInstallSteps(doc: unknown): Array<{ jobId: string; run: string }> {
    const installs: Array<{ jobId: string; run: string }> = [];
    for (const { jobId, job } of collectJobs(doc)) {
      for (const step of collectSteps(job)) {
        const run = step["run"];
        if (typeof run === "string" && /\b(?:pnpm|yarn|npm)\s+(?:install|ci)\b/.test(run)) {
          installs.push({ jobId, run });
        }
      }
    }
    return installs;
  }

  it("every install step keeps all five branches: pnpm, Yarn Berry, Yarn Classic, npm and the no-lockfile fallback", async () => {
    const violations: string[] = [];
    let installStepCount = 0;
    for (const [name, body] of await loadShippedWorkflows()) {
      for (const { jobId, run } of collectInstallSteps(parse(body))) {
        installStepCount += 1;
        for (const marker of INSTALL_BRANCH_MARKERS) {
          if (!run.includes(marker)) {
            violations.push(`${name}: job "${jobId}" install step lost the "${marker}" branch`);
          }
        }
        for (const probe of LOCKFILE_PROBES) {
          if (!run.includes(`[ -f ${probe} ]`)) {
            violations.push(`${name}: job "${jobId}" install step lost the ${probe} detection`);
          }
        }
      }
    }
    // Non-vacuity: the shipped set carries an install step today.
    expect(installStepCount).toBeGreaterThanOrEqual(1);
    expect(violations).toEqual([]);
  });

  it("never asks setup-node for a Yarn cache before Yarn can answer", async () => {
    // The row above deliberately accepts the decision wherever it is made, which means it does
    // NOT catch a return to the expression that caused this. This one does.
    //
    // `cache: yarn` makes setup-node run `yarn cache dir` to resolve the cache directory, and it
    // does that BEFORE the install step below has provisioned anything. pnpm and npm are already
    // there — `pnpm/action-setup` runs above and npm ships with Node — but Yarn is not, and
    // Corepack is unbundled from Node 25 on. The Node a shipped lane runs is the ADOPTER's, from
    // their own `.nvmrc` / `.node-version`, so on a runner with neither Yarn nor Corepack the job
    // stopped at that step: the lane failing at the one point it is built to fail open.
    //
    // The property is not a shape. It is that nothing can hand setup-node the literal `yarn`
    // unless Yarn answered first.
    const violations: string[] = [];
    for (const [name, body] of await loadShippedWorkflows()) {
      for (const { jobId, job } of collectJobs(parse(body))) {
        const steps = [...collectSteps(job)];
        for (const step of steps) {
          const uses = step["uses"];
          if (typeof uses !== "string" || !uses.startsWith("actions/setup-node@")) continue;
          const withNode = step["with"];
          const cache = isRecord(withNode) ? withNode["cache"] : undefined;
          if (typeof cache !== "string") continue;

          // An expression that can evaluate to `yarn` on its own has no way to ask.
          const named = /steps\.([A-Za-z0-9_-]+)\.outputs\./.exec(cache);
          if (named === null) {
            if (cache.includes("yarn")) {
              violations.push(
                `${name}: job ${jobId} decides the cache in an expression that can yield yarn, which cannot ask whether Yarn is on PATH`,
              );
            }
            continue;
          }

          const producer = steps.find((candidate) => candidate["id"] === named[1]);
          const deciding = producer?.["run"];
          if (typeof deciding !== "string") {
            violations.push(
              `${name}: job "${jobId}" cache: names steps.${named[1]}, which produces no body`,
            );
            continue;
          }

          // Every emission of the yarn cache must sit behind the QUERY setup-node will make.
          // `command -v yarn` is not that query: a stale shim, or a yarn that cannot resolve
          // its own cache, satisfies it and still fails where it matters.
          //
          // Read from the COMMANDS, with `#` lines dropped first. Measured: the step's own
          // comment explains why the query is what it is, so a body-wide search found
          // `yarn cache dir` in the prose and reported a probe that had been removed from the
          // code. That is the second time in this change a row matched a sentence about a
          // thing instead of the thing.
          const commands = deciding
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line !== "" && !line.startsWith("#"))
            .join("\n");
          const emits = /cache=yarn/.test(commands);
          const probes = /yarn cache dir/.test(commands);
          if (emits && !probes) {
            violations.push(`${name}: job ${jobId} emits the yarn cache without probing for yarn`);
            continue;
          }
          if (emits) {
            const probeAt = commands.search(/yarn cache dir/);
            const emitAt = commands.search(/cache=yarn/);
            if (probeAt > emitAt) {
              violations.push(
                `${name}: job ${jobId} probes for yarn only after claiming its cache`,
              );
            }
          }

          // …and the skip has to leave the lane running: an EMPTY cache value, not a failure.
          // `echo "cache=" >> "$GITHUB_OUTPUT"` is what that looks like, and setup-node reads an
          // empty `cache:` as no cache at all.
          if (emits && !/cache="\s*(>>|$)/m.test(commands)) {
            violations.push(
              `${name}: job ${jobId} has no branch that emits an empty cache, so an unresolvable Yarn has nowhere to go but a failure`,
            );
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
  it("keeps all four lockfile branches deciding the setup-node cache, wherever that decision lives", async () => {
    // The decision used to be a nested ternary in `cache:` itself. It moved into a step, because
    // an expression cannot ask whether the package manager is on PATH and `cache: yarn` sends
    // setup-node to `yarn cache dir` before anything has installed Yarn — which failed the job on
    // a runner carrying neither Yarn nor Corepack.
    //
    // What this row protects is unchanged and is not the ternary: every lockfile the shipped lane
    // supports must still decide the cache, and no `cache:` may collapse to a single literal that
    // ignores what the adopter actually uses. So it follows the decision to wherever it is made —
    // an expression, or the body of the step the expression reads.
    const violations: string[] = [];
    let cacheExpressionCount = 0;
    for (const [name, body] of await loadShippedWorkflows()) {
      const parsed = parse(body);
      for (const { jobId, job } of collectJobs(parsed)) {
        const steps = [...collectSteps(job)];
        for (const step of steps) {
          const uses = step["uses"];
          if (typeof uses !== "string" || !uses.startsWith("actions/setup-node@")) {
            continue;
          }
          const withNode = step["with"];
          const cache = isRecord(withNode) ? withNode["cache"] : undefined;
          if (cache === undefined) {
            continue;
          }
          cacheExpressionCount += 1;
          if (typeof cache !== "string") {
            violations.push(`${name}: job "${jobId}" cache: is not a string expression`);
            continue;
          }
          if (["pnpm", "yarn", "npm"].includes(cache.trim())) {
            violations.push(
              `${name}: job "${jobId}" cache: was replaced by the single literal "${cache.trim()}"`,
            );
            continue;
          }

          // Where the decision is made: in the expression, or in the step it names.
          const named = /steps\.([A-Za-z0-9_-]+)\.outputs\./.exec(cache);
          let deciding = cache;
          if (named !== null) {
            const producer = steps.find((candidate) => candidate["id"] === named[1]);
            const producerRun = producer === undefined ? undefined : producer["run"];
            if (typeof producerRun !== "string") {
              violations.push(
                `${name}: job "${jobId}" cache: reads steps.${named[1]}.outputs, and no step with that id produces a body`,
              );
              continue;
            }
            deciding = producerRun;
          }

          for (const probe of LOCKFILE_PROBES) {
            if (!deciding.includes(probe)) {
              violations.push(`${name}: job "${jobId}" cache: lost the ${probe} detection`);
            }
          }
          const branching =
            named === null
              ? deciding.includes("&&") && deciding.includes("||")
              : /\bif\b/.test(deciding) && /\belif\b/.test(deciding);
          if (!branching) {
            violations.push(`${name}: job "${jobId}" cache: is no longer a conditional chain`);
          }
        }
      }
    }
    expect(cacheExpressionCount).toBeGreaterThanOrEqual(1);
    expect(violations).toEqual([]);
  });

  it("every install-bearing shipped file carries the same five-branch install shape", async () => {
    // The "extend, never replace" half of BR-0003-0023: a new shipped file
    // that introduces an install step must reproduce the full branch form.
    // Deliberate overlap with the first it (per-step branch presence) —
    // this it judges at file level so a future file with a partial install
    // step is named as a shape divergence, not just a missing marker.
    const violations: string[] = [];
    for (const [name, body] of await loadShippedWorkflows()) {
      const installSteps = collectInstallSteps(parse(body));
      if (installSteps.length === 0) {
        // Install-less files (today: the staged qfai-tests lanes) are out
        // of scope by the skeleton's staging design, disclosed above.
        continue;
      }
      const markersPresent = new Set<string>();
      for (const { run } of installSteps) {
        for (const marker of INSTALL_BRANCH_MARKERS) {
          if (run.includes(marker)) {
            markersPresent.add(marker);
          }
        }
      }
      if (markersPresent.size !== INSTALL_BRANCH_MARKERS.length) {
        violations.push(
          `${name}: install shape diverges from the canonical five-branch form (${markersPresent.size}/${INSTALL_BRANCH_MARKERS.length} branches)`,
        );
      }
    }
    expect(violations).toEqual([]);
  });

  it("no shipped comment line claims a Node support floor the package's engines field does not declare", async () => {
    const packageJsonRaw = await readFile(path.join(packageRoot, "package.json"), "utf-8");
    const packageJson: unknown = JSON.parse(packageJsonRaw);
    const engines = isRecord(packageJson) ? packageJson["engines"] : undefined;
    const enginesNode = isRecord(engines) ? engines["node"] : undefined;
    if (typeof enginesNode !== "string") {
      throw new Error("package.json#engines.node is missing — the floor oracle has no baseline");
    }
    const declared = enginesNode.match(/>=\s*([0-9]+(?:\.[0-9]+){0,2})/)?.[1];
    if (declared === undefined) {
      throw new Error(`package engines.node "${enginesNode}" declares no >=X.Y.Z floor`);
    }
    const violations: string[] = [];
    for (const [name, body] of await loadShippedWorkflows()) {
      body.split(/\r?\n/).forEach((line, index) => {
        if (!line.trimStart().startsWith("#")) {
          return;
        }
        for (const match of line.matchAll(/>=\s*([0-9]+(?:\.[0-9]+){0,2})/g)) {
          const claimed = match[1] ?? "";
          if (claimed !== declared) {
            violations.push(
              `${name}:${index + 1}: claims floor ">=${claimed}" but package engines.node declares "${enginesNode}"`,
            );
          }
        }
      });
    }
    expect(violations).toEqual([]);
  });
});
