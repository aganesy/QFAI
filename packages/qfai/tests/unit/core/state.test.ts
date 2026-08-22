/**
 * Unit: `.qfai/state.json` reader/writer. The state file is the single
 * SSOT for ephemeral per-runtime session state; `discussion.currentId`
 * names the active discussion session.
 *
 * Read tolerates a missing file / missing keys / malformed JSON
 * (returns null without throwing). Write creates/merges without
 * clobbering other top-level keys.
 */
// QFAI:SPEC-0010:TC-0010-0012

import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  readDiscussionCurrentId,
  readStateObject,
  updateState,
  writeDiscussionCurrentId,
} from "../../../src/core/state.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-state-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("TC-0010-0012: state.json discussion.currentId reader/writer", () => {
  it("returns null when state.json is absent", async () => {
    expect(await readDiscussionCurrentId(root)).toBeNull();
  });

  it("returns null when discussion.currentId key is missing", async () => {
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeFile(path.join(root, ".qfai", "state.json"), JSON.stringify({ other: 1 }), "utf-8");
    expect(await readDiscussionCurrentId(root)).toBeNull();
  });

  it("returns null when state.json is malformed (no throw)", async () => {
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeFile(path.join(root, ".qfai", "state.json"), "{ not json", "utf-8");
    expect(await readDiscussionCurrentId(root)).toBeNull();
  });

  it("write then read round-trips the currentId", async () => {
    await writeDiscussionCurrentId(root, "discussion-20260527075558258");
    expect(await readDiscussionCurrentId(root)).toBe("discussion-20260527075558258");
  });

  it("write preserves unrelated top-level keys", async () => {
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai", "state.json"),
      JSON.stringify({ unrelated: { keep: true } }),
      "utf-8",
    );
    await writeDiscussionCurrentId(root, "discussion-20260101000000000");
    const raw = JSON.parse(await readFile(path.join(root, ".qfai", "state.json"), "utf-8")) as {
      unrelated?: { keep?: boolean };
      discussion?: { currentId?: string };
    };
    expect(raw.unrelated?.keep).toBe(true);
    expect(raw.discussion?.currentId).toBe("discussion-20260101000000000");
  });
});

/** One read-modify-write increment of a `counter` key, via `updateState`. */
async function bumpCounter(target: string): Promise<number> {
  return updateState(target, (existing) => {
    const raw = existing.counter;
    const next = typeof raw === "number" && Number.isInteger(raw) ? raw + 1 : 1;
    return { next: { ...existing, counter: next }, result: next };
  });
}

describe("TC-0010-0012: updateState serializes concurrent read-modify-write", () => {
  it("keeps every increment when 10 updates overlap", async () => {
    const rounds = 10;
    // Without the lock each call reads the same snapshot before any of them
    // writes, so the last write wins and `counter` ends at 1.
    await Promise.all(Array.from({ length: rounds }, () => bumpCounter(root)));

    const state = await readStateObject(root);
    expect(state?.counter).toBe(rounds);
  });

  it("does not let a concurrent pointer write clobber another key", async () => {
    await Promise.all([
      bumpCounter(root),
      writeDiscussionCurrentId(root, "discussion-20260101000000000"),
      bumpCounter(root),
    ]);

    const state = await readStateObject(root);
    expect(state?.counter).toBe(2);
    expect(await readDiscussionCurrentId(root)).toBe("discussion-20260101000000000");
  });

  it("skips the write when the mutation returns next=null", async () => {
    await writeDiscussionCurrentId(root, "discussion-20260101000000000");
    const result = await updateState(root, () => ({ next: null, result: "untouched" }));

    expect(result).toBe("untouched");
    expect(await readDiscussionCurrentId(root)).toBe("discussion-20260101000000000");
  });

  it("takes one lock for a symlinked alias of the same root", async (ctx) => {
    // `path.resolve` does not follow symlinks, so keying the lock on it
    // would give `project/` and `alias/` two different lock names and let
    // both halves of the batch write the same file at the same time.
    const realDir = path.join(root, "project");
    const linkDir = path.join(root, "alias");
    await mkdir(realDir, { recursive: true });
    try {
      await symlink(realDir, linkDir, process.platform === "win32" ? "junction" : "dir");
    } catch {
      // Unprivileged environment (no symlink right): nothing to assert.
      ctx.skip();
      return;
    }

    const rounds = 10;
    const targets: string[] = [];
    for (let index = 0; index < rounds; index += 1) {
      targets.push(index % 2 === 0 ? realDir : linkDir);
    }
    await Promise.all(targets.map((target) => bumpCounter(target)));

    const state = await readStateObject(realDir);
    expect(state?.counter).toBe(rounds);
  });
});

/**
 * The lock file path `state.ts` derives for `target`. Mirrors
 * `stateLockPath`, which is module-private: sha256 of the
 * symlink-resolved root, lowercased on case-insensitive Windows.
 */
async function lockPathFor(target: string): Promise<string> {
  const resolved = await realpath(target);
  const key = process.platform === "win32" ? resolved.toLowerCase() : resolved;
  const digest = createHash("sha256").update(key).digest("hex").slice(0, 16);
  return path.join(os.tmpdir(), `qfai-state-${digest}.lock`);
}

/** Plant a lock file with a chosen owner stamp and mtime age. */
async function plantLock(target: string, pid: number, ageMs: number): Promise<string> {
  const lockPath = await lockPathFor(target);
  await writeFile(lockPath, `${JSON.stringify({ pid, token: "planted" })}\n`, "utf-8");
  const stamp = new Date(Date.now() - ageMs);
  await utimes(lockPath, stamp, stamp);
  return lockPath;
}

describe("TC-0010-0012: updateState lock ownership", () => {
  it("reaps a stale lock whose owner process is gone", async () => {
    // Past LOCK_STALE_MS (10s) and the pid is not running: safe to reap.
    const lockPath = await plantLock(root, 2_147_483_646, 11_000);
    try {
      await expect(bumpCounter(root)).resolves.toBe(1);
    } finally {
      await rm(lockPath, { force: true });
    }
  });

  it("reaps a lock abandoned past the backstop even when its pid is live", async () => {
    // Past LOCK_ABANDON_MS (60s): a pid this old is either recycled or
    // ours and leaked, so the mtime backstop takes over.
    const lockPath = await plantLock(root, process.pid, 61_000);
    try {
      await expect(bumpCounter(root)).resolves.toBe(1);
    } finally {
      await rm(lockPath, { force: true });
    }
  });

  it("refuses to write unlocked when a live owner still holds the lock", async () => {
    // Aged past LOCK_STALE_MS but the owner pid (this process) is
    // alive, so the lock is NOT stale: an old mtime alone must not
    // evict a holder that is merely slow. The wait budget then expires
    // and the write is refused rather than done unlocked.
    const lockPath = await plantLock(root, process.pid, 30_000);
    try {
      await expect(bumpCounter(root)).rejects.toThrow(/is still held after/);
      expect(await readStateObject(root)).toBeNull();
    } finally {
      await rm(lockPath, { force: true });
    }
  }, 20_000);
});
