import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../helpers/legacyInit.js";

const OWN_AGENTS = "# Our agents\n\nProject text.\n";

describe("init project boundary", () => {
  // QFAI:AC-0001-0021-03
  // QFAI:EX-0001-0021-14
  it.each([
    [".qfai", /refused to write \.qfai: it is a symbolic link/u],
    [path.join(".qfai", "spec"), /refused to seed the story tree through a symlink/u],
    [
      path.join(".qfai", "spec", "03_contract", "api"),
      /refused to seed the story tree through a symlink/u,
    ],
  ])(
    "refuses a symlink at %s to a directory outside the project before writing any asset",
    async (relative, message) => {
      const sandbox = await mkdtemp(path.join(os.tmpdir(), "qfai-init-boundary-"));
      const root = path.join(sandbox, "project");
      const outside = path.join(sandbox, "outside");
      try {
        await mkdir(outside);
        await mkdir(root);
        await writeFile(path.join(root, "AGENTS.md"), OWN_AGENTS);
        const link = path.join(root, relative);
        await mkdir(path.dirname(link), { recursive: true });
        await symlink(outside, link, process.platform === "win32" ? "junction" : "dir");
        const before = (await readdir(root)).sort();

        await expect(
          runInit({ dir: root, force: false, dryRun: false, yes: true }),
        ).rejects.toThrow(message);

        expect(await readdir(outside)).toEqual([]);
        expect((await readdir(root)).sort()).toEqual(before);
        expect(await readFile(path.join(root, "AGENTS.md"), "utf-8")).toBe(OWN_AGENTS);
      } finally {
        await rm(sandbox, { recursive: true, force: true });
      }
    },
  );

  // QFAI:AC-0001-0021-03
  // QFAI:EX-0001-0021-14
  it.each([
    [".qfai", /refused to write \.qfai: it is not a directory/u],
    [
      path.join(".qfai", "spec", "03_contract", "api"),
      /refused to seed the story tree: \.qfai\/spec\/03_contract\/api is not a directory/u,
    ],
  ])("refuses a %s that is not a directory before writing any asset", async (relative, message) => {
    const sandbox = await mkdtemp(path.join(os.tmpdir(), "qfai-init-boundary-"));
    const root = path.join(sandbox, "project");
    try {
      const file = path.join(root, relative);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, "not a directory\n");

      await expect(runInit({ dir: root, force: true, dryRun: false, yes: true })).rejects.toThrow(
        message,
      );

      expect(await readdir(root)).toEqual([".qfai"]);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });
});
