// QFAI:SPEC-0025:TC-0025-0012
// QFAI:SPEC-0025:TC-0025-0013
// QFAI:SPEC-0025:TC-0025-0014
// QFAI:SPEC-0025:TC-0025-0007
// QFAI:SPEC-0025:TC-0025-0008

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import {
  loadSlopPatterns,
  validateDesignSlop,
  type SlopPattern,
} from "../../src/core/validators/designSlop.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function config(overrides?: Partial<QfaiConfig>): QfaiConfig {
  return { ...defaultConfig, ...overrides };
}

// ---------------------------------------------------------------------------
// TDD-0008 (TC-0025-0012): Tier 3 cosmetic default→info
// TDD-0009 (TC-0025-0013): Tier 3 functional default→warning
// TDD-0010 (TC-0025-0014): Tier 3 cosmetic high→warning
// ---------------------------------------------------------------------------

describe("validateDesignSlop — severity mapping", { timeout: 10000 }, () => {
  let root: string;

  beforeEach(async () => {
    root = path.join(
      os.tmpdir(),
      `qfai-slop-sev-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("TDD-0008: tier 3 cosmetic (generic-shell) with default profile → severity=info", async () => {
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20240101000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "03_Story-Workshop.md"),
      "# Story Workshop\n<div>UI content</div>\nThis is a generic dashboard layout\n",
      "utf-8",
    );
    const cfg = config({ uiux: { qualityProfile: "default" } });
    const issues = await validateDesignSlop(root, cfg);
    const slopIssue = issues.find((i) => i.code === "SLP-01");
    expect(slopIssue).toBeDefined();
    expect(slopIssue?.severity).toBe("info");
  });

  it("TDD-0009: tier 3 functional (dark-pattern) with default profile → severity=warning", async () => {
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20240101000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "03_Story-Workshop.md"),
      "# Story Workshop\n<div>UI content</div>\nUses hidden fee disclosure pattern\n",
      "utf-8",
    );
    const cfg = config({ uiux: { qualityProfile: "default" } });
    const issues = await validateDesignSlop(root, cfg);
    const slopIssue = issues.find((i) => i.code === "SLP-03");
    expect(slopIssue).toBeDefined();
    expect(slopIssue?.severity).toBe("warning");
  });

  it("TDD-0010: tier 3 cosmetic with high profile → severity=warning", async () => {
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20240101000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "03_Story-Workshop.md"),
      "# Story Workshop\n<div>UI content</div>\nThis is a generic dashboard layout\n",
      "utf-8",
    );
    const cfg = config({ uiux: { qualityProfile: "high" } });
    const issues = await validateDesignSlop(root, cfg);
    const slopIssue = issues.find((i) => i.code === "SLP-01");
    expect(slopIssue).toBeDefined();
    expect(slopIssue?.severity).toBe("warning");
  });
});

// ---------------------------------------------------------------------------
// TDD-0017 (TC-0025-0007): Slop JSON loading valid rules
// TDD-0018 (TC-0025-0008): Slop JSON graceful degradation
// ---------------------------------------------------------------------------

describe("loadSlopPatterns", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(
      os.tmpdir(),
      `qfai-slop-load-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("TDD-0017: loads all valid rules from JSON file", async () => {
    const patterns: SlopPattern[] = [
      {
        id: "SLP-T1",
        category: "generic-shell",
        tier: 3,
        scopes: ["03_Story-Workshop.md"],
        match: "\\btest pattern\\b",
        message: "Test pattern found",
        guidance: "Fix the test pattern",
      },
      {
        id: "SLP-T2",
        category: "dark-pattern",
        tier: 3,
        scopes: ["03_Story-Workshop.md"],
        match: "\\banother pattern\\b",
        message: "Another pattern found",
        guidance: "Fix the another pattern",
      },
    ];
    const jsonPath = path.join(tmpDir, "patterns.json");
    await writeFile(jsonPath, JSON.stringify(patterns), "utf-8");

    const loaded = await loadSlopPatterns(jsonPath);
    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe("SLP-T1");
    expect(loaded[0].category).toBe("generic-shell");
    expect(loaded[0].tier).toBe(3);
    expect(loaded[0].scopes).toEqual(["03_Story-Workshop.md"]);
    expect(loaded[0].match).toBe("\\btest pattern\\b");
    expect(loaded[0].message).toBe("Test pattern found");
    expect(loaded[0].guidance).toBe("Fix the test pattern");
    expect(loaded[1].id).toBe("SLP-T2");
  });

  it("TDD-0018: skips invalid rules and loads valid ones", async () => {
    const patterns = [
      {
        id: "SLP-V1",
        category: "generic-shell",
        tier: 3,
        scopes: ["03_Story-Workshop.md"],
        match: "\\bvalid\\b",
        message: "Valid rule",
        guidance: "Fix it",
      },
      {
        id: "SLP-INV",
        category: "dark-pattern",
        tier: 3,
        scopes: ["03_Story-Workshop.md"],
        match: "\\binvalid\\b",
        message: "Invalid rule missing guidance",
        // guidance is intentionally MISSING
      },
    ];
    const jsonPath = path.join(tmpDir, "patterns.json");
    await writeFile(jsonPath, JSON.stringify(patterns), "utf-8");

    const loaded = await loadSlopPatterns(jsonPath);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("SLP-V1");
  });
});
