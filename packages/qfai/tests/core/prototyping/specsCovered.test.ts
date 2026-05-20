import { describe, expect, it } from "vitest";

import {
  classifyFrozenSpecsCoveredMultiSpec,
  readFrozenSpecsCovered,
} from "../../../src/core/prototyping/specsCovered.js";

describe("readFrozenSpecsCovered (SSOT)", () => {
  it("accepts a non-empty array of non-empty strings", () => {
    expect(readFrozenSpecsCovered({ specsCovered: ["0001"] })).toEqual(["0001"]);
    expect(readFrozenSpecsCovered({ specsCovered: ["0001", "0002"] })).toEqual(["0001", "0002"]);
  });

  it("returns null for non-record input", () => {
    expect(readFrozenSpecsCovered(null)).toBeNull();
    expect(readFrozenSpecsCovered(undefined)).toBeNull();
    expect(readFrozenSpecsCovered("string")).toBeNull();
    expect(readFrozenSpecsCovered(42)).toBeNull();
    expect(readFrozenSpecsCovered([])).toBeNull();
  });

  it("returns null when specsCovered is missing", () => {
    expect(readFrozenSpecsCovered({})).toBeNull();
    expect(readFrozenSpecsCovered({ otherKey: "value" })).toBeNull();
  });

  it("returns null when specsCovered is not an array", () => {
    expect(readFrozenSpecsCovered({ specsCovered: "0001" })).toBeNull();
    expect(readFrozenSpecsCovered({ specsCovered: 42 })).toBeNull();
    expect(readFrozenSpecsCovered({ specsCovered: { primary: "0001" } })).toBeNull();
  });

  it("returns null when specsCovered is an empty array", () => {
    expect(readFrozenSpecsCovered({ specsCovered: [] })).toBeNull();
  });

  it("returns null when any entry is an empty string", () => {
    expect(readFrozenSpecsCovered({ specsCovered: [""] })).toBeNull();
    expect(readFrozenSpecsCovered({ specsCovered: ["0001", ""] })).toBeNull();
  });

  it("returns null when any entry is not a string", () => {
    expect(readFrozenSpecsCovered({ specsCovered: [42] })).toBeNull();
    expect(readFrozenSpecsCovered({ specsCovered: [null] })).toBeNull();
    expect(readFrozenSpecsCovered({ specsCovered: ["0001", 42] })).toBeNull();
    expect(readFrozenSpecsCovered({ specsCovered: ["0001", null] })).toBeNull();
  });
});

describe("classifyFrozenSpecsCoveredMultiSpec (codex r3270861808 P1 — absent vs malformed)", () => {
  // Pins the contract: `absent` lets the certify caller fall back to
  // the legacy single-spec `specsCovered`; `malformed` MUST fail closed
  // so a partial / corrupt edit cannot silently downgrade certification
  // scope and let missing secondary-spec review evidence ship a sealed
  // certificate.

  it("returns `absent` when the record is not an object", () => {
    expect(classifyFrozenSpecsCoveredMultiSpec(null)).toEqual({ kind: "absent" });
    expect(classifyFrozenSpecsCoveredMultiSpec(undefined)).toEqual({ kind: "absent" });
    expect(classifyFrozenSpecsCoveredMultiSpec("string")).toEqual({ kind: "absent" });
    expect(classifyFrozenSpecsCoveredMultiSpec(42)).toEqual({ kind: "absent" });
    expect(classifyFrozenSpecsCoveredMultiSpec([])).toEqual({ kind: "absent" });
  });

  it("returns `absent` when the frozenSpecsCovered key is missing on the record", () => {
    expect(classifyFrozenSpecsCoveredMultiSpec({})).toEqual({ kind: "absent" });
    expect(classifyFrozenSpecsCoveredMultiSpec({ specsCovered: ["0001"] })).toEqual({
      kind: "absent",
    });
  });

  it("returns `malformed` when the key is present but value is explicitly null", () => {
    // codex r3270923641 (P1, chatgpt-codex-connector): a hand-edited
    // `"frozenSpecsCovered": null` is corrupt edit, NOT a "field
    // omitted" record — falling back to legacy `specsCovered` here
    // would silently downgrade multi-spec certification scope. The
    // classifier must distinguish "key absent on record" from "key
    // present with invalid value" and fail closed for the latter.
    const r = classifyFrozenSpecsCoveredMultiSpec({ frozenSpecsCovered: null });
    expect(r.kind).toBe("malformed");
    if (r.kind === "malformed") expect(r.reason).toContain("null");
  });

  it("returns `malformed` when the key is present but value is explicitly undefined", () => {
    const r = classifyFrozenSpecsCoveredMultiSpec({ frozenSpecsCovered: undefined });
    expect(r.kind).toBe("malformed");
    if (r.kind === "malformed") expect(r.reason).toContain("undefined");
  });

  it("returns `malformed` when the value is not an array", () => {
    const r1 = classifyFrozenSpecsCoveredMultiSpec({ frozenSpecsCovered: "0001" });
    expect(r1.kind).toBe("malformed");
    if (r1.kind === "malformed") expect(r1.reason).toContain("not an array");
    const r2 = classifyFrozenSpecsCoveredMultiSpec({ frozenSpecsCovered: { 0: "0001" } });
    expect(r2.kind).toBe("malformed");
    if (r2.kind === "malformed") expect(r2.reason).toContain("not an array");
  });

  it("returns `malformed` when the array is empty", () => {
    const r = classifyFrozenSpecsCoveredMultiSpec({ frozenSpecsCovered: [] });
    expect(r.kind).toBe("malformed");
    if (r.kind === "malformed") expect(r.reason).toContain("empty");
  });

  it("returns `malformed` when any entry is not a string", () => {
    const r = classifyFrozenSpecsCoveredMultiSpec({ frozenSpecsCovered: [42] });
    expect(r.kind).toBe("malformed");
    if (r.kind === "malformed") expect(r.reason).toContain("non-string");
  });

  it("returns `malformed` when any entry is an empty string", () => {
    const r = classifyFrozenSpecsCoveredMultiSpec({ frozenSpecsCovered: ["0001", ""] });
    expect(r.kind).toBe("malformed");
    if (r.kind === "malformed") expect(r.reason).toContain("empty-string");
  });

  it("returns `ok` with the validated value for a well-formed array", () => {
    expect(classifyFrozenSpecsCoveredMultiSpec({ frozenSpecsCovered: ["0001"] })).toEqual({
      kind: "ok",
      value: ["0001"],
    });
    expect(
      classifyFrozenSpecsCoveredMultiSpec({ frozenSpecsCovered: ["0001", "spec-0007"] }),
    ).toEqual({ kind: "ok", value: ["0001", "spec-0007"] });
  });
});
