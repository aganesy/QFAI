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
  const evidenceRequirementsPath = path.resolve(
    process.cwd(),
    "assets",
    "init",
    ".qfai",
    "assistant",
    "skills",
    "qfai-prototyping",
    "references",
    "evidence-requirements.md",
  );

  it("SKILL.md and evidence requirements share mode/surface obligation vocabulary", async () => {
    const [skill, evidenceRequirements] = await Promise.all([
      readFile(skillPath, "utf-8"),
      readFile(evidenceRequirementsPath, "utf-8"),
    ]);

    // The absorbed prototyping harness replaces render/browser QA artifacts
    // with command-plans.json / review-bundle.json / evaluator-reviews/<cid>.json.
    for (const token of [
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
      expect(evidenceRequirements, `evidence requirements missing token: ${token}`).toContain(
        token,
      );
    }
  });

  it("SKILL.md does not reference removed public prototyping CLI", async () => {
    const skill = await readFile(skillPath, "utf-8");
    expect(skill).not.toMatch(/\$\s*qfai\s+prototyping\b/i);
    expect(skill).not.toMatch(/npx\s+qfai\s+prototyping\b/i);
  });

  it("evidence requirements document cli rejection semantics", async () => {
    const evidenceRequirements = await readFile(evidenceRequirementsPath, "utf-8");
    expect(evidenceRequirements).toContain("`cli`, API-only, backend-only");
    expect(evidenceRequirements).toContain("are not prototyping execution targets");
  });
});
