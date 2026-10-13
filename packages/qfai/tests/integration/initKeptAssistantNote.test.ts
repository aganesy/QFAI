/**
 * Integration: a plain `qfai init` that writes a new assistant file and keeps a file that differs
 * from this release's copy says so, because `qfai validate` then reports the new file as an
 * unrelated finding while the kept owner does not list or cite it.
 */
import { appendFile, rm } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { useTempDirPool } from "../helpers/shippedWorkflowFixtures.js";
import { captureStdout } from "../helpers/stdout.js";

const newTempDir = useTempDirPool("qfai-init-kept-");

async function init(dir: string, force = false, dryRun = false): Promise<string> {
  return captureStdout(() => runInit({ dir, force, dryRun, yes: true }));
}

const assistantFile = (dir: string, ...relative: string[]): string =>
  path.join(dir, ".qfai", "assistant", ...relative);

/** An earlier release's project: an edited owner, and a file the release adds. */
async function upgradedProject(): Promise<string> {
  const dir = await newTempDir();
  await init(dir);
  await appendFile(assistantFile(dir, "skill", "qfai-sdd", "SKILL.md"), "\n<!-- earlier -->\n");
  await rm(assistantFile(dir, "skill", "qfai-sdd", "references", "contract-artifact-rules.md"));
  return dir;
}

describe("a plain init that keeps a differing assistant file", () => {
  // QFAI:AC-0001-0021-02
  // QFAI:EX-0001-0021-12
  it("names the kept owner and the new file count, and points at --force", async () => {
    const dir = await upgradedProject();

    const output = await init(dir);

    expect(output).toContain(
      "Wrote 1 new file under .qfai/assistant and kept 1 file differing from this release's copy.",
    );
    expect(output).toMatch(/until the owner is refreshed: .*qfai-sdd.*SKILL\.md/);
    expect(output).toContain("qfai init --force rewrites all 1 kept file.");
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
    await appendFile(
      assistantFile(onlyEdited, "skill", "qfai-sdd", "SKILL.md"),
      "\n<!-- earlier -->\n",
    );
    expect(await init(onlyEdited)).not.toContain("differing from this release's copy");
  });
});
