/**
 * Tests for `resolveActiveDiscussionPack` — the single helper that
 * downstream `/qfai-sdd` skills use to locate the active discussion
 * pack via `.qfai/state.json#discussion.currentId` (the SSOT written
 * by `/qfai-discussion`).
 *
 * Filesystem mtime inference is forbidden: missing/duplicate
 * `currentId` MUST be surfaced as a recovery error naming each
 * candidate `discussion-*` dir and the literal recovery command
 * `qfai discussion use <id>`.
 */
// QFAI:SPEC-0013:TC-0013-0028
// QFAI:SPEC-0013:TC-0013-0029

import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  resolveActiveDiscussionPack,
  ResolveActiveDiscussionPackError,
} from "../../src/core/discussionPack.js";
import { writeDiscussionCurrentId } from "../../src/core/state.js";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-active-pack-"));
});

afterEach(async () => {
  if (root) {
    await rm(root, { recursive: true, force: true });
  }
});

async function makePack(name: string): Promise<string> {
  const packDir = path.join(root, ".qfai", "discussion", name);
  await mkdir(packDir, { recursive: true });
  return packDir;
}

describe("TC-0013-0028: active pack resolved from state.json#discussion.currentId", () => {
  it("returns the pack path named in state.json when the dir exists", async () => {
    const packName = "discussion-20260527075558258";
    const expected = await makePack(packName);
    await writeDiscussionCurrentId(root, packName);

    const resolved = await resolveActiveDiscussionPack(root);
    expect(resolved).toBe(expected);
  });
});

describe("TC-0013-0029: ambiguous/absent active pointer raises a recovery error", () => {
  it("raises an error naming each candidate dir and the recovery command when currentId is absent", async () => {
    await makePack("discussion-20260101000000000");
    await makePack("discussion-20260202000000000");
    await makePack("discussion-20260303000000000");
    // Note: no writeDiscussionCurrentId — state.json is absent.

    await expect(resolveActiveDiscussionPack(root)).rejects.toThrow(
      ResolveActiveDiscussionPackError,
    );

    try {
      await resolveActiveDiscussionPack(root);
      throw new Error("resolveActiveDiscussionPack should have thrown");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toMatch(/discussion-20260101000000000/);
      expect(message).toMatch(/discussion-20260202000000000/);
      expect(message).toMatch(/discussion-20260303000000000/);
      expect(message).toMatch(/qfai discussion use <id>/);
    }
  });

  it("raises an error when currentId resolves to a missing pack", async () => {
    await makePack("discussion-20260101000000000");
    await writeDiscussionCurrentId(root, "discussion-20260909999999999");

    try {
      await resolveActiveDiscussionPack(root);
      throw new Error("resolveActiveDiscussionPack should have thrown");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toMatch(/discussion-20260909999999999/);
      expect(message).toMatch(/qfai discussion use <id>/);
    }
  });

  it("does NOT use filesystem mtime to infer the active pack (source contains no mtime/statSync calls)", async () => {
    // Strict-source guard: the helper module MUST NOT inspect filesystem
    // mtimes to infer the active pack. We assert this property by
    // reading the production source and grepping for the forbidden
    // tokens. DR-0013-0002 explicitly bans mtime inference.
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(
      path.resolve(__dirname, "..", "..", "src", "core", "discussionPack.ts"),
      "utf-8",
    );
    expect(source).not.toMatch(/\bmtime\b/);
    expect(source).not.toMatch(/\bbirthtime\b/);
    expect(source).not.toMatch(/\bstatSync\b/);
  });
});
