/**
 * Integration: the Windows job builds the package on its own runner before its tests, rather than
 * needing the `build` job or downloading its artifact.
 */
import { describe, expect, it } from "vitest";

import { WINDOWS_JOB, firstTestStep, job, needsOf, runOf, stepsOf } from "./ownCi.js";

describe("the Windows job builds in the job", () => {
  // QFAI:AC-0002-0024-03
  // QFAI:EX-0002-0024-06
  it("A package build precedes the job's first test step", () => {
    const windows = job(WINDOWS_JOB);
    const steps = stepsOf(windows);
    const buildAt = steps.findIndex((step) => /\bpnpm -C packages\/qfai build\b/.test(runOf(step)));
    const testAt = firstTestStep(windows);

    expect(buildAt, "a step builds packages/qfai").toBeGreaterThanOrEqual(0);
    expect(testAt, "a step runs the tests").toBeGreaterThan(buildAt);
  });

  // QFAI:EX-0002-0024-07
  it("The job neither needs build nor downloads its artifact", () => {
    const windows = job(WINDOWS_JOB);
    const uses = stepsOf(windows).map((step) => (typeof step.uses === "string" ? step.uses : ""));

    expect(needsOf(windows)).not.toContain("build");
    expect(uses.filter((action) => action.includes("download-artifact"))).toEqual([]);
    expect(uses.length, "the job declares its steps").toBeGreaterThan(0);
  });
});
