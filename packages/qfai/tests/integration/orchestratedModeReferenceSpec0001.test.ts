/**
 * Integration: every skill a built-in plan names keeps its orchestrated-mode rules in one reference.
 *
 * The reference exists and `SKILL.md` cites it on exactly one line. That no other orchestrated-mode
 * text sits in a `SKILL.md` body is judged at review, on the diff.
 */
// QFAI:SPEC-0001:TC-0001-0030
import { describe, expect, it } from "vitest";

import { PLAN_SKILLS, readShipped, shippedExists } from "../helpers/shippedAssistant.js";

const REFERENCE = "references/orchestrated-mode.md";

describe("one orchestrated-mode reference per plan skill", () => {
  it("TC-0001-0030: one references/orchestrated-mode.md, cited by one SKILL.md line", async () => {
    for (const skill of PLAN_SKILLS) {
      expect(shippedExists(`skills/${skill}/${REFERENCE}`), `${skill}/${REFERENCE} exists`).toBe(
        true,
      );
      const body = await readShipped(`skills/${skill}/SKILL.md`);
      const citing = body.split("\n").filter((line) => line.includes(REFERENCE));
      expect(citing, `${skill}/SKILL.md lines citing ${REFERENCE}`).toHaveLength(1);
    }
  });
});
