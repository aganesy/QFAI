import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildSpecScope,
  isPathInSpecScope,
  isSpecInScope,
  normalizeSpecId,
  owningSpecNumber,
} from "../../src/core/specScope.js";

const specsRoot = path.join("/repo", ".qfai", "specs");

describe("normalizeSpecId", () => {
  it("accepts the shapes the CLI and the spec directories use", () => {
    expect(normalizeSpecId("3")).toBe("0003");
    expect(normalizeSpecId("0003")).toBe("0003");
    expect(normalizeSpecId("spec-0003")).toBe("0003");
    expect(normalizeSpecId("SPEC_3")).toBe("0003");
    expect(normalizeSpecId("  0003  ")).toBe("0003");
  });

  it("rejects values that carry no resolvable number", () => {
    expect(normalizeSpecId("")).toBeNull();
    expect(normalizeSpecId("spec")).toBeNull();
    expect(normalizeSpecId("00031")).toBeNull();
    expect(normalizeSpecId("policies")).toBeNull();
  });
});

describe("buildSpecScope", () => {
  it("returns undefined when no --spec was passed", () => {
    expect(buildSpecScope(undefined)).toBeUndefined();
    expect(buildSpecScope([])).toBeUndefined();
  });

  it("normalizes and de-duplicates every value", () => {
    const scope = buildSpecScope(["3", "spec-0003", "0004"]);
    expect(scope && Array.from(scope).sort()).toEqual(["0003", "0004"]);
  });

  it("returns undefined rather than an empty scope when every value is unusable", () => {
    // An empty scope would silently validate nothing; no scope validates everything.
    expect(buildSpecScope(["nonsense"])).toBeUndefined();
  });
});

describe("isSpecInScope", () => {
  it("includes everything when there is no scope", () => {
    expect(isSpecInScope("0009", undefined)).toBe(true);
  });

  it("includes only the named specs", () => {
    const scope = buildSpecScope(["0003"]);
    expect(isSpecInScope("0003", scope)).toBe(true);
    expect(isSpecInScope("0004", scope)).toBe(false);
  });
});

describe("owningSpecNumber", () => {
  it("resolves the owning spec of a spec-pack file", () => {
    expect(owningSpecNumber(path.join(specsRoot, "spec-0003", "04_Business-Rules.md"), specsRoot)).toBe(
      "0003",
    );
  });

  it("returns null for shared and out-of-tree paths", () => {
    expect(owningSpecNumber(path.join(specsRoot, "_policies", "10_delta.md"), specsRoot)).toBeNull();
    expect(owningSpecNumber(path.join("/repo", "qfai.config.yaml"), specsRoot)).toBeNull();
    expect(owningSpecNumber(specsRoot, specsRoot)).toBeNull();
  });
});

describe("isPathInSpecScope", () => {
  const scope = buildSpecScope(["0003"]);

  it("keeps findings owned by an in-scope spec", () => {
    expect(
      isPathInSpecScope(path.join(specsRoot, "spec-0003", "06_Test-Cases.md"), specsRoot, scope),
    ).toBe(true);
  });

  it("drops findings owned by a sibling spec", () => {
    expect(
      isPathInSpecScope(path.join(specsRoot, "spec-0004", "06_Test-Cases.md"), specsRoot, scope),
    ).toBe(false);
  });

  it("always keeps repo-level findings, including _policies and fileless issues", () => {
    expect(isPathInSpecScope(path.join(specsRoot, "_policies", "03_Capabilities.md"), specsRoot, scope)).toBe(
      true,
    );
    expect(isPathInSpecScope(path.join("/repo", "qfai.config.yaml"), specsRoot, scope)).toBe(true);
    expect(isPathInSpecScope(undefined, specsRoot, scope)).toBe(true);
  });
});
