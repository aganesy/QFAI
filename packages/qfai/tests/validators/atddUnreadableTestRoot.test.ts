/**
 * A directory under the acceptance test roots that cannot be read.
 *
 * The glob walk stops on it, and that failure ended `--profile atdd` with no
 * finding and none of the profile's other results. The scan now reads past the
 * directory and names it.
 */

import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { evaluateAtddCodeTraceability } from "../../src/core/atddTraceability.js";
import { defaultConfig } from "../../src/core/config.js";
import type * as fsModule from "../../src/core/fs.js";
import { validateProject } from "../../src/core/validate.js";

// A directory every glob scan fails on until the scan is told to pass over it,
// which is what a directory the account cannot read does to the walk.
const denied = vi.hoisted((): { directory: string | null; root: string } => ({
  directory: null,
  root: "",
}));
vi.mock("../../src/core/fs.js", async () => {
  const actual = await vi.importActual<typeof fsModule>("../../src/core/fs.js");
  return {
    ...actual,
    collectFilesByGlobs: (...args: Parameters<typeof actual.collectFilesByGlobs>) => {
      const directory = denied.directory;
      if (directory !== null && !(args[1].ignore ?? []).includes(`${directory}/**`)) {
        const target = path.join(denied.root, directory);
        return Promise.reject(
          Object.assign(new Error(`EACCES: permission denied, scandir '${target}'`), {
            code: "EACCES",
            path: target,
          }),
        );
      }
      return actual.collectFilesByGlobs(...args);
    },
  };
});

const tempDirs: string[] = [];

afterEach(async () => {
  denied.directory = null;
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await chmod(path.join(dir, "tests", "e2e", "locked"), 0o755).catch(() => undefined);
      await rm(dir, { recursive: true, force: true });
    }
  }
});

/** A project with one annotated acceptance test, and a directory beside it. */
async function projectWithLockedDirectory(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-unreadable-"));
  tempDirs.push(root);
  await mkdir(path.join(root, "tests", "e2e", "locked"), { recursive: true });
  await writeFile(
    path.join(root, "tests", "e2e", "a.test.ts"),
    '// QFAI:SPEC-0001:US-0001\nit("x", () => {});\n',
    "utf-8",
  );
  await writeFile(
    path.join(root, "tests", "e2e", "locked", "b.test.ts"),
    '// QFAI:SPEC-0001:US-0002\nit("y", () => {});\n',
    "utf-8",
  );
  return root;
}

describe("an unreadable directory under the acceptance test roots", () => {
  it("is read past and named, with the tests beside it still counted", async () => {
    const root = await projectWithLockedDirectory();
    denied.root = root;
    denied.directory = "tests/e2e/locked";

    const result = await evaluateAtddCodeTraceability(root, defaultConfig);
    expect(result.scan.unreadable).toEqual(["tests/e2e/locked"]);
    expect(result.scan.matchedFileCount).toBe(1);
    // Nothing inside the directory was read, so no carrier-only claim is made.
    expect(result.coveredByCarrierOnly).toEqual({ us: [], tc: [], conApi: [], conDb: [] });
  });

  it("is reported by --profile atdd, which finishes with its other results", async () => {
    const root = await projectWithLockedDirectory();
    denied.root = root;
    denied.directory = "tests/e2e/locked";

    const result = await validateProject(root, undefined, { profile: "atdd" });
    const finding = result.issues.find((issue) => issue.code === "QFAI-ATDD-135");
    expect(finding?.severity).toBe("error");
    expect(finding?.refs).toEqual(["tests/e2e/locked"]);
    expect(finding?.suggested_action).toContain("readable");
    expect(result.issues.some((issue) => issue.code !== "QFAI-ATDD-135")).toBe(true);
  });

  it("names nothing on a tree it can read", async () => {
    const root = await projectWithLockedDirectory();
    const result = await evaluateAtddCodeTraceability(root, defaultConfig);
    expect(result.scan.unreadable).toEqual([]);
    expect(result.scan.matchedFileCount).toBe(2);
  });

  it("names the directory the file system refuses", async () => {
    // The walk's own error, rather than one this suite builds.
    if (process.platform === "win32" || process.getuid?.() === 0) return;
    const root = await projectWithLockedDirectory();
    await chmod(path.join(root, "tests", "e2e", "locked"), 0o000);

    const result = await validateProject(root, undefined, { profile: "atdd" });
    const finding = result.issues.find((issue) => issue.code === "QFAI-ATDD-135");
    expect(finding?.refs).toEqual(["tests/e2e/locked"]);
  });
});
