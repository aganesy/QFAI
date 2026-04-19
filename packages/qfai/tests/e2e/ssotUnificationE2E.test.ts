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

    for (const token of [
      "surface / mode",
      "full-harness",
      "web",
      "mobile",
      "desktop",
      "mixed",
      "web",
      "render.json",
      "browser-qa.json",
    ]) {
      expect(skill).toContain(token);
      expect(readme).toContain(token);
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
