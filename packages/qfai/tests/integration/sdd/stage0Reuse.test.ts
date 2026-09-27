/**
 * Integration: Stage 0 reuse keeps SDD's own readiness check live.
 *
 * Reads the shipped `qfai-sdd` text a workflow run relies on. The workflow core's and the
 * validator's own checks are not this module's.
 */
// QFAI:SPEC-0013:TC-0013-0051
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

describe("qfai-sdd in a workflow run", () => {
  it("TC-0013-0051: Stage 0 reuse keeps SDD's own check live", async () => {
    const text = flat(
      sectionOf(await readShipped("skills/qfai-sdd/references/orchestrated-mode.md"), "## Stage 0"),
    );
    expect(text, "the ## Stage 0 section exists").not.toBe("");
    expect(text).toMatch(
      /the shared Stage 0 snapshot is reused only after its key is recomputed, as the operating baseline states/i,
    );
    expect(text).toMatch(/only the entries whose inputs changed are refreshed/i);
    expect(text).toMatch(/the `npx qfai sdd preflight` readiness check runs in every attempt/i);
  });
});
