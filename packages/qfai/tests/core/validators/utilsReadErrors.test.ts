/**
 * `exists` and `readSafe` answer "absent" only for a path with nothing at it.
 *
 * Both used to fold every rejection into the benign answer, so `EACCES` or
 * `EIO` on an artifact read as a missing artifact, and the validator that asked
 * passed. Only `ENOENT` and `ENOTDIR` mean nothing is there; any other error is
 * thrown unchanged. This file is apart from the validators' own suites because
 * `vi.mock` is hoisted to module scope and would apply to every case in them.
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const { accessSpy, readFileSpy } = vi.hoisted(() => ({
  accessSpy: vi.fn(),
  readFileSpy: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    access: (...args: unknown[]) => accessSpy(actual, ...args),
    readFile: (...args: unknown[]) => readFileSpy(actual, ...args),
  };
});

const { exists, readSafe } = await import("../../../src/core/validators/utils.js");

function errno(code: string): NodeJS.ErrnoException {
  const error = new Error(`simulated ${code}`) as NodeJS.ErrnoException;
  error.code = code;
  return error;
}

let root: string;

beforeEach(async () => {
  accessSpy.mockReset();
  readFileSpy.mockReset();
  accessSpy.mockImplementation((actual: FsPromises, target: string) => actual.access(target));
  readFileSpy.mockImplementation((actual: FsPromises, target: string, encoding: BufferEncoding) =>
    actual.readFile(target, encoding),
  );
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-utils-read-errors-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("exists", () => {
  it("is true for a file that is there", async () => {
    const file = path.join(root, "present.md");
    await writeFile(file, "text\n", "utf-8");

    await expect(exists(file)).resolves.toBe(true);
  });

  it("is false for a path that does not exist", async () => {
    await expect(exists(path.join(root, "missing.md"))).resolves.toBe(false);
  });

  it("is false when a parent of the path is a file", async () => {
    const parent = path.join(root, "parent");
    await writeFile(parent, "not a directory\n", "utf-8");

    await expect(exists(path.join(parent, "child.md"))).resolves.toBe(false);
  });

  it.each(["EACCES", "EIO"])("throws the identical %s error", async (code) => {
    const failure = errno(code);
    accessSpy.mockImplementation(() => Promise.reject(failure));

    await expect(exists(path.join(root, "any.md"))).rejects.toBe(failure);
  });
});

describe("readSafe", () => {
  it("returns the content of a file that is there", async () => {
    const file = path.join(root, "present.md");
    await writeFile(file, "text\n", "utf-8");

    await expect(readSafe(file)).resolves.toBe("text\n");
  });

  it("returns an empty string for a path that does not exist", async () => {
    await expect(readSafe(path.join(root, "missing.md"))).resolves.toBe("");
  });

  it("returns an empty string when a parent of the path is a file", async () => {
    const parent = path.join(root, "parent");
    await writeFile(parent, "not a directory\n", "utf-8");

    await expect(readSafe(path.join(parent, "child.md"))).resolves.toBe("");
  });

  it.each(["EACCES", "EIO"])("throws the identical %s error", async (code) => {
    const failure = errno(code);
    readFileSpy.mockImplementation(() => Promise.reject(failure));

    await expect(readSafe(path.join(root, "any.md"))).rejects.toBe(failure);
  });
});
