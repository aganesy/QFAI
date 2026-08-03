/**
 * `browserTool` config accepts `"playwright"` + `"playwright-cli"`.
 *
 * Past its sunset the `prototyping.execution.browserTool` config field
 * accepts one value:
 *   - `"playwright"` (primary): loads, no `D-DEPRECATED-PROBE` finding.
 *   - `"playwright-cli"`: refused by the loader, which falls back to the
 *     `playwright` default; the doctor probe reports `D-DEPRECATED-PROBE`
 *     at `error` with the `sunset: 1.10.0` substring on its message.
 *
 * Integration scope: config loader + probe-order pin. The window-side
 * behaviour is a unit concern now — see `tests/core/sunsetEnforcement`.
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
  it("refuses browserTool: playwright-cli past its sunset", async () => {
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
