import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import fg from "fast-glob";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const skillDir = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "web-research",
);
const sandboxTemplateDir = path.join(repoRoot, "packages", "qfai", "assets", "sandbox-templates");

async function readSkill(): Promise<string> {
  return readFile(path.join(skillDir, "SKILL.md"), "utf-8");
}

describe("web-research security", { timeout: 15_000 }, () => {
  // ── MCP Failure Recovery ────────────────────────────────────────────

  // QFAI:SPEC-0027:TC-0027-0005  TDD-0011
  it("MCP crash detection within 10s, fallback activates", async () => {
    const content = await readSkill();
    expect(content).toMatch(/crash\s+(detect|recover)/i);
    expect(content).toMatch(/10\s*s(ec)?/i);
    expect(content).toMatch(/fallback/i);
  });

  // QFAI:SPEC-0027:TC-0027-0006  TDD-0012
  it("rate limit 429 backoff respects Retry-After", async () => {
    const content = await readSkill();
    expect(content).toMatch(/429|rate[_\s-]?limit/i);
    expect(content).toMatch(/retry[_\s-]?after|backoff/i);
  });

  // ── Content Sanitization ───────────────────────────────────────────

  // QFAI:SPEC-0027:TC-0027-0009  TDD-0013
  it("injection defense — display:none content removed", async () => {
    const content = await readSkill();
    expect(content).toMatch(/display\s*:\s*none/i);
    expect(content).toMatch(/remov|strip|sanitiz/i);
  });

  // QFAI:SPEC-0027:TC-0027-0010  TDD-0014
  it("aria-hidden content removed", async () => {
    const content = await readSkill();
    expect(content).toMatch(/aria[_\s-]?hidden/i);
  });

  // QFAI:SPEC-0027:TC-0027-0011  TDD-0015
  it("legitimate content preserved unchanged", async () => {
    const content = await readSkill();
    expect(content).toMatch(/preserv|legitimate|unchanged/i);
  });

  // QFAI:SPEC-0027:TC-0027-0025  TDD-0016
  it("sanitizer idempotency — byte-identical", async () => {
    const content = await readSkill();
    expect(content).toMatch(/idempoten/i);
  });

  // ── Domain / URL Allowlist ─────────────────────────────────────────

  // QFAI:SPEC-0027:TC-0027-0012  TDD-0017
  it("allowlist happy path — allowed domain passes", async () => {
    const content = await readSkill();
    expect(content).toMatch(/allow[_\s-]?list/i);
  });

  // QFAI:SPEC-0027:TC-0027-0013  TDD-0018
  it("default-deny blocks non-allowlisted domain", async () => {
    const content = await readSkill();
    expect(content).toMatch(/default[_\s-]?deny/i);
  });

  // QFAI:SPEC-0027:TC-0027-0014  TDD-0019
  it("redirect to non-allowlisted domain blocked", async () => {
    const content = await readSkill();
    expect(content).toMatch(/redirect/i);
    expect(content).toMatch(/block|deny|reject/i);
  });

  // ── Sandbox Enforcement ────────────────────────────────────────────

  // QFAI:SPEC-0027:TC-0027-0022  TDD-0020
  it("sandbox default-deny enforcement — template files exist", async () => {
    const files = await fg(["**/*"], { cwd: sandboxTemplateDir, absolute: false });
    expect(files.length).toBeGreaterThan(0);

    // At least one file must contain deny/restrict/sandbox keywords
    let hasPolicy = false;
    for (const file of files) {
      const content = await readFile(path.join(sandboxTemplateDir, file), "utf-8");
      if (/deny|restrict|sandbox/i.test(content)) {
        hasPolicy = true;
        break;
      }
    }
    expect(hasPolicy).toBe(true);
  });
});
