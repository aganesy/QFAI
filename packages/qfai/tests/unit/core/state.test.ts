/**
 * Unit: `.qfai/state.json` reader/writer. The state file is the single
 * SSOT for ephemeral per-runtime session state; `discussion.currentId`
 * names the active discussion session.
 *
 * Read tolerates a missing file / missing keys / malformed JSON
 * (returns null without throwing). Write creates/merges without
 * clobbering other top-level keys — and REFUSES to merge when the
 * existing document could not be read, because the file has several
 * writers owning disjoint top-level namespaces and a merge onto `{}`
 * would erase the namespaces this writer does not own.
 */
// QFAI:SPEC-0010:TC-0010-0012

import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { recordValidateCycle } from "../../../src/core/atdd/scaffoldEscalation.js";
import {
  QFAI_GITIGNORE_BLOCK,
  QFAI_GITIGNORE_RECOMMENDED_ENTRIES,
} from "../../../src/core/gitignore.js";
import {
  StateUnreadableError,
  readDiscussionCurrentId,
  readStateTolerant,
  updateState,
  writeDiscussionCurrentId,
  writeStateFile,
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

  it("refuses the write when state.json is truncated, keeping the other writer's keys", async () => {
    const abs = path.join(root, ".qfai", "state.json");
    await mkdir(path.dirname(abs), { recursive: true });
    // What an interrupted non-atomic writeFile leaves behind: valid
    // prefix, missing tail. The `atdd` counters are owned by a
    // different writer and must survive.
    const truncated = JSON.stringify(
      {
        discussion: { currentId: "discussion-20260801120000000" },
        atdd: { scaffoldValidateCycles: { "spec-0001:TC-0001-0002": 2 } },
      },
      null,
      2,
    ).slice(0, -6);
    await writeFile(abs, truncated, "utf-8");

    await expect(writeDiscussionCurrentId(root, "discussion-AFTER")).rejects.toBeInstanceOf(
      StateUnreadableError,
    );
    expect(await readFile(abs, "utf-8")).toBe(truncated);
  });

  it("names the state file in the refusal message", async () => {
    const abs = path.join(root, ".qfai", "state.json");
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, "{ not json", "utf-8");
    await expect(writeDiscussionCurrentId(root, "discussion-X")).rejects.toThrow(
      /state\.json exists but could not be read \(invalid JSON\)/u,
    );
  });

  it("refuses the write when state.json is a JSON array, not an object", async () => {
    const abs = path.join(root, ".qfai", "state.json");
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, "[1, 2, 3]", "utf-8");
    await expect(writeDiscussionCurrentId(root, "discussion-X")).rejects.toBeInstanceOf(
      StateUnreadableError,
    );
    expect(await readFile(abs, "utf-8")).toBe("[1, 2, 3]");
  });

  it("the atdd writer refuses too, so the discussion pointer survives", async () => {
    const abs = path.join(root, ".qfai", "state.json");
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, '{ "discussion": { "currentId": "discussion-KEEP" } ', "utf-8");
    await expect(recordValidateCycle(root, "spec-0001", "TC-0001-0002")).rejects.toBeInstanceOf(
      StateUnreadableError,
    );
    expect(await readFile(abs, "utf-8")).toBe(
      '{ "discussion": { "currentId": "discussion-KEEP" } ',
    );
  });

  it("both writers merge into one document when the file is readable", async () => {
    await writeDiscussionCurrentId(root, "discussion-20260101000000000");
    await recordValidateCycle(root, "spec-0001", "TC-0001-0002");
    await writeDiscussionCurrentId(root, "discussion-20260202000000000");
    const raw = JSON.parse(await readFile(path.join(root, ".qfai", "state.json"), "utf-8")) as {
      atdd?: { scaffoldValidateCycles?: Record<string, number> };
      discussion?: { currentId?: string };
    };
    expect(raw.discussion?.currentId).toBe("discussion-20260202000000000");
    expect(raw.atdd?.scaffoldValidateCycles?.["spec-0001:TC-0001-0002"]).toBe(1);
  });

  it("writes atomically and leaves no temp file behind", async () => {
    await writeDiscussionCurrentId(root, "discussion-20260101000000000");
    expect(await readdir(path.join(root, ".qfai"))).toEqual(["state.json"]);
  });

  it("gives every concurrent write in one process its own scratch file", async () => {
    // A single pid-based temp name made all in-flight writes share one
    // path: the first rename moved it away and the rest failed ENOENT.
    await Promise.all([
      writeDiscussionCurrentId(root, "discussion-A"),
      writeDiscussionCurrentId(root, "discussion-B"),
      writeDiscussionCurrentId(root, "discussion-C"),
    ]);
    expect(await readdir(path.join(root, ".qfai"))).toEqual(["state.json"]);
    expect(await readDiscussionCurrentId(root)).toMatch(/^discussion-[ABC]$/u);
  });

  it("keeps a hard-linked state.json on its own inode", async () => {
    const abs = path.join(root, ".qfai", "state.json");
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, `${JSON.stringify({ atdd: { cycles: 1 } })}\n`, "utf-8");
    const shared = path.join(root, "shared-state.json");
    await link(abs, shared);
    const before = await stat(abs);

    // A rename only re-points `.qfai/state.json`; the second name would
    // keep resolving to the pre-write inode, so the two checkouts sharing
    // this state would silently diverge.
    await writeDiscussionCurrentId(root, "discussion-LINKED");

    expect(await readFile(shared, "utf-8")).toBe(await readFile(abs, "utf-8"));
    expect(await readDiscussionCurrentId(root)).toBe("discussion-LINKED");
    expect((await stat(abs)).ino).toBe(before.ino);
    expect(await readdir(path.dirname(abs))).toEqual(["state.json"]);
  });

  it.skipIf(process.platform === "win32")(
    "republishes the document with the permissions it already had",
    async () => {
      const abs = path.join(root, ".qfai", "state.json");
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, `${JSON.stringify({ atdd: { cycles: 1 } })}\n`, "utf-8");
      await chmod(abs, 0o640);

      // The scratch is filled at 0600 so an unrelated group cannot read
      // the state mid-write; the document's own mode has to come back
      // once the owner and group are known to match.
      await writeDiscussionCurrentId(root, "discussion-MODE");

      expect((await lstat(abs)).mode & 0o777).toBe(0o640);
      expect(await readDiscussionCurrentId(root)).toBe("discussion-MODE");
      expect(await readdir(path.dirname(abs))).toEqual(["state.json"]);
    },
  );

  it("removes the scratch file when the write fails", async () => {
    // `.qfai/state.json` as a directory makes the rename fail after the
    // scratch file already exists.
    const abs = path.join(root, ".qfai", "state.json");
    await mkdir(abs, { recursive: true });
    await expect(writeStateFile(root, { discussion: { currentId: "x" } })).rejects.toThrow();
    expect(await readdir(path.join(root, ".qfai"))).toEqual(["state.json"]);
  });

  it.skipIf(process.platform === "win32" || process.geteuid?.() === 0)(
    "refuses to overwrite a read-only state.json",
    async () => {
      const abs = path.join(root, ".qfai", "state.json");
      await mkdir(path.dirname(abs), { recursive: true });
      const original = `${JSON.stringify({ discussion: { currentId: "discussion-LOCKED" } })}\n`;
      await writeFile(abs, original, "utf-8");
      await chmod(abs, 0o444);

      // The direct `writeFile` this replaced failed with EACCES here; a
      // bare rename would have succeeded and reset the mode to 0644.
      await expect(writeDiscussionCurrentId(root, "discussion-NEW")).rejects.toThrow();
      expect(await readFile(abs, "utf-8")).toBe(original);
      expect((await lstat(abs)).mode & 0o777).toBe(0o444);
      expect(await readdir(path.join(root, ".qfai"))).toEqual(["state.json"]);
    },
  );

  it.skipIf(process.platform === "win32" || process.geteuid?.() === 0)(
    "writes through a parent directory that refuses new files",
    async () => {
      const dir = path.join(root, ".qfai");
      const abs = path.join(dir, "state.json");
      await mkdir(dir, { recursive: true });
      await writeFile(abs, `${JSON.stringify({ atdd: { cycles: 1 } })}\n`, "utf-8");
      await chmod(dir, 0o555);
      try {
        // File-update-only permissions: the sibling scratch file cannot
        // be created, but the direct write this replaced worked here and
        // `discussion use` must keep working here.
        await writeStateFile(root, { discussion: { currentId: "discussion-RO-DIR" } });
        expect(await readdir(dir)).toEqual(["state.json"]);
        expect(await readDiscussionCurrentId(root)).toBe("discussion-RO-DIR");
      } finally {
        await chmod(dir, 0o755);
      }
    },
  );

  it.skipIf(process.platform === "win32")(
    "refuses the write when state.json is a dangling symlink",
    async () => {
      const abs = path.join(root, ".qfai", "state.json");
      await mkdir(path.dirname(abs), { recursive: true });
      await symlink(path.join(root, "shared", "state.json"), abs);

      // `readFile` reports a dangling link as ENOENT; treating that as
      // "absent" would replace the link itself with a regular file.
      await expect(writeDiscussionCurrentId(root, "discussion-X")).rejects.toBeInstanceOf(
        StateUnreadableError,
      );
      expect((await lstat(abs)).isSymbolicLink()).toBe(true);
    },
  );

  it.skipIf(process.platform === "win32")(
    "writes through a live symlink instead of replacing it",
    async () => {
      const shared = path.join(root, "shared", "state.json");
      await mkdir(path.dirname(shared), { recursive: true });
      await writeFile(shared, JSON.stringify({ unrelated: { keep: true } }), "utf-8");
      const abs = path.join(root, ".qfai", "state.json");
      await mkdir(path.dirname(abs), { recursive: true });
      await symlink(shared, abs);

      await writeDiscussionCurrentId(root, "discussion-LINKED");

      expect((await lstat(abs)).isSymbolicLink()).toBe(true);
      const raw = JSON.parse(await readFile(shared, "utf-8")) as {
        unrelated?: { keep?: boolean };
        discussion?: { currentId?: string };
      };
      expect(raw.unrelated?.keep).toBe(true);
      expect(raw.discussion?.currentId).toBe("discussion-LINKED");
    },
  );
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

    const state = await readStateTolerant(root);
    expect(state?.counter).toBe(rounds);
  });

  it("does not let a concurrent pointer write clobber another key", async () => {
    await Promise.all([
      bumpCounter(root),
      writeDiscussionCurrentId(root, "discussion-20260101000000000"),
      bumpCounter(root),
    ]);

    const state = await readStateTolerant(root);
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

    const state = await readStateTolerant(realDir);
    expect(state?.counter).toBe(rounds);
  });
});

/**
 * The lock must live where the repository's own permissions decide who may
 * touch it.
 *
 * In the OS temp dir it was created under whichever uid wrote the state first,
 * in a sticky directory: on a machine where several Unix users share a
 * checkout, nobody else could unlink it, so one crash wedged every later
 * update for everyone — whatever the lock's age or its owner's liveness said.
 * Beside `state.json` it inherits exactly the permissions that already decide
 * who may write the state.
 */
describe("TC-0010-0012: where the state lock lives", () => {
  it("puts the lock beside the state file it guards", async () => {
    await updateState(root, (existing) => ({ next: { ...existing, a: 1 }, result: null }));
    // Taken and released, so the path is what the test can assert on.
    const lockPath = path.join(root, ".qfai", "state.json.lock");
    let held: string | null = null;
    await updateState(root, (existing) => {
      held = lockPath;
      return { next: { ...existing, b: 2 }, result: null };
    });
    expect(held).toBe(lockPath);
    // Released, and nothing was left in the OS temp dir under our name.
    await expect(stat(lockPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("takes the lock on a project whose .qfai does not exist yet", async () => {
    const fresh = await mkdtemp(path.join(os.tmpdir(), "qfai-state-fresh-"));
    try {
      await expect(
        updateState(fresh, (existing) => ({ next: { ...existing, n: 1 }, result: 1 })),
      ).resolves.toBe(1);
    } finally {
      await rm(fresh, { recursive: true, force: true });
    }
  });

  it("is ignored by the .gitignore block qfai init writes", () => {
    expect(QFAI_GITIGNORE_BLOCK).toContain(".qfai/state.json.lock");
    // Deliberately not a recommended entry: a project whose `.gitignore`
    // predates the lock must not start failing validation over it.
    expect(QFAI_GITIGNORE_RECOMMENDED_ENTRIES).not.toContain(".qfai/state.json.lock");
  });
});

/**
 * The lock file path `state.ts` derives for `target`. Mirrors
 * `stateLockPath`, which is module-private: a sibling of the state file, so
 * every alias of one project resolves to one lock through the filesystem
 * itself.
 */
async function lockPathFor(target: string): Promise<string> {
  await mkdir(path.join(target, ".qfai"), { recursive: true });
  return path.join(target, ".qfai", "state.json.lock");
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

  it("reaps a lock whose owner is already dead before the stale window opens", async () => {
    // A holder that crashes right after taking the lock leaves a lock
    // younger than LOCK_STALE_MS (10s) but with a dead pid stamped in
    // it. The acquire budget is only LOCK_TIMEOUT_MS (5s), so gating
    // this case on age would fail every run started in that window.
    const lockPath = await plantLock(root, 2_147_483_646, 0);
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
      expect(await readStateTolerant(root)).toBeNull();
    } finally {
      await rm(lockPath, { force: true });
    }
  }, 20_000);
});
