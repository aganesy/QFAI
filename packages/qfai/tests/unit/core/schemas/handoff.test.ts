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
  parseHandoff,
  parseHandoffJson,
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

// Regression for the YAML-parse fix: `qfai handoff upgrade` writes YAML
// (the canonical format per `references/handoff.md`), and the pre-fix
// `parseHandoffJson` called `JSON.parse` only — so a normal YAML
// handoff returned `null` and downstream `validate --profile
// saas-package` treated the handoff as unparseable.
describe("parseHandoff accepts YAML and JSON handoff payloads", () => {
  it("parses a canonical YAML handoff into a record", () => {
    const yaml = [
      'companyName: "Acme"',
      'primarySpecId: "0001"',
      'startDate: "2026-05-27"',
      'signature: "abc123"',
      'entryPattern: "qfai-sdd"',
      'productScope: "saas"',
      "",
    ].join("\n");
    const parsed = parseHandoff(yaml);
    expect(parsed).not.toBeNull();
    expect(parsed?.companyName).toBe("Acme");
    expect(parsed?.primarySpecId).toBe("0001");
    expect(parsed?.productScope).toBe("saas");
  });

  it("parses a JSON handoff into a record (YAML is a strict superset)", () => {
    const json = JSON.stringify({
      companyName: "Acme",
      primarySpecId: "0001",
    });
    const parsed = parseHandoff(json);
    expect(parsed).not.toBeNull();
    expect(parsed?.companyName).toBe("Acme");
    expect(parsed?.primarySpecId).toBe("0001");
  });

  it("returns null for empty input (YAML `null` document)", () => {
    expect(parseHandoff("")).toBeNull();
    expect(parseHandoff("null")).toBeNull();
  });

  it("returns null for truthy but non-object input (top-level scalar)", () => {
    // YAML: a bare scalar parses to a string, not a record.
    expect(parseHandoff("just-a-scalar")).toBeNull();
    // YAML: a top-level sequence parses to an array, not a record.
    expect(parseHandoff("- one\n- two\n")).toBeNull();
  });

  it("returns null on YAML parse failure", () => {
    // Indentation drift / mismatched flow brackets.
    expect(parseHandoff("{ unbalanced: [")).toBeNull();
  });

  it("exposes a back-compat `parseHandoffJson` alias", () => {
    const yaml = 'companyName: "Acme"\n';
    expect(parseHandoffJson(yaml)).toEqual({ companyName: "Acme" });
    // alias and primary share identity (same function reference).
    expect(parseHandoffJson).toBe(parseHandoff);
  });

  // Pin no-data-loss for nested YAML payloads. parseHandoffJson was
  // pre-fix `JSON.parse`-only; downstream readers that consumed a
  // YAML handoff with nested mappings (`signature:\n  by: alice`)
  // would see `null` and downstream `--profile saas-package` would
  // treat the handoff as unparseable. The M4 fix (parseHandoff =
  // `yaml.parse`) round-trips nested object graphs, so this
  // regression test asserts nested values survive parse and reach
  // the returned record.
  it("preserves nested YAML object graphs (no data loss for non-flat payloads)", () => {
    const yaml = [
      'companyName: "Acme"',
      'primarySpecId: "0001"',
      "signature:",
      '  by: "alice"',
      '  on: "2026-05-27"',
      "metadata:",
      '  reviewer: "bob"',
      "  notes: |",
      "    multi-line",
      "    block scalar",
      "    survives",
      "",
    ].join("\n");
    const parsed = parseHandoff(yaml);
    expect(parsed).not.toBeNull();
    expect(parsed?.companyName).toBe("Acme");
    // Nested mapping is preserved verbatim by the YAML parser.
    const signature = parsed?.signature as Record<string, unknown> | undefined;
    expect(signature).toBeDefined();
    expect(signature?.by).toBe("alice");
    expect(signature?.on).toBe("2026-05-27");
    const metadata = parsed?.metadata as Record<string, unknown> | undefined;
    expect(metadata?.reviewer).toBe("bob");
    // Block scalar content round-trips faithfully.
    const notes = metadata?.notes;
    expect(typeof notes).toBe("string");
    expect(String(notes)).toContain("multi-line");
    expect(String(notes)).toContain("block scalar");
  });
});
