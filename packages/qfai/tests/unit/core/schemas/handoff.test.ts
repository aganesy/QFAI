/**
 * Unit: CLI-HANDOFF canonical schema (Pair IV).
 *
 * - TC-0015-0025 (normal): a handoff payload matching the minimum
 *   field set plus extra per-skill keys passes (`additionalProperties: true`).
 *
 *   The minimum field set per AC-0015-0017 is:
 *     companyName?, primaryUiContract?, startDate?, signature?,
 *     entryPattern?, productScope?
 *   All are optional and additional properties are permitted.
 */
// QFAI:EX-0001-0171-01

import { describe, expect, it } from "vitest";

import {
  HANDOFF_MINIMUM_FIELDS,
  parseHandoff,
  validateHandoff,
} from "../../../../src/core/schemas/handoff.js";

describe("TC-0015-0025: validateHandoff accepts canonical + extra keys", () => {
  it("accepts an empty object (all fields optional)", () => {
    const issues = validateHandoff({});
    expect(issues).toEqual([]);
  });

  it("accepts the canonical minimum field set", () => {
    const issues = validateHandoff({
      companyName: "Acme",
      primaryUiContract: "UI-0012",
      startDate: "2026-05-27",
      signature: "abc123",
      entryPattern: "qfai-sdd",
      productScope: "saas",
    });
    expect(issues).toEqual([]);
  });

  it("accepts extra per-skill keys (additionalProperties: true)", () => {
    const issues = validateHandoff({
      companyName: "Acme",
      customSkillData: { foo: "bar" },
      anyKey: 42,
    });
    expect(issues).toEqual([]);
  });

  it("rejects non-object input", () => {
    expect(validateHandoff(null).length).toBeGreaterThanOrEqual(1);
    expect(validateHandoff("not-an-object").length).toBeGreaterThanOrEqual(1);
    expect(validateHandoff([]).length).toBeGreaterThanOrEqual(1);
  });

  it("flags type-mismatched well-known fields", () => {
    const issues = validateHandoff({ companyName: 42, primaryUiContract: ["nope"] });
    const codes = new Set(issues.map((i) => i.code));
    expect(codes.has("HANDOFF-SCHEMA-FIELD-TYPE")).toBe(true);
  });

  it("exports the canonical field list", () => {
    expect(HANDOFF_MINIMUM_FIELDS).toEqual([
      "companyName",
      "primaryUiContract",
      "startDate",
      "signature",
      "entryPattern",
      "productScope",
    ]);
  });
});

describe("parseHandoff reads the handoff record as JSON", () => {
  it("parses a JSON handoff into a record, keeping nested values", () => {
    const parsed = parseHandoff(
      JSON.stringify({
        companyName: "Acme",
        primaryUiContract: "UI-0001",
        procurement: { procured: ["header"], authored: [], "drawn-from-project": [] },
      }),
    );
    expect(parsed?.companyName).toBe("Acme");
    expect(parsed?.primaryUiContract).toBe("UI-0001");
    expect(parsed?.procurement).toEqual({
      procured: ["header"],
      authored: [],
      "drawn-from-project": [],
    });
  });

  it("returns null for YAML, which a JSON consumer cannot read", () => {
    expect(parseHandoff("finalArtifact: .qfai/prototype/final/index.html\n")).toBeNull();
  });

  it("returns null for empty input, null, a scalar or an array", () => {
    for (const text of ["", "null", '"just-a-scalar"', "[1, 2]"]) {
      expect(parseHandoff(text)).toBeNull();
    }
  });
});
