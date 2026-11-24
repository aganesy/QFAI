/**
 * A preflight boundary check that fails after the output directory was created does not claim
 * that nothing was written: `mkdir` may have created `<outDir>/preflight/` on the way. It says
 * that no summary was written. A check that fails before `mkdir` still says nothing was.
 *
 * `vi.mock` is hoisted to module scope, so the `mkdir` swap lives in its own file.
 */

import type * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { runSddPreflight } from "../../src/core/preflight/sddPreflight.js";

type FsPromises = typeof fsPromises;

const swap = vi.hoisted(() => ({
  /** Once `mkdir` has created this directory, it is replaced with a link to `to`. */
  directory: undefined as string | undefined,
  to: undefined as string | undefined,
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    default: actual,
    mkdir: async (...args: Parameters<FsPromises["mkdir"]>): Promise<string | undefined> => {
      const created = await actual.mkdir(...args);
      const { directory, to } = swap;
      if (directory !== undefined && to !== undefined && String(args[0]) === directory) {
        swap.directory = undefined;
        await actual.rm(directory, { recursive: true, force: true });
        await actual.symlink(to, directory, process.platform === "win32" ? "junction" : "dir");
      }
      return created;
    },
  };
});

const roots: string[] = [];

afterEach(async () => {
  swap.directory = undefined;
  swap.to = undefined;
  while (roots.length > 0) {
    const root = roots.pop();
    if (root !== undefined) await rm(root, { recursive: true, force: true });
  }
});

async function newDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-mkdir-"));
  roots.push(dir);
  return dir;
}

describe("a preflight boundary refusal says what was written", () => {
  it("says no summary was written when the check after mkdir fails", async () => {
    const root = await newDir();
    const outside = await newDir();
    swap.directory = path.join(root, ".qfai", "report", "preflight");
    swap.to = outside;

    await expect(runSddPreflight(root, defaultConfig)).rejects.toThrow(
      ".qfai/report/preflight is a symbolic link or junction, so the preflight summary would be " +
        "written outside the output directory. No summary was written. " +
        "Replace it with a real directory, or set paths.outDir to one.",
    );
    expect(await readdir(outside)).toEqual([]);
  });

  it("still says nothing was written when the check before mkdir fails", async () => {
    const root = await newDir();
    const reportRoot = path.join(root, ".qfai", "report");
    await mkdir(reportRoot, { recursive: true });
    await writeFile(path.join(reportRoot, "preflight"), "not a directory\n", "utf-8");

    await expect(runSddPreflight(root, defaultConfig)).rejects.toThrow(
      ".qfai/report/preflight is not a directory, so the preflight output directory cannot be " +
        "created. Nothing was written. Move it aside, or set paths.outDir to a directory.",
    );
  });
});
