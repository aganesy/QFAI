import type * as FsPromises from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { collectFiles } from "../../src/core/fs.js";

// The root's access check is made to fail with `EACCES`, as it does for a root
// behind a parent this process may not traverse. Mocked rather than produced
// with `chmod`, so the case also runs on Windows and as root, where a mode bit
// does not stop the check.
const deniedRoots = new Set<string>();

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof FsPromises>("node:fs/promises");
  return {
    ...actual,
    access: async (target: Parameters<typeof actual.access>[0], mode?: number) => {
      if (typeof target === "string" && deniedRoots.has(target)) {
        throw Object.assign(new Error(`EACCES: permission denied, access '${target}'`), {
          code: "EACCES",
        });
      }
      return actual.access(target, mode);
    },
  };
});

describe("collectFiles on a root it cannot check", () => {
  let base = "";

  beforeEach(async () => {
    base = await mkdtemp(path.join(os.tmpdir(), "qfai-collect-root-"));
  });

  afterEach(async () => {
    deniedRoots.clear();
    await rm(base, { recursive: true, force: true });
  });

  it("returns nothing for a root that does not exist", async () => {
    await expect(collectFiles(path.join(base, "missing"))).resolves.toEqual([]);
  });

  it("rejects with the error when no policy is given, rather than scanning nothing", async () => {
    const root = path.join(base, "locked", "specs");
    deniedRoots.add(root);
    await expect(collectFiles(root)).rejects.toMatchObject({ code: "EACCES" });
  });

  it("hands the root and its error to onUnreadableDirectory", async () => {
    const root = path.join(base, "locked", "specs");
    deniedRoots.add(root);
    const unreadable: Array<{ directory: string; code: unknown }> = [];
    const files = await collectFiles(root, {
      onUnreadableDirectory: (directory, error) => {
        unreadable.push({
          directory,
          code: error instanceof Error && "code" in error ? error.code : undefined,
        });
      },
    });
    expect(files).toEqual([]);
    expect(unreadable).toEqual([{ directory: root, code: "EACCES" }]);
  });
});
