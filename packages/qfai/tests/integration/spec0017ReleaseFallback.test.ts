/** Release aggregate fallback and publication checks against the workflow that runs them. */
import { describe, expect, it } from "vitest";

import {
  TAGS,
  acceptsRelease,
  classify,
  classifyTag,
  currentPackage,
  currentRoot,
  gateJobs,
  gatePaths,
  manifestWith,
  operationJobs,
  operationScripts,
  releaseJobs,
  scriptKeys,
  type ReleaseNeeds,
} from "../helpers/spec0017Release.js";

describe("spec-0017 release aggregate fallback", () => {
  // QFAI:SPEC-0017:TC-0017-0091
  it("TC-0017-0091 (TDD-0100): missing operation scripts retain aggregate checks", () => {
    const root = scriptKeys(currentRoot());
    for (const dropped of operationScripts) {
      expect(root).toContain(dropped);
      for (const value of [undefined, 1, null, {}]) {
        const scripts = Object.fromEntries(
          root.map((key) => [key, key === dropped ? value : "declared"]),
        );
        const result = classify(JSON.stringify({ scripts }), currentPackage());
        expect(result.status, `${dropped}: ${result.output}`).toBe(0);
        expect([result.shape, result.checks]).toEqual(["sliced", "aggregate"]);
      }
    }
  });

  // QFAI:SPEC-0017:TC-0017-0091
  it("TC-0017-0091 (TDD-0109): older and whole-suite tags use the whole aggregate", () => {
    for (const tag of TAGS) {
      const result = classifyTag(tag);
      expect(result.status, `${tag}: ${result.output}`).toBe(0);
      expect([result.shape, result.checks], tag).toEqual(["whole", "aggregate"]);
    }
    const whole = classify(currentRoot(), manifestWith(["test"]));
    expect([whole.shape, whole.checks]).toEqual(["whole", "aggregate"]);
  });

  // QFAI:SPEC-0017:TC-0017-0091
  it("TC-0017-0091 (TDD-0110): refuses invalid checks outputs", () => {
    for (const id of ["github-release", "publish"]) {
      const condition = releaseJobs()[id]?.["if"];
      if (typeof condition !== "string") throw new Error(`${id} has no release condition`);
      for (const { shape, checks } of gatePaths) {
        const needs: ReleaseNeeds = {
          verify: { result: "success", outputs: { "suite-shape": shape, "checks-shape": checks } },
          gate: { result: "success" },
          "gate-tests": { result: shape === "sliced" ? "success" : "skipped" },
          "gate-floor": { result: shape === "sliced" ? "success" : "skipped" },
          "gate-floor-whole": { result: shape === "whole" ? "success" : "skipped" },
          ...Object.fromEntries(
            operationJobs.map((name) => [
              name,
              { result: checks === "operations" ? "success" : "skipped" },
            ]),
          ),
        };
        for (const invalid of [
          undefined,
          "",
          "unknown",
          checks === "operations" ? "aggregate" : "operations",
        ]) {
          const changed = {
            ...needs,
            verify: {
              result: "success",
              outputs: { "suite-shape": shape, "checks-shape": invalid },
            },
          };
          expect
            .soft(
              acceptsRelease(condition, changed, "push"),
              `${id} ${shape} ${checks} -> ${invalid}`,
            )
            .toBe(false);
        }
      }
      const impossible: ReleaseNeeds = Object.fromEntries(
        Object.keys(gateJobs()).map((name) => [
          name,
          { result: ["gate-tests", "gate-floor"].includes(name) ? "skipped" : "success" },
        ]),
      );
      impossible["verify"] = {
        result: "success",
        outputs: { "suite-shape": "whole", "checks-shape": "operations" },
      };
      expect(acceptsRelease(condition, impossible, "push"), `${id} whole operations`).toBe(false);
    }
  });
});
