/**
 * Integration: the Windows job is selected like the test lanes and joins the aggregate verdict,
 * so its failure fails `ci-pass`.
 */
// QFAI:SPEC-0017:TC-0017-0097
// QFAI:SPEC-0017:TC-0017-0098
import { describe, expect, it } from "vitest";

import { WINDOWS_JOB, job, needsOf, verdictExit } from "./ownCi.js";

describe("the Windows job's selection and verdict", () => {
  it("TC-0017-0097: The job follows change detection and joins the verdict", () => {
    const windows = job(WINDOWS_JOB);

    expect(needsOf(windows)).toEqual(["detect"]);
    expect(windows.if).toBe(job("test").if);
    expect(needsOf(job("ci-pass"))).toContain(WINDOWS_JOB);
  });

  it("TC-0017-0098: A failing Windows job fails the aggregate verdict", () => {
    const needs = Object.fromEntries(
      needsOf(job("ci-pass")).map((name) => [
        name,
        { result: name === WINDOWS_JOB ? "failure" : "success" },
      ]),
    );
    expect(Object.keys(needs)).toContain(WINDOWS_JOB);

    expect(verdictExit(needs)).toBe(1);
    expect(verdictExit({ ...needs, [WINDOWS_JOB]: { result: "success" } })).toBe(0);
  });
});
