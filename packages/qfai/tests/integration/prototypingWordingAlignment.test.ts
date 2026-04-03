import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  checkModeHeadings,
  checkRoutingConsistency,
  detectAspirationalClaims,
  hasModeSurfaceMatrix,
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

  it("package asset skill defines all mode headings and obligation matrix", async () => {
    const content = await readSkillMd();
    expect(checkModeHeadings(content).missing).toHaveLength(0);
    expect(hasModeSurfaceMatrix(content)).toBe(true);
  });

  it("routing wording matches canonical implementation expectations", async () => {
    const content = await readSkillMd();
    const conditions: RoutingCondition[] = [
      {
        mode: "low-cost",
        trigger: "explicit request",
        target: "lightweight obligations",
      },
      {
        mode: "standard",
        trigger: "default or discussion recommendation",
        target: "static checks",
      },
      {
        mode: "full-harness",
        trigger: "explicit request",
        target: "runtime-heavy obligations",
      },
    ];

    const result = checkRoutingConsistency(content, conditions);
    expect(result.consistent).toBe(true);
    expect(result.contradictions).toEqual([]);
  });
});
