/**
 * Unit: CLI-HANDOFF canonical schema (Pair IV).
 *
 * - TC-0015-0025 (normal): a handoff payload matching the minimum
 *   field set plus extra per-skill keys passes (`additionalProperties: true`).
 *
 *   The minimum field set per AC-0015-0017 is:
 *     companyName?, primarySpecId?, startDate?, signature?,
 *     entryPattern?, productScope?
 *   All are optional and additional properties are permitted.
 *
 * - The schema additionally documents the `D-HANDOFF-LEGACY-FORMAT`
 *   warning code (not validated here; emitted by readers when a legacy
 *   ad-hoc file is encountered).
 */
// QFAI:SPEC-0015:TC-0015-0025

import { describe, expect, it } from "vitest";

import {
  HANDOFF_LEGACY_FORMAT_CODE,
  HANDOFF_MINIMUM_FIELDS,
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
      primarySpecId: "spec-0012",
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
    const issues = validateHandoff({ companyName: 42, primarySpecId: ["nope"] });
    const codes = new Set(issues.map((i) => i.code));
    expect(codes.has("HANDOFF-SCHEMA-FIELD-TYPE")).toBe(true);
  });

  it("exports the canonical field list and the legacy format code", () => {
    expect(HANDOFF_MINIMUM_FIELDS).toEqual([
      "companyName",
      "primarySpecId",
      "startDate",
      "signature",
      "entryPattern",
      "productScope",
    ]);
    expect(HANDOFF_LEGACY_FORMAT_CODE).toBe("D-HANDOFF-LEGACY-FORMAT");
  });
});
