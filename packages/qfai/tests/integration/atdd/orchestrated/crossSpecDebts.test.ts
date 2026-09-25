/**
 * Integration: a pass with cross-spec obligations is accepted with debt.
 *
 * Reads the shipped `qfai-atdd/references/orchestrated-mode.md`, where the skill keeps what it
 * does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0008:TC-0008-0022
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-atdd in a workflow run", () => {
  it("TC-0008-0022 (TDD-0030): A Pass With Cross-Spec Obligations Is Accepted With Debt", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-atdd/references/orchestrated-mode.md"),
        "## Cross-spec obligations",
      ),
    );
    expect(text, "the ## Cross-spec obligations section exists").not.toBe("");
    expect(text).toMatch(
      /`PASS with cross-spec obligations` returns outcome `accepted_with_debt`/i,
    );
    expect(text).toMatch(
      /one `debts` entry per obligation, naming its owning spec \(`owningSpec`\) and its resolving owner \(`resolvingOwner`\)/i,
    );
    expect(text).toMatch(/a finding with no named owner is not handed on as a debt/i);
  });
});
