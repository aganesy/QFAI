import { mkdir, mkdtemp, readdir, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../../src/cli/commands/init.js";

// QFAI:BF-0001
describe("init story-tree seed destination", () => {
  it.each(["spec", "spec/03_contract/api"])(
    "refuses an existing symlink at .qfai/%s without writing outside the project",
    async (relative) => {
      const sandbox = await mkdtemp(path.join(os.tmpdir(), "qfai-init-story-seed-"));
      const root = path.join(sandbox, "project");
      const outside = path.join(sandbox, "outside");
      try {
        await mkdir(outside);
        const link = path.join(root, ".qfai", relative);
        await mkdir(path.dirname(link), { recursive: true });
        await symlink(outside, link, process.platform === "win32" ? "junction" : "dir");

        await expect(
          runInit({ dir: root, force: false, dryRun: false, yes: true }),
        ).rejects.toThrow(/refused to seed the story tree through a symlink/u);
        expect(await readdir(outside)).toEqual([]);
      } finally {
        await rm(sandbox, { recursive: true, force: true });
      }
    },
  );
});
