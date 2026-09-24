/** Release operation capability checks against the workflow that runs them. */
import { describe, expect, it } from "vitest";

import {
  classify,
  currentPackage,
  currentRoot,
  declaredSlices,
  invocations,
  operationScripts,
  suiteRuns,
} from "../helpers/spec0017Release.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

describe("spec-0017 release operation capabilities", () => {
  // QFAI:SPEC-0017:TC-0017-0090
  it("TC-0017-0090 (TDD-0099): classifies exact operation capabilities", () => {
    const current = classify(currentRoot(), currentPackage());
    expect(current.status, current.output).toBe(0);
    expect([current.shape, current.checks]).toEqual(["sliced", "operations"]);
  });

  // QFAI:SPEC-0017:TC-0017-0090
  it("TC-0017-0090 (TDD-0107): preserves the ordered operation vector", () => {
    const parsed: unknown = JSON.parse(currentRoot());
    if (!isRecord(parsed) || !isRecord(parsed["scripts"])) throw new Error("root scripts missing");
    const scripts = parsed["scripts"];
    expect(scripts["ci:gate:checks"]).toBe(
      operationScripts.map((script) => `pnpm ${script}`).join(" && "),
    );
    const bodies = operationScripts.map((script) => {
      const body = scripts[script];
      if (typeof body !== "string") throw new Error(`${script} missing`);
      return body;
    });
    expect(bodies.join(" && ")).toBe(
      "pnpm sync:ssot && git diff --exit-code .qfai/ qfai.config.yaml packages/qfai/assets/init/.qfai/ && bash ./scripts/run-lint-checks.sh gate && pnpm check-types && node ./scripts/check-build-warnings.mjs && pnpm verify:pack",
    );
    const selected = invocations("sliced", "operations")
      .filter((entry) => entry.manifest === "root")
      .map((entry) => entry.script);
    expect(selected.sort()).toEqual([...operationScripts].sort());
  });

  // QFAI:SPEC-0017:TC-0017-0090
  it("TC-0017-0090 (TDD-0108): runs one complete suite on each runtime", () => {
    const slices = declaredSlices()
      .map((slice) => `test:${slice}`)
      .sort();
    for (const floor of [false, true]) {
      expect(suiteRuns("sliced", "operations", floor), floor ? "floor" : "range").toEqual(slices);
    }
  });
});
