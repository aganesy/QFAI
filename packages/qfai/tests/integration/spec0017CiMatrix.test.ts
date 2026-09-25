import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  isRecord,
  matrixSlices,
  PACKAGE_ROOT,
  runnerProjects,
  SLICED_JOBS,
  sorted,
  workflowJobs,
} from "../helpers/spec0017WorkflowSurfaces.js";

const RETAINED_SLICES = ["cli", "core", "e2e", "integration", "scripts", "unit", "validators"];
const RETIRED_SLICES = ["pr-fix", "pr-merge"];

function checkNames(selection: "full" | "documentation-only"): string[] {
  const names: string[] = [];
  for (const [id, job] of Object.entries(workflowJobs("ci.yml"))) {
    const label = typeof job["name"] === "string" ? job["name"] : id;
    const strategy = job["strategy"];
    const matrix = isRecord(strategy) ? strategy["matrix"] : undefined;
    const legs = isRecord(matrix)
      ? Object.values(matrix).flatMap((value) => {
          if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
            throw new Error(`${id} has a matrix axis that the check-name model cannot read`);
          }
          return value;
        })
      : [];
    const condition = job["if"];
    if (
      legs.length > 0 &&
      condition !== undefined &&
      condition !== "${{ needs.detect.outputs.full == 'true' }}"
    ) {
      throw new Error(`${id} has an unmodelled matrix selection condition: ${String(condition)}`);
    }
    if (legs.length > 0 && (selection === "full" || condition === undefined)) {
      for (const leg of legs) names.push(`${label} (${leg})`);
    } else {
      names.push(label);
    }
  }
  return sorted(names);
}

describe("spec-0017 CI matrix acceptance", () => {
  // QFAI:EX-0002-0013-06
  it("TC-0017-0007 (TDD-0007): keeps every retained matrix leg declared", () => {
    for (const job of ["test", "node-floor"]) {
      expect(sorted(matrixSlices("ci.yml", job)), job).toEqual(RETAINED_SLICES);
    }
  });

  // QFAI:EX-0002-0013-06
  it("TC-0017-0007: derives the skip from detection at the job level", () => {
    for (const name of ["test", "node-floor"]) {
      const job = workflowJobs("ci.yml")[name];
      expect(job, `ci.yml must declare ${name}`).toBeDefined();
      expect(String(job?.["if"]), name).toContain("needs.detect.outputs.full");
      expect(JSON.stringify(job?.["strategy"] ?? null), name).not.toContain("needs.");
    }
  });

  // QFAI:EX-0002-0013-06
  it("TC-0017-0007: retires project, script and matrix legs together", () => {
    const projects = runnerProjects();
    const manifest: unknown = JSON.parse(
      readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf-8"),
    );
    if (!isRecord(manifest) || !isRecord(manifest["scripts"])) {
      throw new Error("package scripts missing");
    }
    const scriptKeys = Object.keys(manifest["scripts"]);
    for (const retired of RETIRED_SLICES) {
      expect(projects).not.toContain(retired);
      expect(scriptKeys).not.toContain(`test:${retired}`);
      for (const { workflow, job } of SLICED_JOBS) {
        expect(matrixSlices(workflow, job), `${workflow}#${job}`).not.toContain(retired);
      }
    }
    // A retirement cannot erase a retained suite through a coordinated edit.
    expect(sorted(projects)).toEqual(RETAINED_SLICES);
    for (const retained of RETAINED_SLICES) {
      expect(scriptKeys).toContain(`test:${retained}`);
    }
  });

  // QFAI:EX-0002-0017-02
  it("TC-0017-0043 (TDD-0043): reports all expanded check names on full runs", () => {
    expect(checkNames("full")).toEqual([
      "build",
      "check-types",
      "check-types-future",
      "ci-pass",
      "detect",
      "lint",
      "mirror-surface",
      "node-floor (cli)",
      "node-floor (core)",
      "node-floor (e2e)",
      "node-floor (integration)",
      "node-floor (scripts)",
      "node-floor (unit)",
      "node-floor (validators)",
      "scanner-coverage",
      "test (cli)",
      "test (core)",
      "test (e2e)",
      "test (integration)",
      "test (scripts)",
      "test (unit)",
      "test (validators)",
    ]);
  });

  // QFAI:EX-0002-0017-02
  it("TC-0017-0043: reports bare skipped matrix jobs on documentation-only runs", () => {
    expect(checkNames("documentation-only")).toEqual([
      "build",
      "check-types",
      "check-types-future",
      "ci-pass",
      "detect",
      "lint",
      "mirror-surface",
      "node-floor",
      "scanner-coverage",
      "test",
    ]);
  });
});
