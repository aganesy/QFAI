/**
 * Integration: every entry of the `test:windows-parity` list resolves to a tracked test file the
 * workspace collects, so the job cannot land ahead of the suites it names.
 */
// QFAI:SPEC-0017:TC-0017-0095
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { PACKAGE_ROOT, suiteList } from "./ownCi.js";

/** A workspace `include` glob as a matcher over package-relative, `/`-separated paths. */
function globMatcher(glob: string): RegExp {
  const pattern = glob
    .split("**/")
    .map((part) => part.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*"))
    .join("(?:.*/)?");
  return new RegExp(`^${pattern}$`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Every project's `include` globs, from the workspace the runner reads. */
async function includeGlobs(): Promise<string[]> {
  const workspace: unknown = await import("../../../vitest.workspace");
  const entries = isRecord(workspace) ? workspace.default : undefined;
  if (!Array.isArray(entries)) throw new Error("vitest.workspace.ts exports no project list");
  return entries.flatMap((entry: unknown) => {
    const test = isRecord(entry) ? entry.test : undefined;
    const include = isRecord(test) ? test.include : undefined;
    return Array.isArray(include) ? include.filter((glob) => typeof glob === "string") : [];
  });
}

/** Tracked files under the package that some project's `include` collects. */
async function collectedTestFiles(): Promise<string[]> {
  const listed = spawnSync("git", ["ls-files", "tests"], { cwd: PACKAGE_ROOT, encoding: "utf-8" });
  if (listed.status !== 0) throw new Error(`git ls-files: ${listed.stderr}`);
  const matchers = (await includeGlobs()).map(globMatcher);
  return listed.stdout
    .split("\n")
    .filter((file) => file !== "" && matchers.some((matcher) => matcher.test(file)));
}

describe("the suites land with the job", () => {
  it("TC-0017-0095: Every suite-list entry resolves to a collected test file", async () => {
    const collected = await collectedTestFiles();
    const entries = suiteList();
    expect(entries.length).toBeGreaterThan(0);

    const unresolved = entries.filter((entry) => !collected.some((file) => file.includes(entry)));
    expect(unresolved, "entries matching no collected test file").toEqual([]);
  });
});
