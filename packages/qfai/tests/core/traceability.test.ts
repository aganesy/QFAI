import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildScCoverage,
  collectScIdsFromScenarioFiles,
  collectScTestReferences,
} from "../../src/core/traceability.js";

describe("traceability helpers", () => {
  it("collects SC ids from scenario files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-trace-"));
    const validPath = path.join(root, "scenario-valid.md");
    const invalidPath = path.join(root, "scenario-invalid.md");
    const noScPath = path.join(root, "scenario-noscs.md");

    await writeFile(
      validPath,
      [
        "@SPEC-0001",
        "Feature: Sample",
        "  @SC-0001 @BR-0001",
        "  Scenario: Basic",
        "    Given ...",
        "",
      ].join("\n"),
    );
    await writeFile(
      invalidPath,
      ["@SPEC-0001", "Scenario: Missing feature", "  Given ...", ""].join("\n"),
    );
    await writeFile(
      noScPath,
      [
        "@SPEC-0001",
        "Feature: No SC",
        "  @BR-0001",
        "  Scenario: Without SC",
        "    Given ...",
        "",
      ].join("\n"),
    );

    const result = await collectScIdsFromScenarioFiles([
      validPath,
      invalidPath,
      noScPath,
    ]);
    expect(Array.from(result).sort()).toEqual(["SC-0001"]);
  });

  it("collects SC references from tests", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tests-"));
    const testsDir = path.join(root, "tests");
    await mkdir(testsDir, { recursive: true });

    const first = path.join(testsDir, "alpha.test.ts");
    const second = path.join(testsDir, "beta.test.ts");
    const third = path.join(testsDir, "gamma.test.ts");

    await writeFile(first, "// SC-0001\n");
    await writeFile(second, "// SC-0001\n// SC-0002\n");
    await writeFile(third, "// no refs\n");

    const refs = await collectScTestReferences(testsDir);
    const sc0001 = Array.from(refs.get("SC-0001") ?? []).sort();
    const sc0002 = Array.from(refs.get("SC-0002") ?? []).sort();

    expect(sc0001).toEqual([first, second].sort());
    expect(sc0002).toEqual([second]);
    expect(refs.has("SC-9999")).toBe(false);
  });

  it("builds SC coverage summary", () => {
    const refs = new Map<string, Set<string>>([
      ["SC-0001", new Set(["tests/alpha.test.ts"])],
      ["SC-0002", new Set()],
    ]);

    const coverage = buildScCoverage(["SC-0001", "SC-0002"], refs);
    expect(coverage.total).toBe(2);
    expect(coverage.covered).toBe(1);
    expect(coverage.missing).toBe(1);
    expect(coverage.missingIds).toEqual(["SC-0002"]);
    expect(coverage.refs["SC-0001"]).toEqual(["tests/alpha.test.ts"]);
    expect(coverage.refs["SC-0002"]).toEqual([]);
  });
});
