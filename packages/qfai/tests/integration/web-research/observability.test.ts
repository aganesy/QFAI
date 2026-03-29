import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const skillPath = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "web-research",
  "SKILL.md",
);

async function readSkill(): Promise<string> {
  return readFile(skillPath, "utf-8");
}

describe("web-research observability", { timeout: 15_000 }, () => {
  // QFAI:SPEC-0027:TC-0027-0015 (TDD-0023)
  it("log completeness - 6 mandatory field categories, no secrets", async () => {
    const content = await readSkill();

    // Must reference session log
    expect(content).toMatch(/session[_\s-]?log/i);

    // Must define at least 6 mandatory log field categories
    const fieldCategories = [
      /\bquery\b/i,
      /\bsources?\b/i,
      /\btimestamp/i,
      /\bstages?\b/i,
      /\bresults?\b|citations?\b/i,
      /\bsession[_\s-]?id\b|metadata\b/i,
    ];
    const matchCount = fieldCategories.filter((re) => re.test(content)).length;
    expect(matchCount).toBeGreaterThanOrEqual(6);

    // Must reference secret exclusion
    expect(content).toMatch(/no\s+secret|secret\s+exclusion|credential|sensitive/i);
  });

  // QFAI:SPEC-0027:TC-0027-0016 (TDD-0024)
  it("secret exclusion - API key not in log, content hash instead", async () => {
    const content = await readSkill();

    // Must mention content hash or API key exclusion
    expect(content).toMatch(
      /content[_\s-]?hash|hash\s+recorded|api[_\s-]?key.*excluded|exclude.*secret/i,
    );
  });
});
