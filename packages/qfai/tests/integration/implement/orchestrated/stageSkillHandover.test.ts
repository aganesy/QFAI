/**
 * Integration: the implement stage follows the stage-skill handover.
 *
 * Reads the shipped `qfai-implement/references/orchestrated-mode.md`, where the skill keeps what
 * it does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0011:TC-0011-0028
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-implement in a workflow run", () => {
  it("TC-0011-0028 (TDD-0040): The Implement Stage Follows the Stage-Skill Handover", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-implement/references/orchestrated-mode.md"),
        "## Entry check",
      ),
    );
    expect(text, "the ## Entry check section exists").not.toBe("");
    expect(text).toMatch(
      /in mode `active`, a request with no work order and no name is passed to `qfai-run` with nothing edited/i,
    );
    expect(text).toMatch(/a worker checks the run, stage instance and work-order IDs/i);
    expect(text).toMatch(/does only that work order's work/i);
    const skill = await readShipped("skills/qfai-implement/SKILL.md");
    const citing = skill
      .split("\n")
      .filter((line) => line.includes("references/orchestrated-mode.md"));
    expect(citing).toHaveLength(1);
  });
});
