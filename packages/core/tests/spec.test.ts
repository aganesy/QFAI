import assert from "node:assert/strict";
import test from "node:test";

import { validateSpecContent } from "../src/validators/spec.js";

test("validateSpecContent detects missing sections", () => {
  const text = "# Spec\nSPEC-0001\nBR-ORDER-001";
  const issues = validateSpecContent(text, "spec.md", ["背景", "ゴール"]);
  assert.ok(issues.some((issue) => issue.code === "QFAI-SPEC-004"));
});

test("validateSpecContent warns on SC reference", () => {
  const text = "SPEC-0001\nBR-ORDER-001\nSC-0001\n背景\nゴール";
  const issues = validateSpecContent(text, "spec.md", ["背景", "ゴール"]);
  assert.ok(issues.some((issue) => issue.code === "QFAI-SPEC-003"));
});
