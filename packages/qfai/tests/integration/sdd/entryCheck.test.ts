/**
 * Integration: the `/qfai-sdd` entry check follows the stage-skill handover.
 *
 * Reads the shipped `qfai-sdd` text a workflow run relies on. The workflow core's and the
 * validator's own checks are not this module's.
 */
// QFAI:SPEC-0013:TC-0013-0049
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

describe("qfai-sdd in a workflow run", () => {
  it("TC-0013-0049: The entry check follows the handover", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-sdd/references/orchestrated-mode.md"),
        "## Entry check",
      ),
    );
    expect(text, "the ## Entry check section exists").not.toBe("");
    expect(text).toMatch(
      /a request with no name and no work order is passed to `qfai-run`, and nothing is edited/i,
    );
    expect(text).toMatch(
      /a work order that matches no issued one: edit nothing and return the refusal to the harness/i,
    );
    expect(text).toMatch(/a valid work order is worked, and nothing else/i);
    const skill = await readShipped("skills/qfai-sdd/SKILL.md");
    const citing = skill
      .split("\n")
      .filter((line) => line.includes("references/orchestrated-mode.md"));
    expect(citing).toHaveLength(1);
  });
});
