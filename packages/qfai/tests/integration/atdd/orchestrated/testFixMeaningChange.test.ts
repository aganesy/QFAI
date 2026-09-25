/**
 * Integration: a change of meaning is routed to SDD.
 *
 * Reads the shipped `qfai-atdd/references/orchestrated-mode.md`, where the skill keeps what it
 * does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0008:TC-0008-0026
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-atdd in a workflow run", () => {
  it("TC-0008-0026 (TDD-0034): A Change of Meaning Is Routed to SDD", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-atdd/references/orchestrated-mode.md"),
        "## `test-fix`",
      ),
    );
    expect(text, "the ## `test-fix` section exists").not.toBe("");
    expect(text).toMatch(
      /a fix after which the expectation would cite a different AC or BR returns `needs_repair`, listing that finding in `debts` with `qfai-sdd` as its `resolvingOwner`/i,
    );
    expect(text).toMatch(/no accepted test fix is returned for it/i);
  });
});
