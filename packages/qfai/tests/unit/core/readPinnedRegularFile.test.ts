/**
 * The pinned text reader answers what the pinned byte reader answers, decoded
 * as UTF-8: the whole text of a bounded regular file, and `null` for a file
 * past the ceiling or a directory.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readPinnedRegularFile } from "../../../src/core/init/fsGuards.js";

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
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-pinned-read-"));
  tempDirs.push(dir);
  return dir;
}

describe("readPinnedRegularFile", () => {
  it("returns the file's content decoded as UTF-8", async () => {
    const dir = await newTempDir();
    const file = path.join(dir, "note.txt");
    await writeFile(file, "pinned — text\n", "utf-8");

    expect(await readPinnedRegularFile(file, 64)).toBe("pinned — text\n");
  });

  it("reads a file exactly at the ceiling and refuses one byte past it", async () => {
    const dir = await newTempDir();
    const atCeiling = path.join(dir, "at.txt");
    const pastCeiling = path.join(dir, "past.txt");
    await writeFile(atCeiling, "abcd", "utf-8");
    await writeFile(pastCeiling, "abcde", "utf-8");

    expect(await readPinnedRegularFile(atCeiling, 4)).toBe("abcd");
    expect(await readPinnedRegularFile(pastCeiling, 4)).toBeNull();
  });

  it("answers null for a directory", async () => {
    const dir = await newTempDir();
    const sub = path.join(dir, "sub");
    await mkdir(sub);

    expect(await readPinnedRegularFile(sub, 64)).toBeNull();
  });
});
