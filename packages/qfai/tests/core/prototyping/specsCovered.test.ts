import { describe, expect, it } from "vitest";

import { readFrozenSpecsCovered } from "../../../src/core/prototyping/specsCovered.js";

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
