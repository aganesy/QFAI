/**
 * The `prototyping.execution.browserTool` config field accepts `"playwright"`.
 *
 * Integration scope: config loader.
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../../../src/core/config.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-browsertool-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function writeConfigWithBrowserTool(root: string, browserTool: string): Promise<void> {
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      "  specsDir: .qfai/specs",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/out",
      "  skillsDir: .qfai/assistant/skills",
      "  promptsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "validation:",
      "  failOn: error",
      "prototyping:",
      "  execution:",
      `    browserTool: ${browserTool}`,
    ].join("\n"),
    "utf-8",
  );
}

// QFAI:EX-0001-0129-01
describe("browserTool config — `playwright` primary path", () => {
  it("accepts browserTool: playwright with no issues raised", async () => {
    const root = await newTempDir();
    await writeConfigWithBrowserTool(root, "playwright");
    const { config, issues } = await loadConfig(root);
    expect(config.prototyping?.execution?.browserTool).toBe("playwright");
    // Should not generate any config issue for the primary value.
    expect(issues.filter((i) => /browserTool/.test(i.message))).toEqual([]);
  });
});
