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

  it("reads a wildcard wrapped in group syntax as naming nothing", () => {
    // The syntax is not a name: `@(*)` selects what `*` selects, and a matcher
    // that vouched for its basenames read a fixture beside the suite as source.
    for (const glob of ["packages/*/tests/**/@(*)", "packages/*/tests/**/*(?)", "a/tests/{*,?}"]) {
      expect(namedTestFileMatcher([glob])("packages/a/tests/data.json"), glob).toBe(false);
    }
    // A branch that constrains nothing makes the whole segment broad, however
    // specific its siblings are.
    for (const glob of [
      "packages/*/tests/**/@(test_*|*)",
      "packages/*/tests/**/{test_*,*}",
      "packages/*/tests/**/@(a|@(b|*))",
    ]) {
      expect(namedTestFileMatcher([glob])("packages/a/tests/data.json"), glob).toBe(false);
    }
    // A group naming something still names it.
    expect(
      namedTestFileMatcher(["packages/*/tests/**/@(data.json|x.json)"])(
        "packages/a/tests/data.json",
      ),
    ).toBe(true);
    expect(
      namedTestFileMatcher(["packages/*/tests/**/*.!(md)"])("packages/a/tests/data.json"),
    ).toBe(true);
  });

  it("reads a last segment of wildcards as naming nothing, surrounding whitespace included", () => {
    expect(namedTestFileMatcher([" packages/**/* "])("packages/a/tests/data.json")).toBe(false);
    expect(namedTestFileMatcher([" packages/**/*.json "])("packages/a/tests/data.json")).toBe(true);
  });

  it.each([
    ["packages/*/tests/**/test_[[:digit:]].*", "packages/a/tests/test_1.zig", true],
    ["packages/*/tests/**/test_[[:digit:]].*", "packages/a/tests/test_x.zig", false],
    ["packages/*/tests/**/test_[[:alpha:]].*", "packages/a/tests/test_x.zig", true],
    // `!` is an ordinary member and only `^` negates, as the collector reads it.
    ["packages/*/tests/**/test_[![:digit:]].*", "packages/a/tests/test_x.zig", false],
    ["packages/*/tests/**/test_[![:digit:]].*", "packages/a/tests/test_1.zig", true],
    ["packages/*/tests/**/test_[!x].*", "packages/a/tests/test_!.zig", true],
    ["packages/*/tests/**/test_[^[:digit:]].*", "packages/a/tests/test_x.zig", true],
    ["packages/*/tests/**/test_[^[:digit:]].*", "packages/a/tests/test_1.zig", false],
    // A nested group closes at its own bracket, not at the inner one's.
    ["packages/*/tests/**/@(test_@(a|b)|spec_*).*", "packages/a/tests/test_a.zig", true],
    ["packages/*/tests/**/@(test_@(a|b)|spec_*).*", "packages/a/tests/test_c.zig", false],
  ])("reads the POSIX class in %s as the collector does: %s is %s", (glob, file, matches) => {
    expect(namedTestFileMatcher([glob])(file)).toBe(matches);
  });

  it("vouches for no file where a bracket expression names something it cannot read", () => {
    // A collating element and an equivalence class select names this reader
    // does not derive, so the glob is refused rather than read as its letters.
    expect(namedTestFileMatcher(["a/tests/test_[[.a.]].zig"])("a/tests/test_a.zig")).toBe(false);
    expect(namedTestFileMatcher(["a/tests/test_[[=a=]].zig"])("a/tests/test_a.zig")).toBe(false);
    expect(namedTestFileMatcher(["a/tests/test_[[:bogus:]].zig"])("a/tests/test_a.zig")).toBe(
      false,
    );
  });

  it("keeps a closing bracket written as the first member a member", () => {
    expect(namedTestFileMatcher(["a/tests/test_[]x].zig"])("a/tests/test_].zig")).toBe(true);
    expect(namedTestFileMatcher(["a/tests/test_[]x].zig"])("a/tests/test_x.zig")).toBe(true);
    expect(namedTestFileMatcher(["a/tests/test_[]x].zig"])("a/tests/test_y.zig")).toBe(false);
  });

  // Each row is what fast-glob selects from the same names: a negated group
  // passes over a name that starts with a member, unless it ends the pattern.
  it.each([
    ["t/!(fixture|data).json", ["t/afixture.json", "t/pay.json", "t/x.test.json"]],
    ["t/!(fixture|data).json", [], ["t/fixture-old.json", "t/fixture.old.json", "t/datax.json"]],
    ["t/*.!(json)", ["t/fixture.old.json", "t/x.test.json"], ["t/fixture.json", "t/pay.json"]],
    ["t/!(fixture)/x.json", ["t/pay/x.json"], ["t/fixture/x.json", "t/fixture-old/x.json"]],
    ["t/!(fix)ture.json", ["t/afixture.json"], ["t/fixture.json"]],
    ["t/!(*.test).json", ["t/fixture.old.json", "t/pay.json"], ["t/x.test.json"]],
  ])("reads the negated group in %s as the collector does", (glob, selected, passed = []) => {
    const matches = namedTestFileMatcher([glob]);
    for (const file of selected) expect(matches(file), file).toBe(true);
    for (const file of passed) expect(matches(file), file).toBe(false);
  });
});

describe("globExtensions", () => {
  it("reads a glob with surrounding whitespace as the scans do", () => {
    expect(globExtensions([" packages/**/*.TS "])).toEqual([".TS"]);
  });
});
