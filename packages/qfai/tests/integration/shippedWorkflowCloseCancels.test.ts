/**
 * A closed pull request ends the run it superseded.
 *
 * Concurrency keyed on `github.ref` cancels a run when a pull request is
 * updated and does nothing when it is closed: the close event carries a
 * different ref expression, so it opens a group of its own and the expensive
 * run started by the last push keeps going with nobody waiting for it. An
 * adopter paying per runner-minute pays for all of it.
 *
 * The pattern here is the one that repository measured: key the group on the
 * pull request's number, add `closed` to the triggering types so the close
 * produces a run at all, and decline the work in every job that costs a runner.
 * The close then allocates a queued run and no minutes.
 *
 * The cases are about the three things that have to hold together — one group
 * across update and close, no work on the close side, and the external check
 * names unchanged, because those are what an adopter's branch protection names.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

// tests/integration/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SHIPPED = path.join(packageRoot, "assets", "init", "root", ".github", "workflows");

const WORKFLOWS = ["qfai-validate.yml", "qfai-docs.yml", "qfai-tests.yml"] as const;

/** The external check name each workflow's aggregate publishes. */
const AGGREGATE_CHECK_NAME: Readonly<Record<string, string>> = {
  "qfai-validate.yml": "qfai validate (full profile, fail on error)",
  "qfai-docs.yml": "qfai docs (document shape and Mermaid syntax)",
  "qfai-tests.yml": "verdict",
};

type Workflow = {
  on?: { pull_request?: { types?: string[] } | null };
  concurrency?: { group?: string; "cancel-in-progress"?: boolean };
  jobs?: Record<string, { name?: string; if?: string; needs?: unknown }>;
};

async function load(name: string): Promise<Workflow> {
  return parse(await readFile(path.join(SHIPPED, name), "utf-8")) as Workflow;
}

/** What `${{ … }}` wraps, so a condition can be read as the expression it is. */
function expression(value: string | undefined): string {
  return (value ?? "").replace(/^\s*\$\{\{\s*/, "").replace(/\s*\}\}\s*$/, "");
}

describe.each(WORKFLOWS)("%s cancels the run a close supersedes", (name) => {
  it("produces a run when the pull request closes", async () => {
    // Without `closed` in the types there is no second run, and a concurrency
    // group cancels nothing: the group exists only while a run is in it.
    const types = (await load(name)).on?.pull_request?.types ?? [];

    expect(types).toContain("closed");
    // The three that start work are still there, so nothing stops being tested.
    expect(types).toEqual(expect.arrayContaining(["opened", "synchronize", "reopened"]));
  });

  it("puts the update and the close in one concurrency group", async () => {
    // The whole of the fix. `github.ref` differs between the pushes and the
    // close, so a group keyed on it never holds both.
    const workflow = await load(name);

    expect(workflow.concurrency?.group).toBe(
      "${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}",
    );
    expect(workflow.concurrency?.["cancel-in-progress"]).toBe(true);
  });

  it("declines the work on the close side", async () => {
    // A job that ran here would spend the minutes the cancellation just saved.
    // A lane whose condition reads a skipped job's outputs needs no clause of
    // its own: the outputs are empty and its `contains` is false.
    const jobs = Object.entries((await load(name)).jobs ?? {});
    expect(jobs.length).toBeGreaterThan(0);

    const rootJobs = jobs.filter(([, job]) => job.needs === undefined);
    expect(rootJobs.length, "every workflow has a job nothing else precedes").toBeGreaterThan(0);
    for (const [id, job] of rootJobs) {
      expect(expression(job.if), `${id} runs on a close`).toContain(
        "github.event.action != 'closed'",
      );
    }

    // An aggregate declares `always()`, which outlives a cancelled dependency,
    // so it is the one job that would otherwise report a verdict on a closed
    // pull request — and `needs.<job>.result` of a skipped job is `skipped`,
    // which its own check reads as a failure.
    for (const [id, job] of jobs) {
      if (!expression(job.if).includes("always()")) continue;
      expect(expression(job.if), `${id} reports a verdict on a close`).toContain(
        "github.event.action != 'closed'",
      );
    }
  });

  it("keeps the external check name the aggregate publishes", async () => {
    // Branch protection names this string. Renaming it while adding a
    // condition would turn a cost change into a merge-blocking one.
    const jobs = Object.values((await load(name)).jobs ?? {});
    const names = jobs
      .map((job) => job.name)
      .filter((value): value is string => value !== undefined);

    expect(names).toContain(AGGREGATE_CHECK_NAME[name]);
  });
});
