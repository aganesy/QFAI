/**
 * E2E: Spec Auto-Discovery Protocol (spec-0038)
 *
 * Verifies that the Spec Auto-Discovery Protocol is correctly documented
 * in SKILL.md files and that core modules export the expected API surface.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

// ── US-0038-0001: prototyping 自動 spec 検出 ─────────────────────────────────
// QFAI:SPEC-0038:US-0038-0001
describe("E2E: prototyping SKILL.md defines Spec Auto-Discovery Protocol", () => {
  const skillPath = path.join(
    repoRoot,
    ".qfai",
    "assistant",
    "skills",
    "qfai-prototyping",
    "SKILL.md",
  );

  let content: string | undefined;
  async function load(): Promise<string> {
    content ??= await readFile(skillPath, "utf-8");
    return content;
  }

  it("contains Spec Auto-Discovery Protocol section", async () => {
    const c = await load();
    expect(c).toMatch(/## Spec Auto-Discovery Protocol/);
  });

  it("contains 4-source detection table with Sources A, B, C, D", async () => {
    const c = await load();
    expect(c).toMatch(/\|\s*Source\s*\|\s*Method\s*\|\s*Fallback\s*\|/);
    expect(c).toContain("**A: Branch Diff**");
    expect(c).toContain("**B: Local Changes**");
    expect(c).toContain("**C: Evidence Mtime**");
    expect(c).toContain("**D: delta.md Parse**");
  });

  it("contains fallback behavior documentation", async () => {
    const c = await load();
    expect(c).toMatch(/### Fallback Behavior/);
    expect(c).toContain("git unavailable");
    expect(c).toContain("Zero specs detected");
    expect(c).toContain("Policy changes detected");
  });

  it("contains user confirmation flow", async () => {
    const c = await load();
    expect(c).toMatch(/### User Confirmation Flow/);
    expect(c).toContain("Display detected specs with status and source attribution");
    expect(c).toContain("user confirms scope");
  });
});

// ── US-0038-0002: implement 自動 spec 検出 ──────────────────────────────────
// QFAI:SPEC-0038:US-0038-0002
describe("E2E: implement SKILL.md defines Spec Auto-Discovery Protocol", () => {
  const skillPath = path.join(
    repoRoot,
    ".qfai",
    "assistant",
    "skills",
    "qfai-implement",
    "SKILL.md",
  );

  let content: string | undefined;
  async function load(): Promise<string> {
    content ??= await readFile(skillPath, "utf-8");
    return content;
  }

  it("contains Spec Auto-Discovery Protocol section", async () => {
    const c = await load();
    expect(c).toMatch(/## Spec Auto-Discovery Protocol/);
  });

  it('argument-hint is "[spec-id]" (optional, not required)', async () => {
    const c = await load();
    expect(c).toMatch(/argument-hint:\s*"\[spec-id\]"/);
  });

  it("contains One-Spec-at-a-Time Guarantee", async () => {
    const c = await load();
    expect(c).toMatch(/### One-Spec-at-a-Time Guarantee/);
    expect(c).toContain("does NOT enable multi-spec parallel execution");
  });

  it("contains user selection flow", async () => {
    const c = await load();
    expect(c).toMatch(/### User Selection Flow/);
    expect(c).toContain("Single spec detected");
    expect(c).toContain("Multiple specs detected");
    expect(c).toContain("Zero specs detected");
  });
});

// ── US-0038-0003: spec と実装のトレーサビリティ検証 ──────────────────────────
// QFAI:SPEC-0038:US-0038-0003
describe("E2E: traceabilityIntegrity module is integrated into validate pipeline", () => {
  it("traceabilityIntegrity.ts exports validateTraceabilityIntegrity", async () => {
    const filePath = path.join(
      repoRoot,
      "packages",
      "qfai",
      "src",
      "core",
      "validators",
      "traceabilityIntegrity.ts",
    );
    const c = await readFile(filePath, "utf-8");
    expect(c).toMatch(/export\s+async\s+function\s+validateTraceabilityIntegrity/);
  });

  it("validate.ts imports and calls traceabilityIntegrity", async () => {
    const filePath = path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts");
    const c = await readFile(filePath, "utf-8");
    expect(c).toContain("validateTraceabilityIntegrity");
    expect(c).toMatch(/await\s+validateTraceabilityIntegrity\(/);
  });
});

// ── US-0038-0004: 差分サマリの可読性 ────────────────────────────────────────
// QFAI:SPEC-0038:US-0038-0004
describe("E2E: specDiffDetector exports required API surface", () => {
  let content: string | undefined;
  async function load(): Promise<string> {
    content ??= await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "specDiffDetector.ts"),
      "utf-8",
    );
    return content;
  }

  it("exports SpecDiffResult type with required fields", async () => {
    const c = await load();
    expect(c).toMatch(/export\s+type\s+SpecDiffResult/);
    expect(c).toContain("entries:");
    expect(c).toContain("allSpecs:");
    expect(c).toContain("fullScan:");
  });

  it("exports detectSpecChanges as the main entry point", async () => {
    const c = await load();
    expect(c).toMatch(/export\s+async\s+function\s+detectSpecChanges/);
  });

  it("exports classification types (implemented, missing, stale, unchanged)", async () => {
    const c = await load();
    expect(c).toMatch(/export\s+type\s+SpecDiffStatus/);
    expect(c).toContain('"changed"');
    expect(c).toContain('"stale"');
    expect(c).toContain('"unchanged"');
  });
});
