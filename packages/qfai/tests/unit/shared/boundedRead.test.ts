/**
 * The identity check the bounded reader and the streaming scanner share.
 *
 * `dev` and `ino` answer it wherever the volume reports an inode. Some report
 * `0` for every file, and there the comparison every other case relies on says
 * two different files are one, so the fallback is what stands between a swapped
 * path and a verdict about the wrong bytes.
 */

import { describe, expect, it } from "vitest";

import { sameObject, type ObjectIdentity } from "../../../src/shared/boundedRead.js";

const INSPECTED: ObjectIdentity = {
  dev: 3,
  ino: 0,
  size: 128,
  mode: 0o100644,
  mtimeMs: 1_700_000_000_000,
  ctimeMs: 1_700_000_000_000,
  birthtimeMs: 1_699_000_000_000,
};

describe("sameObject", () => {
  it("answers by the inode wherever the volume reports one", () => {
    const inspected = { ...INSPECTED, ino: 42 };
    expect(sameObject(inspected, { ...inspected, size: 1, mtimeMs: 0 })).toBe(true);
    expect(sameObject(inspected, { ...inspected, ino: 43 })).toBe(false);
    expect(sameObject(inspected, { ...inspected, dev: 4 })).toBe(false);
  });

  it("does not read two zero inodes as one object", () => {
    // `0 === 0` is every file on the volume, so the rest of what both calls
    // measured decides instead.
    expect(sameObject(INSPECTED, { ...INSPECTED })).toBe(true);
    for (const swapped of [
      { size: 129 },
      { mode: 0o100600 },
      { mtimeMs: INSPECTED.mtimeMs + 1 },
      { ctimeMs: INSPECTED.ctimeMs + 1 },
      { birthtimeMs: INSPECTED.birthtimeMs + 1 },
    ]) {
      expect(sameObject(INSPECTED, { ...INSPECTED, ...swapped })).toBe(false);
    }
  });

  it("falls back when only one of the two reports an inode", () => {
    // One side with an inode and one without cannot be compared by inode at
    // all, and a device that reported one a moment ago is not more trustworthy
    // for having stopped.
    const opened = { ...INSPECTED, ino: 42 };
    expect(sameObject(INSPECTED, opened)).toBe(true);
    expect(sameObject(INSPECTED, { ...opened, size: 129 })).toBe(false);
  });

  it("refuses a different device before anything else", () => {
    expect(sameObject(INSPECTED, { ...INSPECTED, dev: 4 })).toBe(false);
  });
});
