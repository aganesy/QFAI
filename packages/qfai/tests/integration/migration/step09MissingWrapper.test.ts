import { lstat, mkdtemp, readFile, readlink, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit, SKILL_INTEGRATION_DIRS } from "../../../src/cli/commands/init.js";
import {
  executePlannedStep,
  type MigrationContext,
} from "../../../src/migration/specToStory/harness.js";
import { step09 } from "../../../src/migration/specToStory/step09RepointLinks.js";

describe("migration link repair after interruption", () => {
  it("recreates a missing wrapper on the next run and leaves local skill content alone", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "qfai-migration-link-retry-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const wrapper = path.join(root, ".claude", "skills", "qfai-atdd");
      const skill = path.join(root, ".qfai", "assistant", "skill", "qfai-atdd", "SKILL.md");
      expect((await lstat(wrapper)).isSymbolicLink()).toBe(true);
      await writeFile(skill, "# local skill edit\n", "utf8");
      await rm(wrapper);

      const context: MigrationContext = {
        root,
        specsDir: path.join(root, ".qfai", "spec"),
        contractsDir: path.join(root, ".qfai", "spec", "03_contract"),
        config: {} as MigrationContext["config"],
      };
      let report = "";
      const io = {
        stdout: { write: (value: string) => (report += value) },
        stderr: {
          write: (value: string) => {
            throw new Error(value);
          },
        },
      };
      expect(await executePlannedStep(step09, context, false, io)).toBe(0);
      expect(report).toContain(".claude/skills/qfai-atdd: repoint host integration link");
      expect((await lstat(wrapper)).isSymbolicLink()).toBe(true);
      expect(path.normalize(await readlink(wrapper))).toContain(
        path.join(".qfai", "assistant", "skill", "qfai-atdd"),
      );
      expect(await readFile(skill, "utf8")).toBe("# local skill edit\n");

      report = "";
      expect(await executePlannedStep(step09, context, false, io)).toBe(0);
      expect(report).toContain("## Operations\nnone");
      expect(await readFile(skill, "utf8")).toBe("# local skill edit\n");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports a missing canonical skill without creating dangling wrappers", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "qfai-migration-link-retry-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const wrappers = SKILL_INTEGRATION_DIRS.map((directory) =>
        path.join(root, directory, "qfai-atdd"),
      );
      for (const wrapper of wrappers) await rm(wrapper);
      await rm(path.join(root, ".qfai", "assistant", "skill", "qfai-atdd"), {
        recursive: true,
      });

      const context: MigrationContext = {
        root,
        specsDir: path.join(root, ".qfai", "spec"),
        contractsDir: path.join(root, ".qfai", "spec", "03_contract"),
        config: {} as MigrationContext["config"],
      };
      let report = "";
      const io = {
        stdout: { write: (value: string) => (report += value) },
        stderr: {
          write: (value: string) => {
            throw new Error(value);
          },
        },
      };
      expect(await executePlannedStep(step09, context, true, io)).toBe(3);
      expect(report).toContain("## For a person");
      expect(report).toContain("canonical source is missing");
      expect(report).toContain(".claude/skills/qfai-atdd");
      for (const wrapper of wrappers) {
        await expect(lstat(wrapper)).rejects.toMatchObject({ code: "ENOENT" });
      }

      report = "";
      expect(await executePlannedStep(step09, context, false, io)).toBe(3);
      expect(report).toContain("canonical source is missing");
      for (const wrapper of wrappers) {
        await expect(lstat(wrapper)).rejects.toMatchObject({ code: "ENOENT" });
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
