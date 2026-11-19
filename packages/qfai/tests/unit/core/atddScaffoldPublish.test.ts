/**
 * A scaffold is published only once its body is written in full, never over
 * an existing test, and without hard links as well as with them.
 *
 * A failed write, a filesystem without hard links and a staging file that
 * cannot be removed are mocked, because none can be made portably on every
 * platform the suite runs on. `vi.mock` is hoisted to module scope, so these
 * cases live in their own file.
 */

import { lstat, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ScaffoldTarget } from "../../../src/core/atdd/scaffold.js";

type FsPromises = typeof fsPromises;

const { faults } = vi.hoisted(() => ({
  faults: { dir: "", failWrite: false, linkCode: "", failRm: false },
}));

function fsError(code: string): Error {
  return Object.assign(new Error(`${code}: simulated`), { code });
}

function isGuarded(file: unknown): boolean {
  return faults.dir !== "" && typeof file === "string" && path.dirname(file) === faults.dir;
}

function half(data: unknown): string {
  const text = String(data);
  return text.slice(0, Math.floor(text.length / 2));
}

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    writeFile: async (...args: Parameters<FsPromises["writeFile"]>) => {
      const [file, data, options] = args;
      if (!(faults.failWrite && isGuarded(file))) return actual.writeFile(...args);
      await actual.writeFile(file, half(data), options);
      throw fsError("ENOSPC");
    },
    open: async (...args: Parameters<FsPromises["open"]>) => {
      const handle = await actual.open(...args);
      if (!(faults.failWrite && isGuarded(args[0]))) return handle;
      return Object.assign(handle, {
        writeFile: async (data: unknown) => {
          await actual.writeFile(handle, half(data));
          throw fsError("ENOSPC");
        },
      });
    },
    link: async (...args: Parameters<FsPromises["link"]>) => {
      if (faults.linkCode !== "" && isGuarded(args[1])) throw fsError(faults.linkCode);
      return actual.link(...args);
    },
    rm: async (...args: Parameters<FsPromises["rm"]>) => {
      if (faults.failRm && isGuarded(args[0])) throw fsError("EBUSY");
      return actual.rm(...args);
    },
  };
});

const { emitSkeleton } = await import("../../../src/core/atdd/scaffold.js");

let root: string;
let dir: string;
let dest: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-scaffold-publish-"));
  dir = path.join(root, "tests", "e2e");
  dest = path.join(dir, "bf0008.test.ts");
});

afterEach(async () => {
  Object.assign(faults, { dir: "", failWrite: false, linkCode: "", failRm: false });
  await rm(root, { recursive: true, force: true });
});

const target: ScaffoldTarget = { id: "BF-0008", kind: "BF" };
const body = "// a skeleton\n\nit('runs', () => {});\n";

describe("emitSkeleton when the write fails", () => {
  it("leaves nothing at the destination and a retry writes the full skeleton", async () => {
    Object.assign(faults, { dir, failWrite: true });

    await expect(emitSkeleton(target, dest, body)).rejects.toMatchObject({ code: "ENOSPC" });
    await expect(lstat(dest)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readdir(dir)).toEqual([]);

    faults.failWrite = false;
    await expect(emitSkeleton(target, dest, body)).resolves.toEqual({
      destPath: dest,
      wrote: true,
    });
    expect(await readFile(dest, "utf8")).toBe(body);
    expect(await readdir(dir)).toEqual(["bf0008.test.ts"]);
  });
});

describe("emitSkeleton with a test already at the destination", () => {
  it("keeps the test and leaves only it in the directory", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(dest, "// an existing test\n");

    await expect(emitSkeleton(target, dest, body)).resolves.toEqual({
      destPath: dest,
      wrote: false,
    });
    expect(await readFile(dest, "utf8")).toBe("// an existing test\n");
    expect(await readdir(dir)).toEqual(["bf0008.test.ts"]);
  });

  it("keeps the test when the filesystem has no hard links", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(dest, "// an existing test\n");
    Object.assign(faults, { dir, linkCode: "EPERM" });

    await expect(emitSkeleton(target, dest, body)).resolves.toEqual({
      destPath: dest,
      wrote: false,
    });
    expect(await readFile(dest, "utf8")).toBe("// an existing test\n");
    expect(await readdir(dir)).toEqual(["bf0008.test.ts"]);
  });
});

describe("emitSkeleton on a filesystem without hard links", () => {
  it.each(["EPERM", "EISDIR", "ENOTSUP"])(
    "writes the full skeleton when link fails with %s",
    async (code) => {
      await mkdir(dir, { recursive: true });
      Object.assign(faults, { dir, linkCode: code });

      await expect(emitSkeleton(target, dest, body)).resolves.toEqual({
        destPath: dest,
        wrote: true,
      });
      expect(await readFile(dest, "utf8")).toBe(body);
      expect(await readdir(dir)).toEqual(["bf0008.test.ts"]);
    },
  );
});

describe("emitSkeleton when the staging file cannot be removed", () => {
  it("still reports the published test and names the file left behind", async () => {
    Object.assign(faults, { dir, failRm: true });

    const outcome = await emitSkeleton(target, dest, body);

    expect(outcome.wrote).toBe(true);
    expect(outcome.leftBehind).toMatch(/[\\/]\.qfai-scaffold-[0-9a-f]{12}\.tmp$/);
    expect(path.dirname(outcome.leftBehind ?? "")).toBe(dir);
    expect(await readFile(dest, "utf8")).toBe(body);
  });

  it("keeps the write error rather than the removal error", async () => {
    Object.assign(faults, { dir, failWrite: true, failRm: true });

    await expect(emitSkeleton(target, dest, body)).rejects.toMatchObject({ code: "ENOSPC" });
    await expect(lstat(dest)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
