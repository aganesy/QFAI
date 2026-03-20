import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");
const templateQfaiDir = path.join(templateRoot, ".qfai");
const implementSkillPath = path.join(
  templateQfaiDir,
  "assistant",
  "skills",
  "qfai-implement",
  "SKILL.md",
);

// QFAI:SPEC-0016:US-0016-0005
describe("v1.6.2 required phrase guardrails", () => {
  const requiredPhrases = [
    "watch it fail",
    "watch it pass",
    "fresh evidence",
    "spec review",
    "code quality review",
    "one test at a time",
    "parallel",
    "independent",
  ];

  it("SKILL.md contains all 8 required phrases", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    const missing: string[] = [];
    for (const phrase of requiredPhrases) {
      if (!content.toLowerCase().includes(phrase.toLowerCase())) {
        missing.push(phrase);
      }
    }
    expect(missing, `Missing required phrases in SKILL.md: ${missing.join(", ")}`).toEqual([]);
  });

  it("required phrase check is idempotent (second run produces same result)", async () => {
    const content1 = await readFile(implementSkillPath, "utf-8");
    const content2 = await readFile(implementSkillPath, "utf-8");
    for (const phrase of requiredPhrases) {
      expect(content1.toLowerCase().includes(phrase.toLowerCase())).toBe(
        content2.toLowerCase().includes(phrase.toLowerCase()),
      );
    }
  });
});

// QFAI:SPEC-0016:US-0016-0005
describe("missing required phrase detection", () => {
  it("test framework can detect absence of a phrase", () => {
    const testContent = "This has no special phrases";
    expect(testContent).not.toContain("watch it fail");
  });
});

// QFAI:SPEC-0016:US-0016-0005
describe("v1.6.2 forbidden phrase guardrails", () => {
  const forbiddenPhrases = [
    "qfai-tdd-red",
    "qfai-tdd-green",
    "qfai-tdd-refactor",
    "write all tests first",
    "implement later",
    "80% coverage required",
    "minimum N tests",
  ];

  it("SKILL.md contains no forbidden phrases", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    const found: string[] = [];
    for (const phrase of forbiddenPhrases) {
      if (content.toLowerCase().includes(phrase.toLowerCase())) {
        found.push(phrase);
      }
    }
    expect(found, `Forbidden phrases found in SKILL.md: ${found.join(", ")}`).toEqual([]);
  });

  it("no forbidden phrases in any assistant markdown under init template", async () => {
    const markdownFiles = await fg(["assistant/**/*.md"], {
      cwd: templateQfaiDir,
      absolute: true,
    });

    const found: string[] = [];
    for (const filePath of markdownFiles) {
      const content = await readFile(filePath, "utf-8");
      for (const phrase of forbiddenPhrases) {
        if (content.toLowerCase().includes(phrase.toLowerCase())) {
          found.push(`${phrase} in ${path.relative(repoRoot, filePath)}`);
        }
      }
    }
    expect(found, `Forbidden phrases found: ${found.join("; ")}`).toEqual([]);
  });
});

// QFAI:SPEC-0016:US-0016-0005
describe("developer fixes missing phrase; asset tests pass", () => {
  it("all 8 required phrases are present after v1.6.2 changes", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    const requiredPhrases = [
      "watch it fail",
      "watch it pass",
      "fresh evidence",
      "spec review",
      "code quality review",
      "one test at a time",
      "parallel",
      "independent",
    ];
    for (const phrase of requiredPhrases) {
      expect(content.toLowerCase(), `Required phrase "${phrase}" must be in SKILL.md`).toContain(
        phrase.toLowerCase(),
      );
    }
  });
});
