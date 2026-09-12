/**
 * A configured test glob this stage cannot read an extension out of.
 *
 * `/qfai-atdd` scans its own three directories, and the extensions it looks for
 * come from `validation.traceability.testFileGlobs`, with a fallback to the
 * JavaScript and TypeScript set when that yields none. The fallback is right
 * for a project that configured nothing. For a project that configured globs
 * and got no extension out of them — a pattern `fast-glob` cannot read, a
 * string holding a NUL byte — the stage scanned extensions the project does not
 * use, found no annotation, and reported every obligation as uncovered.
 *
 * `QFAI-TRACE-124` says the same thing about the same setting under the `sdd`
 * and `full` profiles. It is not in this profile's gate list, so the gate the
 * skill tells the operator to run said nothing at all.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

/** A project with one acceptance test under the stage own directories. */
async function projectWithAcceptanceTest(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-globs-"));
  tempDirs.push(root);
  await mkdir(path.join(root, "tests", "e2e"), { recursive: true });
  await writeFile(path.join(root, "tests", "e2e", "a.test.ts"), 'it("x", () => {});\n', "utf-8");
  return root;
}

const configWith = (testFileGlobs: readonly string[]): typeof defaultConfig => ({
  ...defaultConfig,
  validation: {
    ...defaultConfig.validation,
    traceability: { ...defaultConfig.validation.traceability, testFileGlobs: [...testFileGlobs] },
  },
});

const codes = async (root: string, testFileGlobs: readonly string[]): Promise<string[]> =>
  (await validateAtddCodeTraceability(root, configWith(testFileGlobs))).map(
    (finding) => finding.code,
  );

describe("the stage says when it could not read the globs it was given", () => {
  it("reports a configured glob that yields no extension", async () => {
    const root = await projectWithAcceptanceTest();
    const globs = [String.fromCharCode(0)];
    const [finding] = (await validateAtddCodeTraceability(root, configWith(globs))).filter(
      (issue) => issue.code === "QFAI-ATDD-134",
    );
    expect(finding?.severity).toBe("error");
    expect(finding?.message).toContain("default JavaScript and TypeScript set");
    expect(finding?.suggested_action).toContain("testFileGlobs");
  });

  it("reports an unreadable glob beside a readable one", async () => {
    // Asked of the whole list, the readable entry's extension answered for both,
    // and the tests the other entry was written to select were never scanned.
    const root = await projectWithAcceptanceTest();
    const unreadable = String.fromCharCode(0);
    const [finding] = (
      await validateAtddCodeTraceability(root, configWith(["tests/**/*.ts", unreadable]))
    ).filter((issue) => issue.code === "QFAI-ATDD-134");
    expect(finding?.severity).toBe("error");
    expect(finding?.message).toContain("scanned only for the extensions the others name (ts)");
    expect(finding?.message).not.toContain("tests/**/*.ts");
  });

  it("says nothing about globs it can read", async () => {
    const root = await projectWithAcceptanceTest();
    for (const globs of [["tests/**/*.py"], ["tests/**/*.{ts,tsx}"], ["tests/**/*.test.ts"]]) {
      expect(await codes(root, globs), globs.join(",")).not.toContain("QFAI-ATDD-134");
    }
  });

  it("says nothing about a project that configured none", async () => {
    // The fallback is what an unconfigured project is meant to get, so the
    // finding would report every project that never set the key.
    const root = await projectWithAcceptanceTest();
    expect(await codes(root, [])).not.toContain("QFAI-ATDD-134");
    expect(await codes(root, ["   "])).not.toContain("QFAI-ATDD-134");
  });
});
