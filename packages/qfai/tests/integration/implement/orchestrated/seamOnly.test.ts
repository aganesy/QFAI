/**
 * Integration: a seam-only work order lands only the minimal connection its target test needs.
 *
 * Reads the shipped `qfai-implement/references/orchestrated-mode.md`, where the skill keeps what
 * it does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0011:TC-0011-0018
// QFAI:SPEC-0011:TC-0011-0027
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-implement in a workflow run", () => {
  it("TC-0011-0018 (TDD-0026): A Seam-Only Work Order Lands Only the Minimal Connection", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-implement/references/orchestrated-mode.md"),
        "## `seam-only`",
      ),
    );
    expect(text, "the ## `seam-only` section exists").not.toBe("");
    expect(text).toMatch(/Phase Red step 3a \(Minimal seam\) of `SKILL\.md`/i);
    expect(text).toMatch(/only the minimal connection the target test needs is landed/i);
    expect(text).toMatch(/the test is left failing at its assertion/i);
    expect(text).toMatch(/the result names the target test/i);
    expect(text).toMatch(/the main implementation waits until the acceptance stage has taken RED/i);
  });

  it("TC-0011-0027 (TDD-0039): A seam that cannot be landed", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-implement/references/orchestrated-mode.md"),
        "## `seam-only`",
      ),
    );
    expect(text, "the ## `seam-only` section exists").not.toBe("");
    expect(text).toMatch(/returned `blocked` only with its cause listed in `debts`/i);
    expect(text).toMatch(/owned by `operator` for a missing environment/i);
    expect(text).toMatch(
      /naming a spec outside the checked write scope for a dependency beyond it/i,
    );
    expect(text).toMatch(/with no such finding, it is returned `unrun`/i);
    expect(text).toMatch(
      /a cause the stage can repair itself is returned `needs_repair`, never `blocked`/i,
    );
    expect(text).toMatch(/none of these results reports a `pass` observation/i);
    expect(text).toMatch(/the main implementation still waits/i);
    expect(text).toMatch(
      /a reissued seam-only work order is served as a new attempt of the same operation/i,
    );
  });
});
