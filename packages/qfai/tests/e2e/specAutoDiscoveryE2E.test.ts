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

// ── US-0008-0001: prototyping 自動 spec 検出 ─────────────────────────────────
// QFAI:SPEC-0008:US-0008-0001
describe("E2E: prototyping SKILL.md defines Mode Selection Protocol", () => {
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

  it("contains Mode Selection Protocol section", async () => {
    const c = await load();
    expect(c).toMatch(/## Mode Selection Protocol/);
  });

  it("contains Obligation Matrix with surface/mode entries", async () => {
    const c = await load();
    expect(c).toMatch(/## Obligation Matrix/);
    expect(c).toMatch(/\|\s*surface\s*\/\s*mode/);
    expect(c).toContain("web / low-cost");
    expect(c).toContain("web / standard");
  });

  it("contains Surface Semantics for non-ui skip", async () => {
    const c = await load();
    expect(c).toMatch(/## Surface Semantics/);
    expect(c).toContain("ui_bearing: false");
    expect(c).toContain("uiFidelity");
  });

  it("contains Required Process section", async () => {
    const c = await load();
    expect(c).toMatch(/## Required Process/);
    expect(c).toContain("qfai validate");
  });
});

// ── US-0008-0002: implement 自動 spec 検出 ──────────────────────────────────
// QFAI:SPEC-0008:US-0008-0002
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

// ── US-0008-0003: spec と実装のトレーサビリティ検証 ──────────────────────────
// QFAI:SPEC-0008:US-0008-0003
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

// ── US-0008-0004: 差分サマリの可読性 ────────────────────────────────────────
// QFAI:SPEC-0008:US-0008-0004
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

// ── US-0008-0006: テストケース品質深度検証 ──────────────────────────────────
// QFAI:SPEC-0008:US-0008-0006
describe("E2E: Test Case Quality Depth — Coverage Depth Matrix", () => {
  it("06_Test-Cases.md for spec-0008 defines depth verification TCs", async () => {
    const tcPath = path.join(repoRoot, ".qfai", "specs", "spec-0008", "06_Test-Cases.md");
    const content = await readFile(tcPath, "utf-8");
    expect(content).toContain("TC-0008-0011");
    expect(content).toContain("Coverage Depth Matrix");
    expect(content).toContain("TC-0008-0012");
    expect(content).toContain("Normal-Path-Only Flagged as Incomplete");
  });

  it("AC-0008-0009 requires depth matrix per US/TC", async () => {
    const acPath = path.join(repoRoot, ".qfai", "specs", "spec-0008", "03_Acceptance-Criteria.md");
    const content = await readFile(acPath, "utf-8");
    expect(content).toContain("AC-0008-0009");
    expect(content).toContain("Coverage Depth Matrix");
    expect(content).toMatch(/normal.*error.*boundary/i);
  });
});
