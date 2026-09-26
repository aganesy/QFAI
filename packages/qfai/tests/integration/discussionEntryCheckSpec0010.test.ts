/**
 * Integration: `/qfai-discussion` cites its orchestrated-mode reference once, and the reference
 * cites the shared entry check.
 */
// QFAI:SPEC-0010:TC-0010-0015
import { describe, expect, it } from "vitest";

import { readShipped } from "../helpers/shippedAssistant.js";

const ENTRY_CHECK =
  ".qfai/assistant/constitution/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory";

describe("TC-0010-0015: the discussion stage follows the stage-skill handover", () => {
  it("TC-0010-0015: SKILL.md cites references/orchestrated-mode.md on one line, and the reference cites the entry check", async () => {
    const skill = await readShipped("skills/qfai-discussion/SKILL.md");
    const citing = skill
      .split("\n")
      .filter((line) => line.includes("references/orchestrated-mode.md"));
    expect(citing).toHaveLength(1);
    const reference = await readShipped("skills/qfai-discussion/references/orchestrated-mode.md");
    expect(reference).toContain(ENTRY_CHECK);
  });
});
