/**
 * A scaffold whose write fails leaves no test behind, so a retry writes the
 * whole skeleton instead of keeping a partial file as an existing test.
 *
 * The write is mocked to put half of the body down and then fail, because a
 * full disk cannot be made portably on every platform the suite runs on.
 * `vi.mock` is hoisted to module scope, so these cases live in their own file.
 */

import { lstat, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ScaffoldTarget } from "../../../src/core/atdd/scaffold.js";

type FsPromises = typeof fsPromises;

const { failing } = vi.hoisted(() => ({ failing: { dir: "" } }));

function diskFull(): Error {
  return Object.assign(new Error("ENOSPC: no space left on device"), { code: "ENOSPC" });
}

function isGuarded(file: unknown): boolean {
  return failing.dir !== "" && typeof file === "string" && path.dirname(file) === failing.dir;
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
      if (!isGuarded(file)) return actual.writeFile(...args);
      await actual.writeFile(file, half(data), options);
      throw diskFull();
    },
    open: async (...args: Parameters<FsPromises["open"]>) => {
      const handle = await actual.open(...args);
      if (!isGuarded(args[0])) return handle;
      return Object.assign(handle, {
        writeFile: async (data: unknown) => {
          await actual.writeFile(handle, half(data));
          throw diskFull();
        },
      });
    },
  };
});

const { emitSkeleton } = await import("../../../src/core/atdd/scaffold.js");

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-scaffold-publish-"));
});

afterEach(async () => {
  failing.dir = "";
  await rm(root, { recursive: true, force: true });
});

describe("emitSkeleton when the write fails", () => {
  const target: ScaffoldTarget = { id: "BF-0008", kind: "BF" };
  const body = "// QFAI:BF-0008\n\nit('BF-0008', () => {});\n";

  it("leaves nothing at the destination and a retry writes the full skeleton", async () => {
    const dir = path.join(root, "tests", "e2e");
    const dest = path.join(dir, "bf0008.test.ts");
    failing.dir = dir;

    await expect(emitSkeleton(target, dest, body)).rejects.toMatchObject({ code: "ENOSPC" });
    await expect(lstat(dest)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readdir(dir)).toEqual([]);

    failing.dir = "";
    await expect(emitSkeleton(target, dest, body)).resolves.toEqual({
      destPath: dest,
      wrote: true,
    });
    expect(await readFile(dest, "utf8")).toBe(body);
    expect(await readdir(dir)).toEqual(["bf0008.test.ts"]);
  });
});
