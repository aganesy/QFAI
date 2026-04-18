import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../../src/core/config.js";
import { validateDesignSystemPresence } from "../../../src/core/validators/uix/designSystemPresence.js";

const tempDirs: string[] = [];
const defaultConfig = {} as QfaiConfig;

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-design-system-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      // Ensure any chmod'd files are restored to allow removal
      try {
        await chmod(path.join(dir, "uiux", "12_design_system.md"), 0o644);
      } catch {
        // ignore
      }
      await rm(dir, { recursive: true, force: true });
    }
  }
});

function completeContext(): string {
  return [
    "# Context",
    "",
    "## UI-bearing Classification",
    "",
    "- ui_bearing: true",
    "- primary_surface: web",
    "- secondary_surfaces:",
    "  - mobile",
    "- classification_rationale: Primary workflow is screen-based.",
  ].join("\n");
}

function nonUiContext(): string {
  return [
    "# Context",
    "",
    "## UI-bearing Classification",
    "",
    "- ui_bearing: false",
    "- primary_surface: non-ui",
    "- secondary_surfaces:",
    "- classification_rationale: API-only workflow.",
  ].join("\n");
}

function happyDesignSystem(): string {
  return [
    "# Design System",
    "",
    "## Visual Theme",
    "",
    "Clean, minimal, content-forward. Uses generous whitespace.",
    "",
    "## Color Palette",
    "",
    "- Primary: #0a84ff (blue)",
    "- Background: #ffffff",
    "",
    "## Do's and Don'ts",
    "",
    "- Do: keep contrast >=4.5:1",
    "- Don't: use pure red for errors",
    "",
  ].join("\n");
}

describe("validateDesignSystemPresence (UIX-VAL-DS01/DS02)", () => {
  it("QFAI:SPEC-0014:TC-0014-0026 — UI-bearing, no 12_design_system.md → UIX-VAL-DS01", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Context.md"), completeContext(), "utf-8");
    await mkdir(path.join(root, "uiux"), { recursive: true });

    const issues = await validateDesignSystemPresence(root, defaultConfig);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("UIX-VAL-DS01");
  });

  it("QFAI:SPEC-0014:TC-0014-0027 — partial sections with placeholder and missing heading → 2 DS02", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Context.md"), completeContext(), "utf-8");
    await mkdir(path.join(root, "uiux"), { recursive: true });
    const content = [
      "# Design System",
      "",
      "## Visual Theme",
      "",
      "Clean, minimal, content-forward. Uses generous whitespace.",
      "",
      "## Color Palette",
      "",
      "TODO",
      "",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "12_design_system.md"), content, "utf-8");

    const issues = await validateDesignSystemPresence(root, defaultConfig);
    const codes = issues.map((i) => i.code).sort();
    expect(codes).toEqual(["UIX-VAL-DS02", "UIX-VAL-DS02"]);
    expect(issues.some((i) => i.code === "UIX-VAL-DS01")).toBe(false);
    // Ensure both Color Palette and Do's and Don'ts are reported
    expect(issues.some((i) => i.message.includes("Color Palette"))).toBe(true);
    expect(issues.some((i) => i.message.includes("Do's and Don'ts"))).toBe(true);
  });

  it("QFAI:SPEC-0014:TC-0014-0032 — read permissions handling", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Context.md"), completeContext(), "utf-8");
    await mkdir(path.join(root, "uiux"), { recursive: true });
    const filePath = path.join(root, "uiux", "12_design_system.md");
    await writeFile(filePath, happyDesignSystem(), "utf-8");

    if (process.platform === "win32") {
      // Windows chmod semantics differ; assert readable case only.
      await chmod(filePath, 0o444);
      const issues = await validateDesignSystemPresence(root, defaultConfig);
      expect(issues).toEqual([]);
    } else {
      await chmod(filePath, 0o000);
      try {
        const issues = await validateDesignSystemPresence(root, defaultConfig);
        expect(issues).toHaveLength(1);
        expect(issues[0]?.code).toBe("UIX-VAL-DS-READ-ERROR");
        expect(issues[0]?.code).not.toBe("UIX-VAL-DS01");
      } finally {
        await chmod(filePath, 0o644);
      }
    }
  });

  it("happy path: all three sections populated → zero issues", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Context.md"), completeContext(), "utf-8");
    await mkdir(path.join(root, "uiux"), { recursive: true });
    await writeFile(
      path.join(root, "uiux", "12_design_system.md"),
      happyDesignSystem(),
      "utf-8",
    );

    const issues = await validateDesignSystemPresence(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("non-UI safety: non-ui pack with no 12_design_system.md → zero issues", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Context.md"), nonUiContext(), "utf-8");

    const issues = await validateDesignSystemPresence(root, defaultConfig);
    expect(issues).toEqual([]);
  });
});
