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
 * per the shape-guard scope of this suite.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { RETIRED_WORKFLOW_NAMES, SHIPPED_WORKFLOW_NAMES } from "../../src/cli/commands/init.js";
import { isRecord, loadShippedWorkflows } from "../helpers/shippedWorkflowFixtures.js";

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
