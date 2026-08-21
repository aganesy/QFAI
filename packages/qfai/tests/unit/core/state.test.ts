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

import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { recordValidateCycle } from "../../../src/core/atdd/scaffoldEscalation.js";
import {
  readDiscussionCurrentId,
  StateUnreadableError,
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
});
