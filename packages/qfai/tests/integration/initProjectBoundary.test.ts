/**
 * Integration: `qfai init` checks `.qfai` itself before its first write, so a project whose
 * `.qfai` is a symbolic link out of it is refused with nothing written, inside or outside.
 */
import { mkdir, readdir, readFile, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { graphProcessFixture } from "../helpers/graphProcess.js";
import { useTempDirPool } from "../helpers/shippedWorkflowFixtures.js";

const newTempDir = useTempDirPool("qfai-init-boundary-");

const OWN_AGENTS = "# Our agents\n\nProject text.\n";

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
      await symlink(
        outside,
        path.join(root, ".qfai"),
        process.platform === "win32" ? "junction" : "dir",
      );

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
});
