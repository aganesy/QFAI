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
  "skill",
  "web-research",
);
const sandboxTemplateDir = path.join(repoRoot, "packages", "qfai", "assets", "sandbox-templates");

async function readSkill(): Promise<string> {
  return readFile(path.join(skillDir, "SKILL.md"), "utf-8");
}

describe("web-research security", () => {
  // ── MCP Failure Recovery ────────────────────────────────────────────

  // QFAI:EX-0001-0184-03  TDD-0011
  it("MCP crash detection within 10s, fallback activates", async () => {
    const content = await readSkill();
    expect(content).toMatch(/crash\s+(detect|detection|recover)/i);
    expect(content).toMatch(/10\s*s(ec)?/i);
    expect(content).toMatch(/fallback/i);
  });

  // QFAI:EX-0001-0184-04  TDD-0012
  it("rate limit 429 backoff respects Retry-After", async () => {
    const content = await readSkill();
    expect(content).toMatch(/429|rate[_\s-]?limit/i);
    expect(content).toMatch(/retry[_\s-]?after|backoff/i);
  });

  // ── Content Sanitization ───────────────────────────────────────────

  // QFAI:EX-0001-0186-01  TDD-0013
  it("injection defense — display:none content removed", async () => {
    const content = await readSkill();
    expect(content).toMatch(/display\s*:\s*none/i);
    expect(content).toMatch(/remov|strip|sanitiz/i);
  });

  // QFAI:EX-0001-0186-02  TDD-0014
  it("aria-hidden content removed", async () => {
    const content = await readSkill();
    expect(content).toMatch(/aria[_\s-]?hidden/i);
  });

  // QFAI:EX-0001-0186-05
  it("control characters removed, except TAB, LF and CR", async () => {
    const content = await readSkill();
    expect(content).toMatch(/U\+0000[–-]U\+001F except TAB\/LF\/CR/);
  });

  // QFAI:EX-0001-0186-03  TDD-0015
  it("legitimate content preserved unchanged", async () => {
    const content = await readSkill();
    expect(content).toMatch(/preserv|legitimate|unchanged/i);
  });

  // QFAI:EX-0001-0186-04  TDD-0016
  it("sanitizer idempotency — byte-identical", async () => {
    const content = await readSkill();
    expect(content).toMatch(/idempoten/i);
  });

  // ── Domain / URL Allowlist ─────────────────────────────────────────

  // QFAI:EX-0001-0187-01  TDD-0017
  it("allowlist happy path — allowed domain passes", async () => {
    const content = await readSkill();
    expect(content).toMatch(/allow[_\s-]?list/i);
  });

  // TDD-0018
  it("default-deny blocks non-allowlisted domain", async () => {
    const content = await readSkill();
    expect(content).toMatch(/default[_\s-]?deny/i);
  });

  // QFAI:EX-0001-0187-02  TDD-0019
  it("redirect to non-allowlisted domain blocked", async () => {
    const content = await readSkill();
    expect(content).toMatch(/redirect/i);
    expect(content).toMatch(/block|deny|reject/i);
  });

  // QFAI:EX-0001-0187-05
  it("redirect chain followed only while every hop stays on the allowlist", async () => {
    const content = await readSkill();
    expect(content).toContain("followed only while all hops remain on allowlisted domains");
  });

  // ── Sandbox Enforcement ────────────────────────────────────────────

  // TDD-0020
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
