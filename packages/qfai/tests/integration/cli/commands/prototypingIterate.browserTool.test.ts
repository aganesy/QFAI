/**
 * The `prototyping.execution.browserTool` config field accepts one value:
 *   - `"playwright"`: loads with no configuration issue.
 *   - `"playwright-cli"`: refused by the loader, which keeps the `playwright`
 *     default and raises one configuration issue naming the value.
 *
 * Integration scope: config loader and the shipped default.
 */

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../../../src/core/config.js";
import { getInitAssetsDir } from "../../../../src/shared/assets.js";

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

// QFAI:AC-0001-0129-01
describe("browserTool config — `playwright` path", () => {
  it("accepts browserTool: playwright with no issues raised", async () => {
    const root = await newTempDir();
    await writeConfigWithBrowserTool(root, "playwright");
    const { config, issues } = await loadConfig(root);
    expect(config.prototyping?.execution?.browserTool).toBe("playwright");
    // Should not generate any config issue for the supported value.
    expect(issues.filter((i) => /browserTool/.test(i.message))).toEqual([]);
  });

  it("ships playwright as the default", async () => {
    const shipped = await readFile(
      path.join(getInitAssetsDir(), "root", "qfai.config.yaml"),
      "utf-8",
    );
    expect(shipped).toMatch(/^ {4}browserTool: playwright$/m);
  });
});

// QFAI:EX-0001-0129-01
describe("browserTool config — `playwright-cli` path", () => {
  it("refuses browserTool: playwright-cli", async () => {
    const root = await newTempDir();
    await writeConfigWithBrowserTool(root, "playwright-cli");
    const { config, issues } = await loadConfig(root);
    // Refused past the sunset; the supported default stands in so a run that
    // ignores the issue does not proceed against a launcher qfai dropped.
    expect(config.prototyping?.execution?.browserTool).toBe("playwright");
    const raised = issues.filter((i) => /browserTool/.test(i.message));
    expect(raised).toHaveLength(1);
    expect(raised[0]?.message).toContain("playwright-cli");
  });
});
