/**
 * The JS/TS runner `qfai atdd scaffold` reads from a `package.json`, and how
 * it fits the dialect the configured globs chose.
 */

import { describe, expect, it } from "vitest";

import {
  applyJsRunner,
  detectJsTestRunner,
  resolveScaffoldDialect,
} from "../../../src/core/atdd/scaffoldDialect.js";

describe("detectJsTestRunner", () => {
  it.each([
    ["node --test", "node:test"],
    ["node --import tsx --test src/", "node:test"],
    ["node --watch --test", "node:test"],
    ["node.exe --test", "node:test"],
    ["cross-env X=1 node --test", "node:test"],
    ["/usr/bin/node --test", "node:test"],
    ['"C:\\Program Files\\nodejs\\node.exe" --test', "node:test"],
    ["node build.mjs --test", "none"],
    ["echo --test", "none"],
    ["node --test-reporter spec build.mjs", "none"],
  ])("reads the script %j as %s", (script, runner) => {
    expect(detectJsTestRunner({ scripts: { test: script } })).toBe(runner);
  });

  it.each([
    [{ devDependencies: { vitest: "^3.0.0", jest: "^29.0.0" } }, "vitest"],
    [{ dependencies: { jest: "^29.0.0" }, scripts: { test: "node --test" } }, "node:test"],
    [{ devDependencies: { jest: "^29.0.0" } }, "jest"],
    [{ dependencies: ["vitest"] }, "none"],
    [["vitest"], "none"],
    ["vitest", "none"],
    [null, "none"],
  ])("reads the manifest %j as %s", (manifest, runner) => {
    expect(detectJsTestRunner(manifest)).toBe(runner);
  });
});

describe("applyJsRunner", () => {
  it("leaves a Python dialect as it is whatever the JS/TS runner", () => {
    const resolution = resolveScaffoldDialect(["tests/**/test_*.py"]);
    if (resolution.outcome !== "resolved") throw new Error(resolution.outcome);
    const applied = applyJsRunner(resolution.dialect, "none");
    if (applied.outcome !== "resolved") throw new Error(applied.outcome);
    expect(applied.dialect.runner).toBe("pytest (unittest-compatible)");
  });

  it("keeps the JS/TS file name and takes the node:test body", () => {
    const resolution = resolveScaffoldDialect(["tests/**/*.test.mjs"]);
    if (resolution.outcome !== "resolved") throw new Error(resolution.outcome);
    const applied = applyJsRunner(resolution.dialect, "node:test");
    if (applied.outcome !== "resolved") throw new Error(applied.outcome);
    expect(applied.dialect.fileName("BF-0001")).toBe("BF-0001.test.mjs");
    expect(applied.dialect.buildBody("BF-0001")[0]).toBe(
      'import { describe, it } from "node:test";',
    );
  });

  it.each(["jest", "none"] as const)("refuses a JS/TS dialect for %s", (runner) => {
    const resolution = resolveScaffoldDialect(["tests/**/*.test.ts"]);
    if (resolution.outcome !== "resolved") throw new Error(resolution.outcome);
    expect(applyJsRunner(resolution.dialect, runner)).toEqual({
      outcome: "unsupported-runner",
      runner,
    });
  });
});
