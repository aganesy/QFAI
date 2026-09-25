import { describe, expect, it } from "vitest";

import {
  jobSteps,
  matrixSlices,
  perSliceScriptEntries,
  releaseShapeSlices,
  runnerProjects,
  SLICED_JOBS,
  sorted,
} from "../helpers/spec0017WorkflowSurfaces.js";

describe("spec-0017 slice alignment acceptance", () => {
  // QFAI:EX-0002-0019-11
  it("TC-0017-0062 (TDD-0062): agrees across the runner, scripts, CI and release declarations", () => {
    const projects = sorted(runnerProjects());
    for (const { workflow, job } of SLICED_JOBS) {
      expect(sorted(matrixSlices(workflow, job)), `${workflow}#${job}`).toEqual(projects);
    }
    expect(sorted(releaseShapeSlices())).toEqual(projects);
    expect(sorted(perSliceScriptEntries().map((entry) => entry.slice))).toEqual(projects);
  });

  // QFAI:EX-0002-0019-11
  it("TC-0017-0062: declares exactly the seven approved names", () => {
    expect(sorted(runnerProjects())).toEqual([
      "cli",
      "core",
      "e2e",
      "integration",
      "scripts",
      "unit",
      "validators",
    ]);
  });

  // QFAI:EX-0002-0019-10
  it("TC-0017-0064 (TDD-0064): names each script after its selected project", () => {
    const scripts = perSliceScriptEntries();
    for (const slice of ["unit", "scripts"]) {
      expect(scripts.map((entry) => entry.slice)).toContain(slice);
    }
    for (const { key, slice } of scripts) {
      expect(key, `a script selecting ${slice} must be named test:${slice}`).toBe(`test:${slice}`);
    }
  });

  // QFAI:EX-0002-0019-10
  it("TC-0017-0064: four sliced jobs invoke per-slice scripts", () => {
    for (const { workflow, job } of SLICED_JOBS) {
      const runs = jobSteps(workflow, job)
        .map((step) => step["run"])
        .filter((run): run is string => typeof run === "string");
      expect(runs.length, `${workflow}#${job} must declare run steps`).toBeGreaterThan(0);
      expect(runs.filter((run) => /\btest\b[^\n]*--project/.test(run))).toEqual([]);
      expect(runs.filter((run) => run.includes("test:${{ matrix.slice }}"))).not.toEqual([]);
    }
  });
});
