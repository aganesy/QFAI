/**
 * Test globs read the way the scan that collects with them reads them.
 *
 * Each dot-segment expectation is what fast-glob returns for the same pattern
 * with `dot: false`, so a glob vouches only for files the scan could collect
 * with it.
 */
import { describe, expect, it } from "vitest";

import { globExtensions, namedTestFileMatcher } from "../../../src/core/testGlobExtensions.js";

describe("namedTestFileMatcher", () => {
  it.each([
    ["a/**/*.test.*", "a/b/x.test.json", true],
    ["a/**/*.test.*", "a/.generated/x.test.json", false],
    ["a/**/*.test.*", "a/b/.dot.test.json", false],
    ["a/*.test.json", "a/.hidden.test.json", false],
    ["a/?generated/x.test.json", "a/.generated/x.test.json", false],
    ["a/{b,*}/x.test.json", "a/zgenerated/x.test.json", true],
    ["a/{b,*}/x.test.json", "a/.generated/x.test.json", false],
    ["a/.generated/**/*.json", "a/.generated/deep/y.test.json", true],
    ["a/.generated/**/*.json", "a/.generated/.z.test.json", false],
  ])("does not let a wildcard in %s match a leading dot: %s is %s", (glob, file, matches) => {
    expect(namedTestFileMatcher([glob])(file)).toBe(matches);
  });

  it.each([
    ["a/.*/x.test.json", "a/.generated/x.test.json"],
    ["a/[.]generated/x.test.json", "a/.generated/x.test.json"],
    ["a/{.generated,b}/x.test.json", "a/.generated/x.test.json"],
    ["a/{,.}*/x.test.json", "a/.generated/x.test.json"],
    ["a/@(*|b)/x.test.json", "a/.generated/x.test.json"],
    ["a/!(b)/x.test.json", "a/.generated/x.test.json"],
    ["a/**/.hidden.test.json", "a/.hidden.test.json"],
    ["**/.generated/*.json", "a/.generated/x.test.json"],
  ])("matches a dot %s writes or reaches as the scan does: %s", (glob, file) => {
    expect(namedTestFileMatcher([glob])(file)).toBe(true);
  });

  it("reads a last segment of wildcards as naming nothing, surrounding whitespace included", () => {
    expect(namedTestFileMatcher([" packages/**/* "])("packages/a/tests/data.json")).toBe(false);
    expect(namedTestFileMatcher([" packages/**/*.json "])("packages/a/tests/data.json")).toBe(true);
  });
});

describe("globExtensions", () => {
  it("reads a glob with surrounding whitespace as the scans do", () => {
    expect(globExtensions([" packages/**/*.TS "])).toEqual([".TS"]);
  });
});
