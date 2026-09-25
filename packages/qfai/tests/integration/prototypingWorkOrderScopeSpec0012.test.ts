/**
 * Integration: under a work order the prototype stage stays on its target spec.
 *
 * Reads the shipped `qfai-prototyping/references/orchestrated-mode.md`. Refusing a `blocked` result
 * that lists a repairable finding is the workflow core's, not this module's.
 */
// QFAI:SPEC-0012:TC-0012-0491
// QFAI:SPEC-0012:TC-0012-0492
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../helpers/shippedAssistant.js";

async function scopeSection(): Promise<string> {
  return flat(
    sectionOf(
      await readShipped("skills/qfai-prototyping/references/orchestrated-mode.md"),
      "## Work order scope",
    ),
  );
}

describe("qfai-prototyping in a workflow run", () => {
  it("TC-0012-0491 (TDD-0564): A work order confines the stage to its target spec", async () => {
    const text = await scopeSection();
    expect(text, "the ## Work order scope section exists").not.toBe("");
    expect(text).toMatch(/works only on the spec the work order's `target` names/i);
    expect(text).toMatch(
      /settles the one visual decision the plan needs within the existing `DESIGN\.md` and contracts/i,
    );
    expect(text).toMatch(/creates no contract/i);
    expect(text).toMatch(/a standalone invocation still resolves every UI-bearing spec/i);
  });

  it("TC-0012-0492 (TDD-0565): A target that is not UI-bearing is returned blocked", async () => {
    const text = await scopeSection();
    expect(text, "the ## Work order scope section exists").not.toBe("");
    expect(text).toMatch(
      /when the target spec is not UI-bearing, the skill writes no `DESIGN\.md`, no UI contract and no surface declaration/i,
    );
    expect(text).toMatch(
      /returns outcome `blocked`, listing the cause in `debts` with `resolvingOwner` `operator`/i,
    );
  });
});
