import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildScCoverage,
  collectScIdsFromScenarioFiles,
  collectScIdSourcesFromScenarioFiles,
  collectScTestReferences,
  extractAnnotatedScIds,
} from "../../src/core/traceability.js";

describe("traceability helpers", () => {
  it("collects SC ids from scenario files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-trace-"));
    const validPath = path.join(root, "scenario-valid.md");
    const invalidPath = path.join(root, "scenario-invalid.md");
    const noScPath = path.join(root, "scenario-noscs.md");
    const duplicatePath = path.join(root, "scenario-duplicate.md");

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
    await writeFile(
      duplicatePath,
      [
        "@SPEC-0002",
        "Feature: Duplicate SC",
        "  @SC-0001 @BR-0002",
        "  Scenario: Another",
        "    Given ...",
        "",
      ].join("\n"),
    );

    const result = await collectScIdsFromScenarioFiles([
      validPath,
      invalidPath,
      noScPath,
      duplicatePath,
    ]);
    expect(Array.from(result).sort()).toEqual(["SC-0001"]);
  });

  it("collects SC sources from scenario files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-trace-"));
    const first = path.join(root, "scenario-first.md");
    const second = path.join(root, "scenario-second.md");
    await writeFile(
      first,
      [
        "@SPEC-0001",
        "Feature: First",
        "  @SC-0001 @BR-0001",
        "  Scenario: First scenario",
        "    Given ...",
        "",
      ].join("\n"),
    );
    await writeFile(
      second,
      [
        "@SPEC-0002",
        "Feature: Second",
        "  @SC-0001 @BR-0002",
        "  Scenario: Second scenario",
        "    Given ...",
        "",
      ].join("\n"),
    );

    const sources = await collectScIdSourcesFromScenarioFiles([first, second]);
    const sc0001 = Array.from(sources.get("SC-0001") ?? []).sort();
    expect(sc0001).toEqual([first, second].sort());
  });

  it("collects SC references from tests", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tests-"));
    const testsDir = path.join(root, "tests");
    const srcDir = path.join(root, "src");
    await mkdir(testsDir, { recursive: true });
    await mkdir(srcDir, { recursive: true });

    const first = path.join(testsDir, "alpha.test.ts");
    const second = path.join(testsDir, "beta.test.ts");
    const third = path.join(testsDir, "gamma.test.ts");
    const fourth = path.join(srcDir, "delta.test.ts");

    await writeFile(first, "// QFAI:SC-0001\n");
    await writeFile(second, "// QFAI:SC-0001\n// QFAI:SC-0002\n");
    await writeFile(third, "// SC-0003\n");
    await writeFile(fourth, "// QFAI:SC-0003\n");

    const refsResult = await collectScTestReferences(
      root,
      ["tests/**/*.test.ts", "src/**/*.test.ts"],
      [],
    );
    const sc0001 = Array.from(refsResult.refs.get("SC-0001") ?? []).sort();
    const sc0002 = Array.from(refsResult.refs.get("SC-0002") ?? []).sort();
    const sc0003 = Array.from(refsResult.refs.get("SC-0003") ?? []).sort();

    expect(sc0001).toEqual([first, second].sort());
    expect(sc0002).toEqual([second]);
    expect(sc0003).toEqual([fourth]);
    expect(refsResult.refs.has("SC-9999")).toBe(false);
    expect(refsResult.scan.matchedFileCount).toBe(4);
  });

  it("extracts annotated SC ids", () => {
    const text = [
      "// QFAI:SC-0001",
      "const id = 'QFAI:SC-0002';",
      "// QFAI:SC-0001",
    ].join("\n");
    expect(extractAnnotatedScIds(text).sort()).toEqual(["SC-0001", "SC-0002"]);
  });

  it("handles missing tests directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tests-missing-"));

    const refsResult = await collectScTestReferences(
      root,
      ["tests/**/*.test.ts"],
      [],
    );
    expect(refsResult.refs.size).toBe(0);
    expect(refsResult.scan.matchedFileCount).toBe(0);
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
