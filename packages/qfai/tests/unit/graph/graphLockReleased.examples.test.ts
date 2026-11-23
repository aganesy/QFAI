/**
 * A graph lock released between a caller's failed exclusive create and its read of the lock is
 * contention, not an abandoned lock. The window is too short to hit with real processes, so the
 * exclusive create is made to fail for a lock file that is not there. `vi.mock` is hoisted to
 * module scope, so this lives apart from `graphLocks.examples.test.ts`.
 */
import type * as fsPromises from "node:fs/promises";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { graphEnvironmentKey } from "../../../src/core/graph/layout.js";

type FsPromises = typeof fsPromises;

const released = vi.hoisted(() => ({ lock: "" }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    open: (...args: Parameters<FsPromises["open"]>) =>
      String(args[0]) === released.lock
        ? Promise.reject(Object.assign(new Error("simulated EEXIST"), { code: "EEXIST" }))
        : actual.open(...args),
  };
});

const { withGraphLock } = await import("../../../src/core/graph/locks.js");

// QFAI:EX-0001-0236-20
// Mutation: packages/qfai/src/core/fs/ownerLock.ts returning false when the lock read finds
// nothing fails this example.
it("tells the caller to retry when the lock is released before it can be read", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-lock-released-"));
  try {
    const directory = path.join(root, ".qfai", "tools", "state", graphEnvironmentKey());
    released.lock = path.join(directory, "analysis.lock");
    const action = vi.fn(() => Promise.resolve("ran"));
    await expect(withGraphLock(root, action)).rejects.toMatchObject({
      message: expect.stringContaining("contended"),
      recovery: expect.stringContaining("Retry"),
    });
    expect(action).not.toHaveBeenCalled();
    expect(await readdir(directory)).toEqual([]);
  } finally {
    released.lock = "";
    await rm(root, { recursive: true, force: true });
  }
});
