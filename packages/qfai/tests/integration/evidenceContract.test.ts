import { readFile, readdir } from "node:fs/promises";
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

// #224 moved the per-round field list into `references/round-evidence.md`
// (progressive disclosure: SKILL.md has a line budget). The contract is still
// shipped, so these obligations read the skill and its references together.
//
// Every reference, not a named one. This file used to hardcode
// `round-evidence.md`, and the next extraction the budget forced — the
// per-item evidence contract — broke it on text that had not changed, only
// moved. The budget guarantees more extractions; naming them one at a time
// means re-learning this each time.
const implementReferencesDir = path.join(path.dirname(implementSkillPath), "references");

let content: string | undefined;

async function loadContent(): Promise<string> {
  if (content === undefined) {
    const parts = [await readFile(implementSkillPath, "utf-8")];
    const references = (await readdir(implementReferencesDir)).filter((name) =>
      name.endsWith(".md"),
    );
    expect(
      references.length,
      "the skill delegates topics to `references/`; reading none of them leaves the corpus as " +
        "whatever survived the line budget rather than the contract",
    ).toBeGreaterThan(0);
    for (const name of references.sort()) {
      parts.push(await readFile(path.join(implementReferencesDir, name), "utf-8"));
    }
    content = parts.join("\n");
  }
  return content;
}

// QFAI:SPEC-0011:TC-0011-0012
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

// QFAI:SPEC-0011:TC-0011-0013
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

// QFAI:SPEC-0011:TC-0011-0014
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

// QFAI:SPEC-0011:TC-0011-0015
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
