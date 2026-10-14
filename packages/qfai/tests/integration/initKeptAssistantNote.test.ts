/**
 * Integration: a plain `qfai init` that writes a new assistant file and keeps a file that differs
 * from this release's copy says so, because `qfai validate` then reports the new file as an
 * unrelated finding while the kept owner does not list or cite it.
 */
import { appendFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { copyTemplateTree } from "../../src/core/fs/templateCopy.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { graphProcessFixture } from "../helpers/graphProcess.js";
import { useTempDirPool } from "../helpers/shippedWorkflowFixtures.js";
import { captureStdout } from "../helpers/stdout.js";

const newTempDir = useTempDirPool("qfai-init-kept-");

async function init(dir: string, force = false, dryRun = false): Promise<string> {
  return captureStdout(() =>
    runInit({ dir, force, dryRun, yes: true }, undefined, graphProcessFixture().run),
  );
}

const assistantFile = (dir: string, ...relative: string[]): string =>
  path.join(dir, ".qfai", "assistant", ...relative);

const EDIT = "\n<!-- earlier -->\n";

/** An earlier release's project: an edited owner, and a file the release adds. */
async function upgradedProject(): Promise<string> {
  const dir = await newTempDir();
  await init(dir);
  await appendFile(assistantFile(dir, "skill", "qfai-sdd", "SKILL.md"), EDIT);
  await rm(assistantFile(dir, "skill", "qfai-sdd", "references", "contract-artifact-rules.md"));
  return dir;
}

describe("a plain init that keeps a differing assistant file", () => {
  // QFAI:AC-0001-0021-02
  // QFAI:EX-0001-0021-12
  it("names the kept owner and the new file count, points at --force and leaves the owner alone", async () => {
    const dir = await upgradedProject();
    const owner = assistantFile(dir, "skill", "qfai-sdd", "SKILL.md");
    const before = await readFile(owner, "utf-8");

    const output = await init(dir);

    expect(output).toContain(
      "Wrote 1 new file under .qfai/assistant and kept 1 file differing from this release's copy.",
    );
    expect(output).toMatch(/until the owner is refreshed: .*qfai-sdd.*SKILL\.md/);
    expect(output).toContain("qfai init --force rewrites all 1 kept file.");
    expect(await readFile(owner, "utf-8")).toBe(before);
  });

  // QFAI:AC-0001-0021-02
  // QFAI:EX-0001-0021-12
  it("names a kept STEP.md as an owner too", async () => {
    const dir = await upgradedProject();
    await appendFile(assistantFile(dir, "step", "common-review-cycle", "STEP.md"), EDIT);

    const output = await init(dir);

    expect(output).toContain("kept 2 files differing from this release's copy.");
    expect(output).toMatch(/common-review-cycle.*STEP\.md/);
  });

  // QFAI:AC-0001-0021-02
  // QFAI:EX-0001-0021-12
  it("names the first eight owners and counts the rest", async () => {
    const dir = await upgradedProject();
    const skills = (
      await readdir(path.join(getInitAssetsDir(), ".qfai", "assistant", "skill"), {
        withFileTypes: true,
      })
    )
      .filter((entry) => entry.isDirectory() && entry.name !== "qfai-sdd")
      .map((entry) => entry.name)
      .slice(0, 9);
    expect(skills).toHaveLength(9);
    for (const skill of skills) {
      await appendFile(assistantFile(dir, "skill", skill, "SKILL.md"), EDIT);
    }

    const output = await init(dir);

    expect(output).toContain("kept 10 files differing from this release's copy.");
    expect(output).toContain(" and 2 more.");
  });

  // QFAI:AC-0001-0021-02
  // QFAI:EX-0001-0021-12
  it("does not count a file whose only difference is its line endings", async () => {
    const dir = await upgradedProject();
    const owner = assistantFile(dir, "skill", "qfai-sdd", "SKILL.md");
    await writeFile(owner, (await readFile(getSdd(), "utf-8")).replace(/\r?\n/g, "\r\n"), "utf-8");

    expect(await init(dir)).not.toContain("differing from this release's copy");
  });

  // QFAI:AC-0001-0021-02
  // QFAI:EX-0001-0021-12
  it("says what a dry run would write", async () => {
    const dir = await upgradedProject();

    const output = await init(dir, false, true);

    expect(output).toContain("Would write 1 new file under .qfai/assistant and kept 1 file");
  });

  // QFAI:AC-0001-0021-02
  // QFAI:EX-0001-0021-12
  it("says nothing with --force, or when nothing new was written, or nothing was kept", async () => {
    const forced = await upgradedProject();
    expect(await init(forced, true)).not.toContain("differing from this release's copy");

    const untouched = await newTempDir();
    await init(untouched);
    expect(await init(untouched)).not.toContain("differing from this release's copy");

    const onlyMissing = await newTempDir();
    await init(onlyMissing);
    await rm(
      assistantFile(onlyMissing, "skill", "qfai-sdd", "references", "contract-artifact-rules.md"),
    );
    expect(await init(onlyMissing)).not.toContain("differing from this release's copy");

    const onlyEdited = await newTempDir();
    await init(onlyEdited);
    await appendFile(assistantFile(onlyEdited, "skill", "qfai-sdd", "SKILL.md"), EDIT);
    expect(await init(onlyEdited)).not.toContain("differing from this release's copy");
  });
});

function getSdd(): string {
  return path.join(getInitAssetsDir(), ".qfai", "assistant", "skill", "qfai-sdd", "SKILL.md");
}

describe("the template copy's exclusions", () => {
  // QFAI:AC-0001-0021-02
  // QFAI:EX-0001-0021-12
  it("match a nested path whatever separator it is spelled with", async () => {
    const source = await newTempDir();
    const dest = await newTempDir();
    await mkdir(path.join(source, "assistant", "skill"), { recursive: true });
    await writeFile(path.join(source, "assistant", "skill", "a.txt"), "a", "utf-8");
    await writeFile(path.join(source, "other.txt"), "o", "utf-8");

    for (const exclude of ["assistant/skill", "assistant\\skill"]) {
      const result = await copyTemplateTree(source, dest, {
        force: false,
        dryRun: true,
        conflictPolicy: "skip",
        exclude: [exclude],
      });
      expect(result.copied.map((file) => path.relative(dest, file))).toEqual(["other.txt"]);
    }
  });
});
