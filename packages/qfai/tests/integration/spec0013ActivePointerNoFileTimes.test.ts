import type * as FsModule from "node:fs";
import type * as FsPromisesModule from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

const metadataReads = vi.hoisted(() => ({ active: false, paths: [] as string[] }));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromisesModule>();
  return {
    ...actual,
    stat: (...args: Parameters<typeof actual.stat>) => {
      if (metadataReads.active) metadataReads.paths.push(String(args[0]));
      return actual.stat(...args);
    },
    lstat: (...args: Parameters<typeof actual.lstat>) => {
      if (metadataReads.active) metadataReads.paths.push(String(args[0]));
      return actual.lstat(...args);
    },
  };
});

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof FsModule>();
  return {
    ...actual,
    statSync: (...args: Parameters<typeof actual.statSync>) => {
      if (metadataReads.active) metadataReads.paths.push(String(args[0]));
      return actual.statSync(...args);
    },
    lstatSync: (...args: Parameters<typeof actual.lstatSync>) => {
      if (metadataReads.active) metadataReads.paths.push(String(args[0]));
      return actual.lstatSync(...args);
    },
  };
});

const { mkdir, mkdtemp, rm } = await import("node:fs/promises");
const { resolveActiveDiscussionPack } = await import("../../src/core/discussionPack.js");
const { writeDiscussionCurrentId } = await import("../../src/core/state.js");

// QFAI:EX-0001-0160-01
describe("TC-0013-0028: active pack resolution does not read file times", () => {
  it("returns the pointed-at older pack without reading file metadata", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0013-pointer-"));
    try {
      const discussionRoot = path.join(root, ".qfai", "discussion");
      const selected = path.join(discussionRoot, "discussion-20260101000000000");
      const newer = path.join(discussionRoot, "discussion-20260202000000000");
      await mkdir(selected, { recursive: true });
      await mkdir(newer, { recursive: true });
      await writeDiscussionCurrentId(root, path.basename(selected));

      metadataReads.paths.length = 0;
      metadataReads.active = true;
      let resolved: string;
      try {
        resolved = await resolveActiveDiscussionPack(root, discussionRoot);
      } finally {
        metadataReads.active = false;
      }

      expect(resolved).toBe(selected);
      expect(metadataReads.paths).toEqual([]);
    } finally {
      metadataReads.active = false;
      await rm(root, { recursive: true, force: true });
    }
  });
});
