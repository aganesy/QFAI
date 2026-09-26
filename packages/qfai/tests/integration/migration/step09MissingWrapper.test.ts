import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit, SKILL_INTEGRATION_DIRS } from "../../../src/cli/commands/init.js";
import {
  executePlannedStep,
  type MigrationContext,
} from "../../../src/migration/specToStory/harness.js";
import { step09 } from "../../../src/migration/specToStory/step09RepointLinks.js";

const PLURAL_TARGET = path.join("..", "..", ".qfai", "assistant", "skills", "qfai-atdd");

function contextFor(root: string): MigrationContext {
  return {
    root,
    specsDir: path.join(root, ".qfai", "spec"),
    contractsDir: path.join(root, ".qfai", "spec", "03_contract"),
    config: {} as MigrationContext["config"],
  };
}

function reportingIo(): { io: Parameters<typeof executePlannedStep>[3]; text: () => string } {
  let report = "";
  return {
    io: {
      stdout: { write: (value: string) => (report += value) },
      stderr: {
        write: (value: string) => {
          throw new Error(value);
        },
      },
    },
    text: () => report,
  };
}

async function withInitializedProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), "qfai-migration-link-retry-"));
  try {
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("migration link repair after interruption", () => {
  it("restores a wrapper its interrupted repoint emptied and leaves local skill content alone", async () => {
    await withInitializedProject(async (root) => {
      const wrapper = path.join(root, ".claude", "skills", "qfai-atdd");
      const skill = path.join(root, ".qfai", "assistant", "skill", "qfai-atdd", "SKILL.md");
      expect((await lstat(wrapper)).isSymbolicLink()).toBe(true);
      await writeFile(skill, "# local skill edit\n", "utf8");
      // The state a repoint leaves when it stops after moving the plural link
      // into its hold and before writing the replacement.
      await rm(wrapper);
      const hold = `${wrapper}.qfai-repair-4242`;
      await mkdir(hold);
      await symlink(PLURAL_TARGET, path.join(hold, "qfai-atdd"), "dir");

      const first = reportingIo();
      expect(await executePlannedStep(step09, contextFor(root), false, first.io)).toBe(0);
      expect(first.text()).toContain(".claude/skills/qfai-atdd: repoint host integration link");
      expect(path.normalize(await readlink(wrapper))).toContain(
        path.join(".qfai", "assistant", "skill", "qfai-atdd"),
      );
      await expect(lstat(hold)).rejects.toMatchObject({ code: "ENOENT" });
      expect(await readFile(skill, "utf8")).toBe("# local skill edit\n");

      const second = reportingIo();
      expect(await executePlannedStep(step09, contextFor(root), false, second.io)).toBe(0);
      expect(second.text()).toContain("## Operations\nnone");
      expect(await readFile(skill, "utf8")).toBe("# local skill edit\n");
    });
  });

  it("leaves a wrapper the project removed absent", async () => {
    await withInitializedProject(async (root) => {
      const wrapper = path.join(root, ".claude", "skills", "qfai-atdd");
      await rm(wrapper);

      const run = reportingIo();
      expect(await executePlannedStep(step09, contextFor(root), false, run.io)).toBe(0);
      expect(run.text()).toContain("## Operations\nnone");
      expect(run.text()).toContain("## For a person\nnone");
      await expect(lstat(wrapper)).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

  it("reports a plural link whose canonical skill is missing without repointing it", async () => {
    await withInitializedProject(async (root) => {
      const wrappers = SKILL_INTEGRATION_DIRS.map((directory) =>
        path.join(root, directory, "qfai-atdd"),
      );
      for (const wrapper of wrappers) {
        await rm(wrapper);
        const target = path.relative(
          path.dirname(wrapper),
          path.join(root, ".qfai", "assistant", "skills", "qfai-atdd"),
        );
        await symlink(target, wrapper, "dir");
      }
      await rm(path.join(root, ".qfai", "assistant", "skill", "qfai-atdd"), {
        recursive: true,
      });
      const before = await Promise.all(wrappers.map((wrapper) => readlink(wrapper)));

      const preview = reportingIo();
      expect(await executePlannedStep(step09, contextFor(root), true, preview.io)).toBe(3);
      expect(preview.text()).toContain("## For a person");
      expect(preview.text()).toContain("canonical source is missing");
      expect(preview.text()).toContain(".claude/skills/qfai-atdd");

      const live = reportingIo();
      expect(await executePlannedStep(step09, contextFor(root), false, live.io)).toBe(3);
      expect(live.text()).toContain("canonical source is missing");
      expect(await Promise.all(wrappers.map((wrapper) => readlink(wrapper)))).toEqual(before);
    });
  });
});
