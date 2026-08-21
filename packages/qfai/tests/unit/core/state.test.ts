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

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

describe("TC-0010-0012: updateState serializes concurrent read-modify-write", () => {
  async function bumpCounter(target: string): Promise<number> {
    return updateState(target, (existing) => {
      const raw = existing.counter;
      const next = typeof raw === "number" && Number.isInteger(raw) ? raw + 1 : 1;
      return { next: { ...existing, counter: next }, result: next };
    });
  }

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
});
