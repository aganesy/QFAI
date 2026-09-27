/**
 * Integration: `--auto` inside a run approves nothing.
 *
 * Reads the shipped `qfai-sdd` text a workflow run relies on. The workflow core's and the
 * validator's own checks are not this module's.
 */
// QFAI:SPEC-0013:TC-0013-0041
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

describe("qfai-sdd in a workflow run", () => {
  it("TC-0013-0041: `--auto` inside a run approves nothing", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-sdd/references/orchestrated-mode.md"),
        "## `--auto` inside a run",
      ),
    );
    expect(text, "the ## `--auto` inside a run section exists").not.toBe("");
    expect(text).toMatch(
      /under `--auto` inside a run, an approval-required row with no satisfying `human_decision` stops Stage 1 with a `consultation-needed` entry/i,
    );
    expect(text).toMatch(/`Approved By` stays `-`/i);
  });
});
