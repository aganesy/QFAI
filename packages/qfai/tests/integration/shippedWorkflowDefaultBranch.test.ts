/**
 * A push runs the shipped workflows only on the repository's own default branch.
 *
 * A push filter cannot name the default branch. Listing `main` and `master` there gave a project
 * whose default branch is `trunk` no post-merge check, and checked a branch called `main` that was
 * not the default. So every branch push starts a run, and each job that would otherwise start
 * compares the pushed branch with `github.event.repository.default_branch`.
 *
 * The jobs evaluated are the ones that can start on their own: a job that depends on no other job,
 * and an aggregate, whose `always()` outlives a skipped dependency. Every other job reads the
 * outputs of one of those, and a skipped job publishes none.
 */
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import {
  collectWorkflowJobs,
  evaluateCondition,
  isRecord,
  shippedWorkflowPath,
} from "../helpers/shippedWorkflowFixtures.js";

const WORKFLOWS = ["qfai-validate.yml", "qfai-docs.yml", "qfai-tests.yml"] as const;

async function load(name: string): Promise<unknown> {
  return parse(await readFile(shippedWorkflowPath(name), "utf-8"));
}

/** The jobs that start without another job's say-so, with their conditions. */
async function startingJobs(name: string): Promise<Array<{ jobId: string; condition: unknown }>> {
  return collectWorkflowJobs(await load(name))
    .map(({ jobId, job }) => ({ jobId, needs: job["needs"], condition: job["if"] }))
    .filter(
      ({ needs, condition }) =>
        needs === undefined || (typeof condition === "string" && condition.includes("always()")),
    )
    .map(({ jobId, condition }) => ({ jobId, condition }));
}

type Arrival = {
  readonly what: string;
  readonly event: string;
  readonly branch: string;
  readonly defaultBranch: string;
  readonly starts: boolean;
};

const ARRIVALS: readonly Arrival[] = [
  {
    what: "a push to the default branch trunk",
    event: "push",
    branch: "trunk",
    defaultBranch: "trunk",
    starts: true,
  },
  {
    what: "a push to the default branch main",
    event: "push",
    branch: "main",
    defaultBranch: "main",
    starts: true,
  },
  {
    what: "a push to main where the default branch is trunk",
    event: "push",
    branch: "main",
    defaultBranch: "trunk",
    starts: false,
  },
  {
    what: "a pull request whose branch is not the default",
    event: "pull_request",
    branch: "42/merge",
    defaultBranch: "trunk",
    starts: true,
  },
];

// QFAI:AC-0002-0004-04
// QFAI:EX-0002-0004-09
describe.each(WORKFLOWS)("%s runs a push only on the default branch", (name) => {
  it("starts on a push to any branch and on no tag push", async () => {
    // `**` matches every branch and, unlike an absent filter, no tag: a tag push never ran here.
    const doc = await load(name);
    const on = isRecord(doc) ? doc["on"] : undefined;
    const push = isRecord(on) ? on["push"] : undefined;

    expect(push).toEqual({ branches: ["**"] });
  });

  it.each(ARRIVALS)("$what starts=$starts", async (arrival) => {
    const jobs = await startingJobs(name);
    expect(jobs.length, "every workflow has a job that starts on its own").toBeGreaterThan(0);

    for (const { jobId, condition } of jobs) {
      const runs = evaluateCondition(condition, {
        "github.event.action": arrival.event === "push" ? "" : "synchronize",
        "github.event_name": arrival.event,
        "github.ref_name": arrival.branch,
        "github.event.repository.default_branch": arrival.defaultBranch,
        // The values under which each job runs, so only the branch can decline it.
        "vars.QFAI_CI_PUSH_POLICY": "",
        "needs.scope.outputs.run": "true",
        "needs.detection.outputs.selected": '["unit"]',
      });
      expect(runs, `${jobId}: ${arrival.what}`).toBe(arrival.starts);
    }
  });
});
