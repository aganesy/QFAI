/**
 * Integration: what the header of each shipped workflow says about jobs and the required check.
 *
 * Covers the header rows of the shipped-workflows contract
 * (`.qfai/spec/03_contract/cli/cli-0018-shipped-workflows.md`, BR-0018-0121). GitHub bills each job
 * as at least a minute, so the number of jobs a pull request event starts is the cost an adopter
 * pays, and the header is where they read it. A number typed into a header goes stale without
 * anything failing, so the rows are held against the jobs the file declares.
 */
import { describe, expect, it } from "vitest";

import { IDLE, jobsOf, LANE_RUNS, startedBy } from "../helpers/shippedJobCounts.js";
import {
  headerComment,
  isRecord,
  loadShippedWorkflows,
  parseHeaderTable,
} from "../helpers/shippedWorkflowFixtures.js";

/** The job of each file whose name adopter branch protection is told to require. */
const REQUIRED_CHECK_JOB: Readonly<Record<string, string>> = {
  "qfai-validate.yml": "validate",
  "qfai-docs.yml": "docs",
  "qfai-tests.yml": "verdict",
};

const ROW = /^idle: (\d+) \(([^)]*)\); lane runs: (?:up to )?(\d+) \(([^)]*)\)$/;

function headerRows(body: string): Map<string, string[]> {
  return parseHeaderTable(headerComment(body));
}

describe("the header of each shipped workflow states the jobs a pull request event starts", () => {
  // QFAI:EX-0002-0005-04
  it("gives the idle and lane-running job counts and job lists the file's own jobs produce", async () => {
    // QFAI:AC-0002-0005-03
    const shipped = await loadShippedWorkflows();
    expect(shipped.length).toBeGreaterThan(0);
    for (const [name, body] of shipped) {
      const values = headerRows(body).get("jobs per pull request event") ?? [];
      expect(values, `${name} states the row once`).toHaveLength(1);
      const match = ROW.exec(values[0] ?? "");
      expect(match, `${name}: "${values[0] ?? ""}" is not in the stated form`).not.toBeNull();

      const jobs = jobsOf(body);
      const idle = startedBy(jobs, IDLE);
      const lane = startedBy(jobs, LANE_RUNS);
      expect({ total: Number(match?.[1]), ids: match?.[2] }, `${name} idle`).toEqual(idle);
      expect({ total: Number(match?.[3]), ids: match?.[4] }, `${name} lane runs`).toEqual(lane);
    }
  });
});

describe("the header of each shipped workflow names the required check and the rules around it", () => {
  // QFAI:EX-0002-0005-05
  it("names the job's check name in the Required check row", async () => {
    // QFAI:AC-0002-0005-03
    for (const [name, body] of await loadShippedWorkflows()) {
      const jobId = REQUIRED_CHECK_JOB[name];
      expect(jobId, `${name} has a required check job`).toBeDefined();
      const job = jobsOf(body)[jobId ?? ""];
      expect(isRecord(job), `${name} declares job ${jobId}`).toBe(true);
      const checkName = isRecord(job) && typeof job["name"] === "string" ? job["name"] : jobId;

      const values = headerRows(body).get("required check") ?? [];
      expect(values, `${name} states the row once`).toHaveLength(1);
      expect(values[0], name).toContain(checkName);
    }
  });

  // QFAI:EX-0002-0005-05
  it("says renaming the check means changing branch protection in the same step, and why a paths filter breaks it", async () => {
    // QFAI:AC-0002-0005-03
    for (const [name, body] of await loadShippedWorkflows()) {
      const header = headerComment(body).replace(/^# ?/gm, "").replace(/\s+/g, " ");
      expect(header, `${name}: rename`).toMatch(/rename [^.]* in the same step/i);
      expect(header, `${name}: branch protection`).toContain("branch protection");
      expect(header, `${name}: paths filter`).toMatch(
        /`paths` or `paths-ignore` filter[\s\S]{0,200}reports nothing/,
      );
    }
  });
});
