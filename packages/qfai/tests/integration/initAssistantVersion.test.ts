/**
 * Integration: `qfai init` records the release that wrote `.qfai/assistant/` in
 * `.qfai/assistant/VERSION`, on the terms of the shipped assistant files: written where absent,
 * kept by a plain run and rewritten under `--force`.
 */
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { resolveToolVersion } from "../../src/core/version.js";
import { graphProcessFixture } from "../helpers/graphProcess.js";
import { useTempDirPool } from "../helpers/shippedWorkflowFixtures.js";
import { captureStdout } from "../helpers/stdout.js";

const newTempDir = useTempDirPool("qfai-init-version-");

async function init(dir: string, force = false, dryRun = false): Promise<string> {
  return captureStdout(() =>
    runInit({ dir, force, dryRun, yes: true }, undefined, graphProcessFixture().run),
  );
}

const versionFile = (dir: string): string => path.join(dir, ".qfai", "assistant", "VERSION");

describe("qfai init records the release that wrote the assistant tree", () => {
  // QFAI:AC-0001-0021-01
  // QFAI:EX-0001-0021-13
  it("writes the running version on a fresh run, keeps another on a plain run and rewrites it under --force", async () => {
    const dir = await newTempDir();
    const running = await resolveToolVersion();

    await init(dir);
    expect(await readFile(versionFile(dir), "utf-8")).toBe(`${running}\n`);

    await writeFile(versionFile(dir), "0.0.1\n", "utf-8");
    await init(dir);
    expect(await readFile(versionFile(dir), "utf-8")).toBe("0.0.1\n");

    await init(dir, true);
    expect(await readFile(versionFile(dir), "utf-8")).toBe(`${running}\n`);
  });

  // QFAI:AC-0001-0021-01
  // QFAI:EX-0001-0021-13
  it("writes a missing version file on a plain run and writes nothing on a dry run", async () => {
    const dir = await newTempDir();
    const running = await resolveToolVersion();

    await init(dir);
    await rm(versionFile(dir));
    await init(dir, false, true);
    await expect(readFile(versionFile(dir), "utf-8")).rejects.toMatchObject({ code: "ENOENT" });

    await init(dir);
    expect(await readFile(versionFile(dir), "utf-8")).toBe(`${running}\n`);
  });
});
