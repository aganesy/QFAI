/**
 * Integration: a `/qfai-sdd` invoked by name ends at SDD.
 *
 * Reads the shipped `qfai-sdd` text a workflow run relies on. The workflow core's and the
 * validator's own checks are not this module's.
 */
// QFAI:SPEC-0013:TC-0013-0048
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

describe("qfai-sdd in a workflow run", () => {
  it("TC-0013-0048: A direct `/qfai-sdd` ends at SDD", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-sdd/references/orchestrated-mode.md"),
        "## Invoked by name",
      ),
    );
    expect(text, "the ## Invoked by name section exists").not.toBe("");
    expect(text).toMatch(
      /`\/qfai-sdd` invoked by name runs standalone, ends at SDD and creates no run/i,
    );
    expect(text).toMatch(/a request to go to the end is handed to a whole run/i);
  });
});
