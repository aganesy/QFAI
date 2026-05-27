/**
 * `browserTool` config accepts `"playwright"` + `"playwright-cli"`.
 *
 * During the deprecation window the `prototyping.execution.browserTool`
 * config field MUST accept both values:
 *   - `"playwright"` (primary): no `D-DEPRECATED-PROBE` warning.
 *   - `"playwright-cli"` (deprecated): accepted, but the doctor probe
 *     surfaces `D-DEPRECATED-PROBE` (severity warning) with the
 *     `sunset: 1.10.0` substring on its message.
 *
 * Integration scope: config loader + probe-order pin. Sunset behaviour
 * (rejection at qfai 1.10.0) is out of scope here.
 */

// QFAI:SPEC-0012:TC-0012-0439

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
      "  require:",
      "    specSections: []",
      "prototyping:",
      "  execution:",
      `    browserTool: ${browserTool}`,
    ].join("\n"),
    "utf-8",
  );
}

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

describe("browserTool config — `playwright-cli` deprecation-window path", () => {
  it("accepts browserTool: playwright-cli during the deprecation window", async () => {
    const root = await newTempDir();
    await writeConfigWithBrowserTool(root, "playwright-cli");
    const { config, issues } = await loadConfig(root);
    expect(config.prototyping?.execution?.browserTool).toBe("playwright-cli");
    // Loader does not raise an error; doctor probe surfaces
    // D-DEPRECATED-PROBE separately. Loader's own surface should
    // remain silent on the accepted-but-deprecated value (deprecation
    // emit lives on the doctor side, per playwrightLauncher.ts).
    expect(issues.filter((i) => i.severity === "error" && /browserTool/.test(i.message))).toEqual(
      [],
    );
  });
});
