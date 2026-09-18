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
const denied = vi.hoisted((): { target: string | null } => ({ target: null }));
vi.mock("../../src/core/fs.js", async () => {
  const actual = await vi.importActual<typeof fsModule>("../../src/core/fs.js");
  return {
    ...actual,
    collectFilesByGlobs: (...args: Parameters<typeof actual.collectFilesByGlobs>) => {
      const target = denied.target;
      const passedOver = (args[1].ignore ?? []).some((pattern) =>
        pattern.endsWith(`${path.basename(target ?? "")}/**`),
      );
      if (target !== null && !passedOver) {
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
  denied.target = null;
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
    denied.target = path.join(root, "tests", "e2e", "locked");

    const result = await evaluateAtddCodeTraceability(root, defaultConfig);
    expect(result.scan.unreadableDirectories).toEqual(["tests/e2e/locked"]);
    expect(result.scan.matchedFileCount).toBe(1);
    // Nothing inside the directory was read, so no carrier-only claim is made.
    expect(result.coveredByCarrierOnly).toEqual({ us: [], tc: [], conApi: [], conDb: [] });
  });

  it("is reported by --profile atdd, which finishes with its other results", async () => {
    const root = await projectWithLockedDirectory();
    denied.target = path.join(root, "tests", "e2e", "locked");

    const result = await validateProject(root, undefined, { profile: "atdd" });
    const finding = result.issues.find((issue) => issue.code === "QFAI-ATDD-135");
    expect(finding?.severity).toBe("error");
    expect(finding?.refs).toEqual(["tests/e2e/locked"]);
    expect(finding?.suggested_action).toContain("readable");
    expect(result.issues.some((issue) => issue.code !== "QFAI-ATDD-135")).toBe(true);
    // The directory is named and the rest of every pattern was read, so no
    // pattern is reported as unread.
    expect(result.issues.some((issue) => issue.code === "QFAI-ATDD-134")).toBe(false);
  });

  it("is named under a package test directory the project globs select", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-unreadable-"));
    tempDirs.push(root);
    const e2e = path.join(root, "packages", "app", "tests", "e2e");
    await mkdir(path.join(e2e, "locked"), { recursive: true });
    await writeFile(path.join(root, "packages", "app", "package.json"), "{}\n", "utf-8");
    await writeFile(
      path.join(e2e, "a.test.ts"),
      '// QFAI:SPEC-0001:US-0001\nit("x", () => {});\n',
      "utf-8",
    );
    await writeFile(
      path.join(e2e, "locked", "b.test.ts"),
      '// QFAI:SPEC-0001:US-0002\nit("y", () => {});\n',
      "utf-8",
    );
    denied.target = path.join(e2e, "locked");
    const config = {
      ...defaultConfig,
      validation: {
        ...defaultConfig.validation,
        traceability: {
          ...defaultConfig.validation.traceability,
          testFileGlobs: ["packages/*/tests/**/*.test.ts"],
        },
      },
    };

    const result = await evaluateAtddCodeTraceability(root, config);
    expect(result.scan.unreadableDirectories).toEqual(["packages/app/tests/e2e/locked"]);
    expect(result.scan.unreadable).toEqual([]);
    expect(result.scan.matchedFileCount).toBe(1);
  });

  it("names a directory under a tests directory outside the repository by its full path", async () => {
    const workspace = await projectWithLockedDirectory();
    const root = path.join(workspace, "repo");
    await mkdir(root, { recursive: true });
    denied.target = path.join(workspace, "tests", "e2e", "locked");
    const config = { ...defaultConfig, paths: { ...defaultConfig.paths, testsDir: "../tests" } };

    const result = await evaluateAtddCodeTraceability(root, config);
    expect(result.scan.unreadableDirectories).toEqual([denied.target.split(path.sep).join("/")]);
  });

  it("names nothing on a tree it can read", async () => {
    const root = await projectWithLockedDirectory();
    const result = await evaluateAtddCodeTraceability(root, defaultConfig);
    expect(result.scan.unreadableDirectories).toEqual([]);
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
