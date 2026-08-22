/**
 * Unit: the state lock reaper only ever deletes the lock file it
 * judged, never a replacement that appeared on the same path.
 *
 * Deletion is by path, so between "this lock is abandoned" and the
 * `rm` another waiter can reap the same lock and take a fresh one.
 * Unlinking then would drop the NEW holder's lock while that holder
 * keeps writing through its unlinked handle — two `updateState` calls
 * inside the critical section at once. The reaper re-reads the file
 * and requires the same identity before unlinking.
 *
 * The replacement is simulated by skewing every SECOND `stat` call:
 * the reaper's decision sees the real file and its verification pass
 * sees a different one, which is exactly the interleaving above.
 *
 * `node:fs/promises` is mocked here rather than in `state.test.ts`
 * because `vi.mock` is file-scoped and the rest of that suite needs
 * the real module.
 */
// QFAI:SPEC-0010:TC-0010-0012

import { createHash } from "node:crypto";
import type * as FsPromises from "node:fs/promises";
import { mkdtemp, readFile, realpath, rm, stat, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readStateObject, updateState } from "../../../src/core/state.js";

const control = vi.hoisted(() => ({ skew: false, calls: 0 }));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  return {
    ...actual,
    stat: async (target: Parameters<typeof actual.stat>[0]) => {
      const info = await actual.stat(target);
      control.calls += 1;
      if (control.skew && control.calls % 2 === 0) {
        // The verification read sees a *different* file than the
        // decision read did.
        info.mtimeMs += 1_000;
        info.ino += 1;
      }
      return info;
    },
  };
});

let root: string;

beforeEach(async () => {
  control.skew = false;
  control.calls = 0;
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-state-reap-"));
});

afterEach(async () => {
  control.skew = false;
  await rm(root, { recursive: true, force: true });
});

/** Mirrors the module-private `stateLockPath`. */
async function lockPathFor(target: string): Promise<string> {
  const resolved = await realpath(target);
  const key = process.platform === "win32" ? resolved.toLowerCase() : resolved;
  const digest = createHash("sha256").update(key).digest("hex").slice(0, 16);
  return path.join(os.tmpdir(), `qfai-state-${digest}.lock`);
}

/** Plant a reapable lock: aged past the stale window, owner pid dead. */
async function plantAbandonedLock(target: string): Promise<string> {
  const lockPath = await lockPathFor(target);
  await writeFile(lockPath, `${JSON.stringify({ pid: 2_147_483_646, token: "planted" })}\n`, {
    encoding: "utf-8",
  });
  const stamp = new Date(Date.now() - 11_000);
  await utimes(lockPath, stamp, stamp);
  return lockPath;
}

async function bumpCounter(target: string): Promise<number> {
  return updateState(target, (existing) => {
    const raw = existing.counter;
    const next = typeof raw === "number" && Number.isInteger(raw) ? raw + 1 : 1;
    return { next: { ...existing, counter: next }, result: next };
  });
}

describe("TC-0010-0012: state lock reaper identity check", () => {
  it("reaps an abandoned lock while its identity is unchanged (control)", async () => {
    const lockPath = await plantAbandonedLock(root);
    try {
      await expect(bumpCounter(root)).resolves.toBe(1);
    } finally {
      await rm(lockPath, { force: true });
    }
  });

  it("leaves the lock alone when it was replaced after the reap decision", async () => {
    const lockPath = await plantAbandonedLock(root);
    control.skew = true;
    try {
      // No unlink, so the acquire loop never gets the path: refusing to
      // write is the safe outcome, and the replacement survives.
      await expect(bumpCounter(root)).rejects.toThrow(/is still held after/);
      control.skew = false;
      await expect(stat(lockPath)).resolves.toBeDefined();
      expect(await readFile(lockPath, "utf-8")).toContain("planted");
      expect(await readStateObject(root)).toBeNull();
    } finally {
      control.skew = false;
      await rm(lockPath, { force: true });
    }
  }, 20_000);
});
