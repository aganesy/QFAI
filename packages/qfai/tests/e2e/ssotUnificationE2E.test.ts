import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("package-only SSOT prototyping assets", () => {
  const skillPath = path.resolve(
    process.cwd(),
    "assets",
    "init",
    ".qfai",
    "assistant",
    "skills",
    "qfai-prototyping",
    "SKILL.md",
  );
  const evidenceReadmePath = path.resolve(
    process.cwd(),
    "assets",
    "init",
    ".qfai",
    "evidence",
    "README.md",
  );

  it("SKILL.md and evidence README share mode/surface obligation vocabulary", async () => {
    const [skill, readme] = await Promise.all([
      readFile(skillPath, "utf-8"),
      readFile(evidenceReadmePath, "utf-8"),
    ]);

    // The absorbed prototyping harness replaces render/browser QA artifacts
    // with command-plans.json / review-bundle.json / evaluator-reviews/<cid>.json.
    for (const token of [
      "surface / mode",
      "full-harness",
      "low-cost",
      "standard",
      "web",
      "mobile",
      "desktop",
      "mixed",
      "playwright-cli",
      "command-plans.json",
      "review-bundle.json",
      "evaluator-reviews",
    ]) {
      expect(skill, `SKILL.md missing token: ${token}`).toContain(token);
      expect(readme, `evidence README missing token: ${token}`).toContain(token);
    }
  });

  it("SKILL.md does not reference removed public prototyping CLI", async () => {
    const skill = await readFile(skillPath, "utf-8");
    expect(skill).not.toMatch(/\$\s*qfai\s+prototyping\b/i);
    expect(skill).not.toMatch(/npx\s+qfai\s+prototyping\b/i);
  });

  it("README documents cli rejection semantics", async () => {
    const readme = await readFile(evidenceReadmePath, "utf-8");
    expect(readme).toContain("`cli`, API-only, backend-only");
    expect(readme).toContain("are not prototyping execution targets");
  });
});
