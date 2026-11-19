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
  it("names each one in its own finding while the readable files are still scanned", async () => {
    const root = await projectWith(["locked.test.ts", "gone.test.ts"]);

    const issues = await validateTestTodoStubs(root, CONFIG);

    expect(issues.some((i) => i.code === "QFAI-TEST-001" && i.file?.endsWith("open.test.ts"))).toBe(
      true,
    );
    // One finding per file, placed on it, so a path-scoped waiver covers only
    // the file it names.
    const byFile = new Map(unreadableFindings(issues).map((i) => [i.file, i]));
    expect([...byFile.keys()].sort()).toEqual(["tests/gone.test.ts", "tests/locked.test.ts"]);
    const gone = byFile.get("tests/gone.test.ts");
    const locked = byFile.get("tests/locked.test.ts");
    expect(gone?.refs).toEqual(["tests/gone.test.ts"]);
    expect(gone?.message).toContain("tests/gone.test.ts (ENOENT)");
    expect(locked?.message).toContain("tests/locked.test.ts (EACCES)");
    // Each cause brings its own repair: running again, or access or exclusion.
    expect(gone?.suggested_action).toContain("Run `qfai validate` once more");
    expect(gone?.suggested_action).not.toContain("testFileExcludeGlobs");
    expect(locked?.suggested_action).toContain("testFileExcludeGlobs");
    expect(locked?.suggested_action).not.toContain("once more");
  });

  it("does not claim other files were scanned when the only selected file failed", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-unreadable-"));
    tempDirs.push(root);
    await mkdir(path.join(root, "tests"), { recursive: true });
    await writeFile(path.join(root, "tests", "gone.test.ts"), "export {};\n", "utf-8");

    const [finding] = unreadableFindings(await validateTestTodoStubs(root, CONFIG));

    expect(finding?.file).toBe("tests/gone.test.ts");
    expect(finding?.message).toContain("Any other selected files were scanned");
    expect(finding?.message).not.toContain("The other files were scanned");
  });
});
