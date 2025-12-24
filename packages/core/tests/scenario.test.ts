import assert from "node:assert/strict";
import test from "node:test";

import { validateScenarioContent } from "../src/validators/scenario.js";

test("validateScenarioContent requires GWT and references", () => {
  const text =
    "SC-0001\n参照: SPEC-0001 BR-ORDER-001 UI-ORDER-01\nGiven ...\nWhen ...\nThen ...";
  const issues = validateScenarioContent(text, "sc.md");
  assert.equal(issues.length, 0);
});

test("validateScenarioContent warns when missing GWT", () => {
  const text = "SC-0001\nSPEC-0001 BR-ORDER-001";
  const issues = validateScenarioContent(text, "sc.md");
  assert.ok(issues.some((issue) => issue.code === "QFAI-SC-005"));
});
