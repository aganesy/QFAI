/**
 * Integration: `qfai init` checks `.qfai` itself before its first write, so a project whose
 * `.qfai` is a symbolic link is refused with nothing written, inside or outside. Any link at
 * `.qfai` is refused: one out of the project, a dangling one and one that resolves inside it.
 */
import { mkdir, readdir, readFile, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { graphProcessFixture } from "../helpers/graphProcess.js";
import { useTempDirPool } from "../helpers/shippedWorkflowFixtures.js";

const newTempDir = useTempDirPool("qfai-init-boundary-");

const OWN_AGENTS = "# Our agents\n\nProject text.\n";

const LINK_TYPE = process.platform === "win32" ? "junction" : "dir";

describe("qfai init stops at the project boundary", () => {
  // QFAI:AC-0001-0021-03
  it.each([false, true])(
    "refuses a .qfai linked outside the project before writing anything (force=%s)",
    async (force) => {
      const sandbox = await newTempDir();
      const root = path.join(sandbox, "project");
      const outside = path.join(sandbox, "outside");
      await mkdir(outside);
      await mkdir(root);
      await writeFile(path.join(root, "AGENTS.md"), OWN_AGENTS);
      await symlink(outside, path.join(root, ".qfai"), LINK_TYPE);

      await expect(
        runInit(
          { dir: root, force, dryRun: false, yes: true },
          undefined,
          graphProcessFixture().run,
        ),
      ).rejects.toThrow(/refused to write \.qfai: it is a symbolic link/u);

      expect(await readdir(outside)).toEqual([]);
      expect((await readdir(root)).sort()).toEqual([".qfai", "AGENTS.md"]);
      expect(await readFile(path.join(root, "AGENTS.md"), "utf-8")).toBe(OWN_AGENTS);
    },
  );

  // QFAI:AC-0001-0021-03
  it.each([false, true])(
    "refuses a dangling .qfai link before writing anything (force=%s)",
    async (force) => {
      const sandbox = await newTempDir();
      const root = path.join(sandbox, "project");
      await mkdir(root);
      await writeFile(path.join(root, "AGENTS.md"), OWN_AGENTS);
      await symlink(path.join(sandbox, "missing"), path.join(root, ".qfai"), LINK_TYPE);

      await expect(
        runInit(
          { dir: root, force, dryRun: false, yes: true },
          undefined,
          graphProcessFixture().run,
        ),
      ).rejects.toThrow(/refused to write \.qfai: it is a symbolic link/u);

      expect((await readdir(sandbox)).sort()).toEqual(["project"]);
      expect((await readdir(root)).sort()).toEqual([".qfai", "AGENTS.md"]);
      expect(await readFile(path.join(root, "AGENTS.md"), "utf-8")).toBe(OWN_AGENTS);
    },
  );

  // QFAI:AC-0001-0021-03
  it("refuses a .qfai link that resolves inside the project before writing anything", async () => {
    const sandbox = await newTempDir();
    const root = path.join(sandbox, "project");
    const inside = path.join(root, "qfai-real");
    await mkdir(inside, { recursive: true });
    await writeFile(path.join(root, "AGENTS.md"), OWN_AGENTS);
    await symlink(inside, path.join(root, ".qfai"), LINK_TYPE);

    await expect(
      runInit(
        { dir: root, force: false, dryRun: false, yes: true },
        undefined,
        graphProcessFixture().run,
      ),
    ).rejects.toThrow(/refused to write \.qfai: it is a symbolic link/u);

    expect(await readdir(inside)).toEqual([]);
    expect((await readdir(root)).sort()).toEqual([".qfai", "AGENTS.md", "qfai-real"]);
    expect(await readFile(path.join(root, "AGENTS.md"), "utf-8")).toBe(OWN_AGENTS);
  });
});
