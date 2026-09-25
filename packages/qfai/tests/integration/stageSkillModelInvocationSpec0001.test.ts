/**
 * Integration: no skill a built-in plan names carries `disable-model-invocation`.
 *
 * A worker skill has to be reachable when the harness hands it a work order, so none of the seven may
 * opt out of model invocation. Skills no plan names, such as `qfai-grill`, are outside the rule.
 */
// QFAI:SPEC-0001:TC-0001-0031
import { describe, expect, it } from "vitest";

import {
  PLAN_SKILLS,
  frontMatterOf,
  readShipped,
  shippedExists,
} from "../helpers/shippedAssistant.js";

describe("plan skills stay model-invocable", () => {
  it("TC-0001-0031: no skill a plan names carries disable-model-invocation", async () => {
    for (const skill of PLAN_SKILLS) {
      expect(shippedExists(`skills/${skill}/SKILL.md`), `${skill}/SKILL.md exists`).toBe(true);
      const text = await readShipped(`skills/${skill}/SKILL.md`);
      expect(text, `${skill}/SKILL.md has front matter`).toMatch(/^---\r?\n/);
      expect(Object.keys(frontMatterOf(text)), skill).not.toContain("disable-model-invocation");
    }
  });
});
