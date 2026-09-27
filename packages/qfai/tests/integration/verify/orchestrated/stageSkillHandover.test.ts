/**
 * Integration: the verify stage follows the stage-skill handover.
 *
 * Reads the shipped `qfai-verify/references/orchestrated-mode.md`. The workflow core's own checks are not
 * this module's.
 */
// QFAI:SPEC-0014:TC-0014-0042
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-verify in a workflow run", () => {
  it("TC-0014-0042 (TDD-0047): The verify stage follows the stage-skill handover", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-verify/references/orchestrated-mode.md"),
        "## Entry check",
      ),
    );
    expect(text, "the ## Entry check section exists").not.toBe("");
    expect(text).toMatch(
      /in mode `active`, a request with no work order and no name is passed to `qfai-run` with nothing edited/i,
    );
    expect(text).toMatch(/a worker checks the run, stage instance and work-order IDs/i);
    expect(text).toMatch(/does only that work order's work/i);
    const skill = await readShipped("skills/qfai-verify/SKILL.md");
    const citing = skill
      .split("\n")
      .filter((line) => line.includes("references/orchestrated-mode.md"));
    expect(citing).toHaveLength(1);
  });
});
