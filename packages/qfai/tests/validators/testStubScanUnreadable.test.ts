/**
 * `QFAI-TEST-002` names the states in which a clean stub scan is not evidence.
 * A selected file that could not be opened is one of them: it was never
 * checked, and dropping it silently read as "no stubs".
 *
 * File permissions do not deny a read on every platform CI runs, so the read
 * is made to fail for named files rather than arranged on disk.
 */

import type * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";

// The file name a read fails on, and the errno code it fails with.
const FAILING_READS: Record<string, string> = {
  "locked.test.ts": "EACCES",
  "gone.test.ts": "ENOENT",
};

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof fsPromises>("node:fs/promises");
  return {
    ...actual,
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      const [file] = args;
      const code = typeof file === "string" ? FAILING_READS[path.basename(file)] : undefined;
      if (code !== undefined) {
        throw Object.assign(new Error(`${code}: cannot open '${String(file)}'`), { code });
      }
      return actual.readFile(...args);
    },
  };
});

const { validateTestTodoStubs } = await import("../../src/core/validators/testTodoStubs.js");

// Split so this file's own source does not read as a stub when scanned.
const TODO = ".todo";

const CONFIG: QfaiConfig = {
  ...defaultConfig,
  validation: {
    ...defaultConfig.validation,
    traceability: {
      ...defaultConfig.validation.traceability,
      testFileGlobs: ["tests/**/*.test.ts"],
      testFileExcludeGlobs: [],
    },
  },
};

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function projectWith(files: string[]): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-unreadable-"));
  tempDirs.push(root);
  await mkdir(path.join(root, "tests"), { recursive: true });
  for (const name of files) {
    await writeFile(path.join(root, "tests", name), "export {};\n", "utf-8");
  }
  await writeFile(
    path.join(root, "tests", "open.test.ts"),
    `import { it } from "vitest";\nit${TODO}("pending");\n`,
    "utf-8",
  );
  return root;
}

function unreadableFindings(issues: Awaited<ReturnType<typeof validateTestTodoStubs>>) {
  return issues.filter(
    (i) => i.code === "QFAI-TEST-002" && i.rule === "validation.testStrategy.stubScanUnreadable",
  );
}

describe("QFAI-TEST-002 — selected files the scan could not read", () => {
  it("names every one in a single finding, in path order, while the readable files are still scanned", async () => {
    const root = await projectWith(["locked.test.ts", "gone.test.ts"]);

    const issues = await validateTestTodoStubs(root, CONFIG);

    expect(issues.some((i) => i.code === "QFAI-TEST-001" && i.file?.endsWith("open.test.ts"))).toBe(
      true,
    );
    const findings = unreadableFindings(issues);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.refs).toEqual(["tests/gone.test.ts", "tests/locked.test.ts"]);
    // Placed on a failed file, so an annotation and a path-scoped waiver reach it.
    expect(findings[0]?.file).toBe("tests/gone.test.ts");
    expect(findings[0]?.relatedFiles).toEqual(["tests/locked.test.ts"]);
    expect(findings[0]?.message).toContain("tests/gone.test.ts (ENOENT)");
    expect(findings[0]?.message).toContain("tests/locked.test.ts (EACCES)");
    // Each cause brings its own repair: running again, and access or exclusion.
    expect(findings[0]?.suggested_action).toContain("running `qfai validate` once more");
    expect(findings[0]?.suggested_action).toContain("testFileExcludeGlobs");
  });

  it("offers only a re-run for a file that vanished after it was selected", async () => {
    const root = await projectWith(["gone.test.ts"]);

    const [finding] = unreadableFindings(await validateTestTodoStubs(root, CONFIG));

    expect(finding?.refs).toEqual(["tests/gone.test.ts"]);
    expect(finding?.file).toBe("tests/gone.test.ts");
    expect(finding?.relatedFiles).toBeUndefined();
    expect(finding?.suggested_action).toContain("running `qfai validate` once more");
    expect(finding?.suggested_action).not.toContain("testFileExcludeGlobs");
  });
});
