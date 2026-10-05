/**
 * The existence helper the doctor suites assert absence with answers `false`
 * only for a missing path. Any other failure rejects with the original error.
 *
 * The failure case passes a path holding a NUL byte: Node rejects it with its
 * own error code, never ENOENT, on every platform and without a permission
 * change.
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { pathExists } from "../helpers/pathExists.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-path-exists-"));
  tempDirs.push(dir);
  return dir;
}

describe("pathExists", () => {
  it("is true for a file and for a directory", async () => {
    const dir = await newTempDir();
    const file = path.join(dir, "present.txt");
    await writeFile(file, "x", "utf-8");

    expect(await pathExists(file)).toBe(true);
    expect(await pathExists(dir)).toBe(true);
  });

  it("is false for a missing path", async () => {
    const dir = await newTempDir();

    expect(await pathExists(path.join(dir, "absent"))).toBe(false);
  });

  it("rejects with the original error when the failure is not ENOENT", async () => {
    const dir = await newTempDir();
    const invalid = path.join(dir, "bad\0name");

    await expect(pathExists(invalid)).rejects.toMatchObject({
      code: "ERR_INVALID_ARG_VALUE",
    });
  });
});
