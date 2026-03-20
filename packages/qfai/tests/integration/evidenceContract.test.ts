import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");
const implementSkillPath = path.join(
  templateRoot,
  ".qfai",
  "assistant",
  "skills",
  "qfai-implement",
  "SKILL.md",
);

let content: string | undefined;

async function loadContent(): Promise<string> {
  content ??= await readFile(implementSkillPath, "utf-8");
  return content;
}

// QFAI:SPEC-0016:TC-0016-0012
describe("valid evidence accepted (free-text+labels format)", () => {
  it("defines evidence with labeled fields: TDD-ID, TC-ref, RED cmd+result, GREEN cmd+result", async () => {
    const c = await loadContent();
    expect(c).toMatch(/TDD-ID/);
    expect(c).toMatch(/TC-ref/i);
    expect(c).toMatch(/RED command|RED cmd/i);
    expect(c).toMatch(/RED result/i);
    expect(c).toMatch(/GREEN command|GREEN cmd/i);
    expect(c).toMatch(/GREEN result/i);
    expect(c).toMatch(/refactor.verify|refactor.*verify/i);
    expect(c).toMatch(/spec review/i);
    expect(c).toMatch(/code quality review/i);
  });
});

// QFAI:SPEC-0016:TC-0016-0013
describe("status-only and empty evidence rejected", () => {
  it("explicitly rejects status-only evidence", async () => {
    const c = await loadContent();
    expect(c).toMatch(/status.only[\s\S]*?invalid|status.only[\s\S]*?reject/i);
  });

  it("rejects empty evidence entries", async () => {
    const c = await loadContent();
    expect(c).toMatch(/empty[\s\S]*?reject|minimum evidence/i);
  });
});

// QFAI:SPEC-0016:TC-0016-0014
describe("thin evidence replaced with full evidence", () => {
  it("requires both command and result", async () => {
    const c = await loadContent();
    expect(c).toMatch(/both.*command.*result|command.*result.*required/i);
  });

  it("rejects reasoning-only evidence", async () => {
    const c = await loadContent();
    expect(c).toMatch(/should pass.*not acceptable|looks good.*not acceptable/i);
  });
});

// QFAI:SPEC-0016:TC-0016-0015
describe("evidence with truncated result accepted", () => {
  it("accepts truncated results as best-effort", async () => {
    const c = await loadContent();
    expect(c).toMatch(/truncat[\s\S]*?accept|best.effort/i);
  });
});

describe("fresh evidence requirement", () => {
  it("requires fresh evidence and prohibits stale evidence reuse", async () => {
    const c = await loadContent();
    expect(c).toContain("fresh evidence");
    expect(c).toMatch(/stale.*evidence[\s\S]*?must not|stale.*evidence[\s\S]*?reuse/i);
  });
});
