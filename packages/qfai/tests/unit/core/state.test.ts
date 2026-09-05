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
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { recordValidateCycle } from "../../../src/core/atdd/scaffoldEscalation.js";
import {
  readDiscussionCurrentId,
  StateUnreadableError,
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
