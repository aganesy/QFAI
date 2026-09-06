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

import type * as FsPromises from "node:fs/promises";
import { mkdir, mkdtemp, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readStateTolerant, updateState } from "../../../src/core/state.js";

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

/** Mirrors the module-private `stateLockPath`: a sibling of the state file. */
async function lockPathFor(target: string): Promise<string> {
  await mkdir(path.join(target, ".qfai"), { recursive: true });
  return path.join(target, ".qfai", "state.json.lock");
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
      expect(await readStateTolerant(root)).toBeNull();
    } finally {
      control.skew = false;
      await rm(lockPath, { force: true });
    }
  }, 20_000);
});

/**
 * Two reapers cannot run at once, and a holder that lost its lock anyway
 * writes nothing.
 *
 * Serializing the reapers closes the window the identity check above cannot:
 * `stat` then `rm` are two operations, so between one reaper's check and its
 * unlink a second reaper could delete the lock, take a fresh one, and have the
 * first delete *that*. The reap lock makes at most one reaper at a time.
 *
 * What no arrangement of checks can rule out is the `LOCK_ABANDON_MS`
 * backstop taking a lock away from a holder that is still alive — a recycled
 * pid looks exactly like the process that stamped it. So the holder re-checks
 * the lock immediately before it writes, and a holder whose lock is gone
 * fails instead of writing a stale snapshot over a newer one.
 */
describe("TC-0010-0012: the reaper is serialized and the write is revalidated", () => {
  it("lets only one reaper at a time onto the lock", async () => {
    const lockPath = await plantAbandonedLock(root);
    // A reap lock somebody else holds: this run must not reap, and must not
    // remove a staging file that is not its own.
    const reapPath = `${lockPath}.reap`;
    await writeFile(reapPath, "", "utf-8");
    try {
      await expect(bumpCounter(root)).rejects.toThrow(/is still held after/);
      // Untouched: the abandoned lock was not reaped behind the other reaper.
      expect(await readFile(lockPath, "utf-8")).toContain("planted");
      await expect(stat(reapPath)).resolves.toBeDefined();
    } finally {
      await rm(reapPath, { force: true });
      await rm(lockPath, { force: true });
    }
  }, 20_000);

  it("clears its own reap lock so the next run can reap", async () => {
    const lockPath = await plantAbandonedLock(root);
    try {
      await expect(bumpCounter(root)).resolves.toBe(1);
      await expect(stat(`${lockPath}.reap`)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(lockPath, { force: true });
    }
  });

  it("refuses to write when the lock it holds was taken over", async () => {
    // The holder's lock is replaced while its mutation runs, which is what a
    // wrong reap looks like from the inside.
    const lockPath = await lockPathFor(root);
    await expect(
      updateState(root, (existing) => {
        void writeFile(lockPath, `${JSON.stringify({ pid: 1, token: "someone-else" })}\n`, "utf-8");
        return { next: { ...existing, counter: 1 }, result: 1 };
      }),
    ).rejects.toThrow(/was taken over while this update ran/);

    // Nothing was written from the snapshot the mutation had.
    expect(await readStateTolerant(root)).toBeNull();
    await rm(lockPath, { force: true });
  });
});
