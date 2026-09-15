/**
 * The configured test globs, when the glob matcher refuses them.
 *
 * A pattern holding a NUL byte is valid YAML, and the scan refuses it. The stage
 * reads only the extensions out of its globs, so `--profile atdd` said nothing,
 * while `QFAI-TRACE-124` reported the same refusal under the `tdd` and `full`
 * profiles.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { evaluateAtddCodeTraceability } from "../../src/core/atddTraceability.js";
import { defaultConfig } from "../../src/core/config.js";
import type * as fsModule from "../../src/core/fs.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "../../src/core/traceability.js";
import { validateProject } from "../../src/core/validate.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";
import { validateTestTodoStubs } from "../../src/core/validators/testTodoStubs.js";

// Every glob scan, recorded and passed through, so a case can read what the
// probe asked the matcher for.
const scanCalls = vi.hoisted((): Array<{ ignore?: string[]; limit?: number }> => []);
// A failure every scan throws instead, while a case sets one.
const scanFailure = vi.hoisted(
  (): { error: Error | null; when: (globs: readonly string[]) => boolean } => ({
    error: null,
    when: () => true,
  }),
);
// Whether every scan reports itself cut at the file limit, while a case sets it.
const scanTruncation = vi.hoisted((): { on: boolean } => ({ on: false }));
vi.mock("../../src/core/fs.js", async () => {
  const actual = await vi.importActual<typeof fsModule>("../../src/core/fs.js");
  return {
    ...actual,
    collectFilesByGlobs: async (...args: Parameters<typeof actual.collectFilesByGlobs>) => {
      scanCalls.push(args[1]);
      if (scanFailure.error !== null && scanFailure.when(args[1].globs)) {
        throw scanFailure.error;
      }
      const scan = await actual.collectFilesByGlobs(...args);
      return scanTruncation.on ? { ...scan, truncated: true } : scan;
    },
  };
});

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

  it("reports a NUL byte inside a brace set, and still finishes the profile run", async () => {
    const root = await projectWithAcceptanceTest();
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      `validation:\n  traceability:\n    testFileGlobs: [${JSON.stringify(`tests/**/*.{ts,${NUL}}`)}]\n`,
      "utf-8",
    );
    const result = await validateProject(root, undefined, { profile: "atdd" });
    expect(result.issues.map((finding) => finding.code)).toContain("QFAI-ATDD-134");
  });

  it("probes with the exclusions the scan uses", async () => {
    // A directory the scan never enters, such as one `testFileExcludeGlobs`
    // names, must not be able to fail the probe.
    const root = await projectWithAcceptanceTest();
    const config = configWith(["tests/**/*.ts"]);
    config.validation.traceability.testFileExcludeGlobs = ["tests/locked/**"];
    scanCalls.length = 0;
    await validateAtddCodeTraceability(root, config);
    const probe = scanCalls.find((options) => options.limit === 1);
    expect(probe?.ignore).toEqual([...DEFAULT_TEST_FILE_EXCLUDE_GLOBS, "tests/locked/**"]);
  });

  it("leaves a directory it never reads to the scans that do, and sends those to a permission fix", async () => {
    // The pattern was accepted; what failed is a directory it reached. The ATDD
    // stage never opens it, and the stub scan, which does, names the repair.
    const root = await projectWithAcceptanceTest();
    const denied = Object.assign(new Error("EACCES: permission denied, scandir"), {
      code: "EACCES",
    });
    const config = configWith(["tests/**/*.ts"]);
    const evaluated = await evaluateAtddCodeTraceability(root, config);
    scanFailure.error = denied;
    try {
      const [atdd] = (await validateAtddCodeTraceability(root, config, { evaluated })).filter(
        (finding) => finding.code === "QFAI-ATDD-134",
      );
      expect(atdd).toBeUndefined();
      const [stub] = (await validateTestTodoStubs(root, config)).filter(
        (finding) => finding.code === "QFAI-TEST-002",
      );
      expect(stub?.suggested_action).toContain("readable");
    } finally {
      scanFailure.error = null;
    }
  });

  it("still reports the stubs a readable pattern selects beside an unreadable directory", async () => {
    const root = await projectWithAcceptanceTest();
    await writeFile(path.join(root, "tests", "e2e", "a.test.ts"), `it${TODO}("later");\n`, "utf-8");
    // An excluded stub stays excluded when the patterns are scanned one by one.
    await mkdir(path.join(root, "tests", "e2e", "legacy"), { recursive: true });
    await writeFile(
      path.join(root, "tests", "e2e", "legacy", "b.test.ts"),
      `it${TODO}("old");
`,
      "utf-8",
    );
    const denied = Object.assign(new Error("EACCES: permission denied, scandir"), {
      code: "EACCES",
    });
    scanFailure.error = denied;
    scanFailure.when = (globs) => globs.some((glob) => glob.startsWith("locked/"));
    try {
      const found = await validateTestTodoStubs(
        root,
        configWith(["tests/**/*.test.ts", "!tests/e2e/legacy/**", "locked/**/*.test.ts"]),
      );
      const codes = found.map((finding) => finding.code);
      expect(codes).toContain("QFAI-TEST-001");
      expect(found.some((finding) => finding.file?.includes("legacy") === true)).toBe(false);
      const refusal = found.find((finding) => finding.code === "QFAI-TEST-002");
      expect(refusal?.message).toContain("could not read part of");
    } finally {
      scanFailure.error = null;
      scanFailure.when = () => true;
    }
  });

  it("finishes the stage beside a glob holding a range no pattern engine compiles", async () => {
    // Read for the file names it selects, the reversed range threw before
    // either scan ran, and took every other finding of the run with it.
    const root = await projectWithAcceptanceTest();
    const found = await codes(root, ["tests/**/test_[z-a].*", "tests/**/*.ts"]);
    expect(Array.isArray(found)).toBe(true);
  });

  it("claims nothing is carrier-only when part of the scan could not be read, and records why", async () => {
    // The runnable test that references an obligation may sit under the glob
    // that failed, so a prose carrier found elsewhere proves nothing.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-unreadable-"));
    tempDirs.push(root);
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
    await writeFile(
      path.join(specDir, "06_Test-Cases.md"),
      "# 06 Test cases\n\n## TC-0001: title\n- Parent: EX-0001\n",
      "utf-8",
    );
    await mkdir(path.join(root, "tests", "integration"), { recursive: true });
    await writeFile(
      path.join(root, "tests", "integration", "notes.md"),
      "QFAI:SPEC-0001:TC-0001\n",
      "utf-8",
    );
    const denied = Object.assign(new Error("EACCES: permission denied, scandir 'locked'"), {
      code: "EACCES",
    });
    scanFailure.error = denied;
    scanFailure.when = (globs) => globs.some((glob) => glob.startsWith("locked/"));
    try {
      const config = configWith(["locked/**/*.test.ts"]);
      const result = await evaluateAtddCodeTraceability(root, config);
      expect(result.scan.unreadable).not.toEqual([]);
      expect(result.coveredByCarrierOnly.tc).toEqual([]);

      await validateAtddCodeTraceability(root, config);
      const reportDir = path.join(root, ".qfai", "report", "atdd-traceability");
      const summary = JSON.parse(await readFile(path.join(reportDir, "summary.json"), "utf-8"));
      expect(summary.scan.unreadable.join("\n")).toContain("locked/**/*.test.ts: EACCES");
      const markdown = await readFile(path.join(reportDir, "summary.md"), "utf-8");
      expect(markdown).toContain("Part of the test globs could not be read");
      expect(markdown).toContain("  - locked/**/*.test.ts: EACCES");
    } finally {
      scanFailure.error = null;
      scanFailure.when = () => true;
    }
  });

  it("names each test glob the ATDD scan could not read, and still counts the rest", async () => {
    // The stage scans the project's own globs, so a directory one of them
    // reaches that cannot be read leaves references unfound, and the finding
    // says which pattern and why rather than leaving the gap unexplained.
    const root = await projectWithAcceptanceTest();
    const denied = Object.assign(new Error("EACCES: permission denied, scandir 'locked'"), {
      code: "EACCES",
    });
    scanFailure.error = denied;
    scanFailure.when = (globs) => globs.some((glob) => glob.startsWith("locked/"));
    try {
      const found = await validateAtddCodeTraceability(
        root,
        configWith(["tests/**/*.test.ts", "locked/**/*.test.ts"]),
      );
      const unreadable = found.find(
        (finding) =>
          finding.code === "QFAI-ATDD-134" && finding.message.includes("could not read part of"),
      );
      expect(unreadable?.message).toContain("locked/**/*.test.ts: EACCES");
      expect(unreadable?.suggested_action).toContain("testFileExcludeGlobs");
    } finally {
      scanFailure.error = null;
      scanFailure.when = () => true;
    }
  });

  it("records the error code rather than the path the failure names", async () => {
    // A file-system error's own message embeds the absolute directory, so the
    // raw text put a checkout path into the summary and into the finding, and
    // made the same failure read differently on two machines.
    const root = await projectWithAcceptanceTest();
    const absolute = "/home/someone/checkout/locked";
    scanFailure.error = Object.assign(
      new Error(`EACCES: permission denied, scandir '${absolute}'`),
      { code: "EACCES" },
    );
    scanFailure.when = (globs) => globs.some((glob) => glob.startsWith("locked/"));
    try {
      const config = configWith(["tests/**/*.test.ts", "locked/**/*.test.ts"]);
      const result = await evaluateAtddCodeTraceability(root, config);

      expect(result.scan.unreadable).toEqual(["locked/**/*.test.ts: EACCES"]);
      const found = await validateAtddCodeTraceability(root, config);
      for (const finding of found) {
        expect(JSON.stringify(finding)).not.toContain(absolute);
      }
    } finally {
      scanFailure.error = null;
      scanFailure.when = () => true;
    }
  });

  it("sends a refused pattern the project wrote to testFileGlobs, beside generated ones", async () => {
    const root = await projectWithAcceptanceTest();
    const project = `tests/${NUL}/*.ts`;
    const found = await validateTestTodoStubs(root, configWith([project]), {
      globs: ["tests/e2e/**/*.ts", project],
      projectGlobs: [project],
    });
    const refused = found.find((finding) => finding.code === "QFAI-TEST-002");
    expect(refused?.refs).toEqual(["validation.traceability.testFileGlobs"]);
  });

  it("reports a scan cut at the file limit as an error naming the setting that narrows it", async () => {
    // References past the limit are never read, so a clean result there is
    // not evidence of coverage, and `--fail-on error` must not pass it.
    const root = await projectWithAcceptanceTest();
    const truncation = (found: Awaited<ReturnType<typeof validateAtddCodeTraceability>>) =>
      found.find(
        (finding) =>
          finding.code === "QFAI-ATDD-134" && finding.message.includes("stopped at that limit"),
      );
    scanTruncation.on = true;
    try {
      const configured = truncation(
        await validateAtddCodeTraceability(root, configWith(["tests/**/*.test.ts"])),
      );
      expect(configured?.severity).toBe("error");
      expect(configured?.refs).toEqual(["validation.traceability.testFileGlobs"]);

      // With no project glob, only the exclusions can shrink the selection.
      const shipped = truncation(await validateAtddCodeTraceability(root, configWith([])));
      expect(shipped?.refs).toEqual(["validation.traceability.testFileExcludeGlobs"]);
    } finally {
      scanTruncation.on = false;
    }
    expect(truncation(await validateAtddCodeTraceability(root, configWith([])))).toBeUndefined();
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
