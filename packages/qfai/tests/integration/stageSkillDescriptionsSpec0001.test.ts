/**
 * Integration: the description of every skill a built-in plan names opens with its trigger condition.
 *
 * A host picks a skill from its description before reading anything else, so the first sentence
 * says when the skill is used: invoked by name, or handed a QFAI work order. Length and the `<`/`>`
 * ban are the frontmatter validator's; whether the rest summarizes the pipeline is judged at review.
 */
// QFAI:SPEC-0001:TC-0001-0028
import { describe, expect, it } from "vitest";

import {
  PLAN_SKILLS,
  frontMatterOf,
  readShipped,
  shippedExists,
} from "../helpers/shippedAssistant.js";

describe("stage skill descriptions", () => {
  it("TC-0001-0028: each description opens with its trigger condition", async () => {
    for (const skill of PLAN_SKILLS) {
      expect(shippedExists(`skills/${skill}/SKILL.md`), `${skill}/SKILL.md exists`).toBe(true);
      const description = frontMatterOf(await readShipped(`skills/${skill}/SKILL.md`)).description;
      expect(typeof description, `${skill} has a description`).toBe("string");
      const first = String(description).split(/(?<=\.)\s/)[0] ?? "";
      expect(first, `${skill}: nothing precedes the trigger sentence`).toMatch(/^Use when /);
      expect(first, `${skill}: invocation by name`).toMatch(/invoked by name/);
      expect(first, `${skill}: a QFAI work order`).toMatch(/handed a QFAI work order/);
    }
  });
});
