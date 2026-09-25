/**
 * Integration: `/qfai-prototyping` cites its orchestrated-mode reference once, and the reference
 * cites the shared entry check.
 */
// QFAI:SPEC-0012:TC-0012-0491
import { describe, expect, it } from "vitest";

import { readShipped } from "../helpers/shippedAssistant.js";

const ENTRY_CHECK =
  ".qfai/assistant/constitution/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory";

describe("qfai-prototyping in a workflow run", () => {
  it("TC-0012-0491 (TDD-0578): SKILL.md cites the orchestrated-mode reference once, and it cites the entry check", async () => {
    const skill = await readShipped("skills/qfai-prototyping/SKILL.md");
    const citing = skill
      .split("\n")
      .filter((line) => line.includes("references/orchestrated-mode.md"));
    expect(citing).toHaveLength(1);
    const reference = await readShipped("skills/qfai-prototyping/references/orchestrated-mode.md");
    expect(reference).toContain(ENTRY_CHECK);
  });
});
