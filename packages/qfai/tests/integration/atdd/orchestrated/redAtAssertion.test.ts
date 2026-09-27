/**
 * Integration: a non-assertion failure is never reported as RED.
 *
 * Reads the shipped `qfai-atdd/references/orchestrated-mode.md`, where the skill keeps what it
 * does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0008:TC-0008-0021
import { describe, expect, it } from "vitest";

import { flat, readShipped, rowOf, sectionOf } from "../../../helpers/shippedAssistant.js";

const NOT_RED = ["collection", "import", "startup", "timeout"];

describe("qfai-atdd in a workflow run", () => {
  it("TC-0008-0021 (TDD-0029): A Non-Assertion Failure Is Never Reported as RED", async () => {
    const raw = sectionOf(
      await readShipped("skills/qfai-atdd/references/orchestrated-mode.md"),
      "## RED at the assertion",
    );
    const text = flat(raw);
    expect(text, "the ## RED at the assertion section exists").not.toBe("");
    const assertion = rowOf(raw, "`assertion`");
    expect(assertion, "a row for failure kind assertion").toContain("`expected_red`");
    for (const kind of NOT_RED) {
      const row = rowOf(raw, `\`${kind}\``);
      expect(row, `a row for failure kind ${kind}`).not.toBe("");
      expect(row).toMatch(/`unrun` or `blocked`/);
      expect(row).not.toContain("`expected_red`");
    }
    expect(text).toMatch(/never `expected_red`/i);
  });
});
