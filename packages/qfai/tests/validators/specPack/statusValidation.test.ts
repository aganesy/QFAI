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

  it("reads past a retirement parked in an HTML comment", () => {
    // A rewrite that keeps the old declaration in a comment above the live one
    // is a spec that says `active`, not one that says `superseded`.
    const parsed = parse(
      `${HEADER}<!--\n- Status: superseded\n- Superseded-by: spec-0099\n-->\n\n- Status: active\n`,
    );
    expect(parsed.status).toBe("active");
    expect(parsed.supersededBy).toBeUndefined();
    expect(validateSpecStatus(parsed, SPEC_PATH, KNOWN)).toEqual([]);
  });

  it("emits QFAI-STATUS-006 for a date that does not exist", () => {
    // The shape regex accepts `2026-02-30`, which rolls over to March 2. The
    // date is the only field between a `deprecated` bullet and a whole ledger
    // dropping out of the gate, so it has to name a day that happened.
    for (const value of ["2026-02-30", "9999-99-99", "2025-02-29"]) {
      const parsed = parse(`${HEADER}- Status: deprecated\n- Deprecated-at: ${value}\n`);
      const issues = validateSpecStatus(parsed, SPEC_PATH, KNOWN);
      expect(issues.map((issue) => issue.code)).toEqual(["QFAI-STATUS-006"]);
    }
    // A leap day that did happen still passes.
    const leap = parse(`${HEADER}- Status: deprecated\n- Deprecated-at: 2024-02-29\n`);
    expect(validateSpecStatus(leap, SPEC_PATH, KNOWN)).toEqual([]);
  });

  it("emits QFAI-STATUS-001 for a Status bullet that is only in the body", () => {
    // `QFAI-STATUS-001` places the bullet in the header block. Read from the
    // whole document, a `- Status: active` quoted under `## Notes` silenced
    // the rule for a spec that never declared one.
    const parsed = parse(`${HEADER}\n## Notes\n\nSUPERSEDE writes:\n\n- Status: active\n`);
    const issues = validateSpecStatus(parsed, SPEC_PATH, KNOWN);
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-STATUS-001"]);
  });

  it("does not let a header Status borrow its companion from the body", () => {
    // `Superseded-by` illustrated in a prose section is an example, not this
    // spec's — without it the header declaration is incomplete.
    const parsed = parse(
      `${HEADER}- Status: superseded\n\n## Notes\n\n- Superseded-by: spec-0099\n`,
    );
    const issues = validateSpecStatus(parsed, SPEC_PATH, KNOWN);
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-STATUS-003"]);
  });

  it("emits QFAI-STATUS-004 when Superseded-by points at the spec itself", () => {
    // `collectSpecEntries` refuses to retire on a self-reference — nothing
    // inherited the rows — so the full profile has to say why the source keeps
    // gating instead of leaving the operator to guess.
    const parsed = parse(`${HEADER}- Status: superseded\n- Superseded-by: spec-0042\n`);
    const issues = validateSpecStatus(parsed, SPEC_PATH, KNOWN, { selfSpecId: "spec-0042" });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-STATUS-004"]);
    expect(issues[0]?.rule).toBe("specStatus.supersededBy.self");
  });

  it("emits QFAI-STATUS-004 when the successor is not active", () => {
    const parsed = parse(`${HEADER}- Status: superseded\n- Superseded-by: spec-0099\n`);
    const issues = validateSpecStatus(parsed, SPEC_PATH, KNOWN, {
      selfSpecId: "spec-0042",
      statuses: new Map([
        ["spec-0042", "superseded" as const],
        ["spec-0099", "deprecated" as const],
      ]),
    });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-STATUS-004"]);
    expect(issues[0]?.rule).toBe("specStatus.supersededBy.active");
  });

  it("emits QFAI-STATUS-004 when the successor declares no lifecycle at all", () => {
    // The same evidence `collectSpecEntries` rejects: a directory nobody has
    // shown to be current cannot inherit the obligations.
    const parsed = parse(`${HEADER}- Status: superseded\n- Superseded-by: spec-0099\n`);
    const issues = validateSpecStatus(parsed, SPEC_PATH, KNOWN, {
      selfSpecId: "spec-0042",
      statuses: new Map([["spec-0099", undefined]]),
    });
    expect(issues.map((entry) => entry.rule)).toEqual(["specStatus.supersededBy.active"]);
  });

  it("accepts a successor that declares itself active", () => {
    const parsed = parse(`${HEADER}- Status: superseded\n- Superseded-by: spec-0099\n`);
    expect(
      validateSpecStatus(parsed, SPEC_PATH, KNOWN, {
        selfSpecId: "spec-0042",
        statuses: new Map([["spec-0099", "active" as const]]),
      }),
    ).toEqual([]);
  });

  it("ends the header block at an indented heading", () => {
    // 1-3 leading spaces is still an ATX heading in CommonMark. Anchored at
    // column 0, the boundary left every bullet under `  ## Notes` inside the
    // header block and retired a spec that declared no lifecycle of its own.
    const parsed = parse(
      `${HEADER}\n  ## Notes\n\nSUPERSEDE writes:\n\n- Status: deprecated\n- Deprecated-at: 2026-01-01\n`,
    );
    expect(parsed.status).toBeUndefined();
    expect(validateSpecStatus(parsed, SPEC_PATH, KNOWN).map((entry) => entry.code)).toEqual([
      "QFAI-STATUS-001",
    ]);
  });

  it("reads past a fenced sample of the SUPERSEDE bullets", () => {
    const parsed = parse(
      `${HEADER}\`\`\`markdown\n- Status: deprecated\n- Deprecated-at: 2026-05-02\n\`\`\`\n\n- Status: active\n`,
    );
    expect(parsed.status).toBe("active");
    expect(parsed.deprecatedAt).toBeUndefined();
    expect(validateSpecStatus(parsed, SPEC_PATH, KNOWN)).toEqual([]);
  });
});
