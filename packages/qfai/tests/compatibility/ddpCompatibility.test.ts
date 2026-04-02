/**
 * legacy compatibility only
 *
 * Deprecated DDP validation is kept for direct compatibility checks, but it is
 * no longer part of validateProject() production validation.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateLegacyDdpFields } from "../../src/core/validators/legacy/index.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-ddp-legacy-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function seedLegacyDiscussionPack(root: string, contextBody: string): Promise<void> {
  const packDir = path.join(root, ".qfai", "discussion", "discussion-20260216000000000");
  await mkdir(packDir, { recursive: true });
  await writeFile(
    path.join(packDir, "03_Story-Workshop.md"),
    "# 03 Story Workshop\n\n<style>.screen { color: red; }</style>\n",
    "utf-8",
  );
  await writeFile(path.join(packDir, "01_Context.md"), contextBody, "utf-8");
}

function completeLegacyDdp(): string {
  return [
    "# 01 Context",
    "",
    "## Design Direction Pack",
    "",
    "visual_thesis: A bold minimalist interface emphasizing clarity.",
    "content_plan:",
    "  - section: hero",
    "    role: primary attention capture",
    "interaction_thesis:",
    "  - principle: progressive disclosure",
    "anti_goals:",
    "  - pattern: mass-produced card-grid",
    "cta_hierarchy:",
    "  primary: Start Free Trial",
    "  placement: hero section",
    "theme:",
    "  theme: modern minimalist",
    "  mood: confident professional",
    "  taste: clean geometric",
    "  material: glass and steel",
    "  energy: calm focused",
    "  visual_anchor: geometric patterns",
    "",
  ].join("\n");
}

describe("DDP legacy compatibility", () => {
  it("passes when a complete legacy DDP pack is checked directly", async () => {
    const root = await newTempDir();
    await seedLegacyDiscussionPack(root, completeLegacyDdp());

    const issues = await validateLegacyDdpFields(root, defaultConfig);

    expect(issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
  });

  it("emits QFAI-DDP-001 when a required DDP field is empty", async () => {
    const root = await newTempDir();
    await seedLegacyDiscussionPack(
      root,
      completeLegacyDdp().replace(
        "visual_thesis: A bold minimalist interface emphasizing clarity.",
        "visual_thesis:",
      ),
    );

    const issues = await validateLegacyDdpFields(root, defaultConfig);

    expect(issues.some((issue) => issue.code === "QFAI-DDP-001")).toBe(true);
  });

  it("emits QFAI-DDP-010 when a legacy DDP contains a Figma URL", async () => {
    const root = await newTempDir();
    await seedLegacyDiscussionPack(
      root,
      `${completeLegacyDdp()}\nReference: https://www.figma.com/file/example/design\n`,
    );

    const issues = await validateLegacyDdpFields(root, defaultConfig);

    expect(issues.some((issue) => issue.code === "QFAI-DDP-010")).toBe(true);
  });
});
