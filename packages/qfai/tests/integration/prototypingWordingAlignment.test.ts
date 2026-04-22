import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  checkRoutingConsistency,
  detectAspirationalClaims,
  hasCanonicalSurfaceDocumentation,
  hasCliSurfaceDocumentation,
  hasDelegationScopeTable,
} from "../../src/core/validators/skill/prototypingSkill.js";
import type { RoutingCondition } from "../../src/core/validators/skill/prototypingSkill.js";

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

async function readSkillMd(): Promise<string> {
  return readFile(skillPath, "utf-8");
}

describe("prototyping wording alignment", () => {
  it("package asset skill has no aspirational claims", async () => {
    const content = await readSkillMd();
    expect(detectAspirationalClaims(content)).toEqual([]);
  });

  it("package asset skill documents canonical surfaces and delegation scope", async () => {
    const content = await readSkillMd();
    expect(hasCanonicalSurfaceDocumentation(content)).toBe(true);
    expect(hasCliSurfaceDocumentation(content)).toBe(true);
    expect(hasDelegationScopeTable(content)).toBe(true);
  });

  it("routing wording matches current execution-focused expectations", async () => {
    const content = await readSkillMd();
    const conditions: RoutingCondition[] = [
      {
        mode: "standard",
        trigger: "default execution",
        target: "static-first obligations",
      },
      {
        mode: "full-harness",
        trigger: "explicit escalation",
        target: "review-heavy obligations",
      },
    ];

    const result = checkRoutingConsistency(content, conditions);
    expect(result.consistent).toBe(true);
    expect(result.contradictions).toEqual([]);
  });
});
