/**
 * A scaffold destination that holds a test file the run cannot read is an
 * error, not an existing test.
 *
 * `open` is mocked to refuse reading the destination, because an unreadable
 * file cannot be made portably on every platform the suite runs on. `vi.mock`
 * is hoisted to module scope, so this case lives in its own file.
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const { unreadable } = vi.hoisted(() => ({ unreadable: { path: "" } }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    open: (...args: Parameters<FsPromises["open"]>) => {
      const [file, flags] = args;
      if (file === unreadable.path && (flags === undefined || flags === "r")) {
        return Promise.reject(
          Object.assign(new Error(`EACCES: permission denied, open '${unreadable.path}'`), {
            code: "EACCES",
          }),
        );
      }
      return actual.open(...args);
    },
  };
});

const { emitSkeleton } = await import("../../../src/core/atdd/scaffold.js");

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-scaffold-unreadable-"));
});

afterEach(async () => {
  unreadable.path = "";
  await rm(root, { recursive: true, force: true });
});

describe("emitSkeleton with an existing test it cannot read", () => {
  it("fails rather than reporting the test as kept", async () => {
    const dest = path.join(root, "existing.test.ts");
    await writeFile(dest, "// an existing test\n");
    unreadable.path = dest;

    await expect(
      emitSkeleton({ id: "BF-0008", kind: "BF" }, dest, "// a skeleton\n"),
    ).rejects.toMatchObject({ code: "EACCES" });
  });
});
