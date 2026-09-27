/**
 * Integration: a gate that did not run is reported unrun.
 *
 * Reads the shipped `qfai-verify/references/orchestrated-mode.md`. The workflow core's own checks are not
 * this module's.
 */
// QFAI:SPEC-0014:TC-0014-0039
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-verify in a workflow run", () => {
  it("TC-0014-0039 (TDD-0044): A gate that did not run is reported unrun", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-verify/references/orchestrated-mode.md"),
        "## The stage result",
      ),
    );
    expect(text, "the ## The stage result section exists").not.toBe("");
    expect(text).toMatch(/`outcome` and `testObservation` are reported apart/i);
    expect(text).toMatch(/a required gate that did not run is reported `unrun`, never as a pass/i);
  });
});
