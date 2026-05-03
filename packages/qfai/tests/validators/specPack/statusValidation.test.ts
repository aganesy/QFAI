import { describe, expect, it } from "vitest";

import { parseSpec } from "../../../src/core/parse/spec.js";
import { validateSpecStatus } from "../../../src/core/validators/specPack.js";

const HEADER = "# 01 Spec\n\n- Spec: spec-0042\n- Parent: CAP-0042\n";
const SPEC_PATH = "spec-0042/01_Spec.md";
const KNOWN = new Set(["spec-0042", "spec-0099"]);

function parse(md: string) {
  return parseSpec(md, SPEC_PATH);
}

describe("validateSpecStatus", () => {
  it("returns no issues for active spec", () => {
    const parsed = parse(`${HEADER}- Status: active\n`);
    const issues = validateSpecStatus(parsed, SPEC_PATH, KNOWN);
    expect(issues).toEqual([]);
  });

  it("emits QFAI-STATUS-001 when Status bullet is missing", () => {
    const parsed = parse(HEADER);
    const issues = validateSpecStatus(parsed, SPEC_PATH, KNOWN);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-STATUS-001");
    expect(issues[0]?.severity).toBe("error");
  });

  it("emits QFAI-STATUS-002 for invalid enum", () => {
    const parsed = parse(`${HEADER}- Status: archived\n`);
    const issues = validateSpecStatus(parsed, SPEC_PATH, KNOWN);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-STATUS-002");
    expect(issues[0]?.refs).toEqual(["archived"]);
  });

  it("emits QFAI-STATUS-003 when superseded has no Superseded-by", () => {
    const parsed = parse(`${HEADER}- Status: superseded\n`);
    const issues = validateSpecStatus(parsed, SPEC_PATH, KNOWN);
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-STATUS-003"]);
  });

  it("emits QFAI-STATUS-003 when Superseded-by has wrong format", () => {
    const parsed = parse(`${HEADER}- Status: superseded\n- Superseded-by: SPEC-99\n`);
    const issues = validateSpecStatus(parsed, SPEC_PATH, KNOWN);
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-STATUS-003"]);
  });

  it("emits QFAI-STATUS-004 when Superseded-by points to unknown spec", () => {
    const parsed = parse(`${HEADER}- Status: superseded\n- Superseded-by: spec-0500\n`);
    const issues = validateSpecStatus(parsed, SPEC_PATH, KNOWN);
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-STATUS-004"]);
  });

  it("returns no issues when superseded spec references a known target", () => {
    const parsed = parse(`${HEADER}- Status: superseded\n- Superseded-by: spec-0099\n`);
    const issues = validateSpecStatus(parsed, SPEC_PATH, KNOWN);
    expect(issues).toEqual([]);
  });

  it("emits QFAI-STATUS-005 when deprecated has no Deprecated-at", () => {
    const parsed = parse(`${HEADER}- Status: deprecated\n`);
    const issues = validateSpecStatus(parsed, SPEC_PATH, KNOWN);
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-STATUS-005"]);
  });

  it("emits QFAI-STATUS-005 when removed has no Deprecated-at", () => {
    const parsed = parse(`${HEADER}- Status: removed\n`);
    const issues = validateSpecStatus(parsed, SPEC_PATH, KNOWN);
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-STATUS-005"]);
  });

  it("emits QFAI-STATUS-006 when Deprecated-at is malformed", () => {
    const parsed = parse(`${HEADER}- Status: deprecated\n- Deprecated-at: May 2 2026\n`);
    const issues = validateSpecStatus(parsed, SPEC_PATH, KNOWN);
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-STATUS-006"]);
  });

  it("returns no issues for valid deprecated spec", () => {
    const parsed = parse(`${HEADER}- Status: deprecated\n- Deprecated-at: 2026-05-02\n`);
    const issues = validateSpecStatus(parsed, SPEC_PATH, KNOWN);
    expect(issues).toEqual([]);
  });
});
