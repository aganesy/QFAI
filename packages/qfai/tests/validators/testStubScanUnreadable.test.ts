/**
 * `QFAI-TEST-002` names the states in which a clean stub scan is not evidence.
 * A selected file that could not be opened is one of them: it was never
 * checked, and dropping it silently read as "no stubs".
 *
 * File permissions do not deny a read on every platform CI runs, so the read
 * is made to fail for one named file rather than arranged on disk.
 */

import type * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";

const UNREADABLE = "locked.test.ts";

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof fsPromises>("node:fs/promises");
  return {
    ...actual,
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      const [file] = args;
      if (typeof file === "string" && path.basename(file) === UNREADABLE) {
        throw Object.assign(new Error(`EACCES: permission denied, open '${file}'`), {
          code: "EACCES",
        });
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

describe("QFAI-TEST-002 — a selected file the scan could not read", () => {
  it("is reported as not checked while the readable files are still scanned", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-unreadable-"));
    tempDirs.push(root);
    await mkdir(path.join(root, "tests"), { recursive: true });
    await writeFile(path.join(root, "tests", UNREADABLE), "export {};\n", "utf-8");
    await writeFile(
      path.join(root, "tests", "open.test.ts"),
      `import { it } from "vitest";\nit${TODO}("pending");\n`,
      "utf-8",
    );

    const issues = await validateTestTodoStubs(root, CONFIG);

    expect(issues.some((i) => i.code === "QFAI-TEST-001" && i.file?.endsWith("open.test.ts"))).toBe(
      true,
    );
    const unreadable = issues.find(
      (i) => i.code === "QFAI-TEST-002" && i.rule === "validation.testStrategy.stubScanUnreadable",
    );
    expect(unreadable?.refs).toEqual([`tests/${UNREADABLE}`]);
    expect(unreadable?.message).toContain(`tests/${UNREADABLE}`);
  });
});
