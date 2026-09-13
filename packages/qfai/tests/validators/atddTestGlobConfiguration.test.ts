/**
 * The configured test globs, when the glob matcher refuses them.
 *
 * A pattern holding a NUL byte is valid YAML, and the scan refuses it. The stage
 * reads only the extensions out of its globs, so `--profile atdd` said nothing,
 * while `QFAI-TRACE-124` reported the same refusal under the `tdd` and `full`
 * profiles.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateProject } from "../../src/core/validate.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

const tempDirs: string[] = [];
const NUL = String.fromCharCode(0);
// Split so the stub gate does not read this file as a stub.
const TODO = ".todo";

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

describe("the stage says when the glob matcher refuses its globs", () => {
  it("reports a glob holding a NUL byte", async () => {
    const root = await projectWithAcceptanceTest();
    const [finding] = (await validateAtddCodeTraceability(root, configWith([NUL]))).filter(
      (issue) => issue.code === "QFAI-ATDD-134",
    );
    expect(finding?.severity).toBe("error");
    expect(finding?.message).toContain("The configured test globs could not be read");
    expect(finding?.message).toContain(JSON.stringify(NUL));
    expect(finding?.message).not.toContain(NUL);
    expect(finding?.suggested_action).toContain("testFileGlobs");
  });

  it("reports the glob beside one that selects tests", async () => {
    const root = await projectWithAcceptanceTest();
    expect(await codes(root, ["tests/**/*.ts", `tests/${NUL}/*.ts`])).toContain("QFAI-ATDD-134");
  });

  it("reports the byte wherever it sits in the pattern", async () => {
    const root = await projectWithAcceptanceTest();
    for (const glob of [`${NUL}`, `tests/${NUL}/*.ts`, `tests/**/*.ts${NUL}`]) {
      expect(await codes(root, [glob]), JSON.stringify(glob)).toContain("QFAI-ATDD-134");
    }
  });

  it("is reported by --profile atdd beside the profile's other findings", async () => {
    // Every profile scans the configured globs for scenario references, and a
    // NUL byte ahead of a wildcard used to end the process there.
    const root = await projectWithAcceptanceTest();
    await writeFile(path.join(root, "tests", "e2e", "a.test.ts"), `it${TODO}("later");\n`, "utf-8");
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      `validation:\n  traceability:\n    testFileGlobs: [${JSON.stringify(`tests/${NUL}/*.ts`)}]\n`,
      "utf-8",
    );
    const result = await validateProject(root, undefined, { profile: "atdd" });
    const found = result.issues.map((finding) => finding.code);
    expect(found).toContain("QFAI-ATDD-134");
    expect(found).toContain("QFAI-TEST-001");
  });

  it("says nothing about a broad glob", async () => {
    // `tests/**` names no extension, and the stage scans the JavaScript and
    // TypeScript set for it, which is the documented fallback, not a defect.
    const root = await projectWithAcceptanceTest();
    expect(await codes(root, ["tests/**"])).not.toContain("QFAI-ATDD-134");
  });

  it("reads a negative entry as an exclusion", async () => {
    const root = await projectWithAcceptanceTest();
    expect(await codes(root, ["tests/**/*.ts", "!tests/e2e/legacy/**"])).not.toContain(
      "QFAI-ATDD-134",
    );
  });

  it("says nothing about globs it can read", async () => {
    const root = await projectWithAcceptanceTest();
    for (const globs of [["tests/**/*.py"], ["tests/**/*.{ts,tsx}"], ["tests/**/*.test.ts"]]) {
      expect(await codes(root, globs), globs.join(",")).not.toContain("QFAI-ATDD-134");
    }
  });

  it("says nothing about a project that configured none", async () => {
    const root = await projectWithAcceptanceTest();
    expect(await codes(root, [])).not.toContain("QFAI-ATDD-134");
    expect(await codes(root, ["   "])).not.toContain("QFAI-ATDD-134");
  });
});
