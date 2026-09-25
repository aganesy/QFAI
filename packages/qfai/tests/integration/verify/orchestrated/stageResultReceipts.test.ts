/**
 * Integration: the stage result names this run's verify.json and its independent review.
 *
 * Reads the shipped `qfai-verify/references/orchestrated-mode.md`. The workflow core's own checks are not
 * this module's.
 */
// QFAI:SPEC-0014:TC-0014-0037
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-verify in a workflow run", () => {
  it("TC-0014-0037 (TDD-0042): The stage result names this run's verify.json and its independent review", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-verify/references/orchestrated-mode.md"),
        "## The stage result",
      ),
    );
    expect(text, "the ## The stage result section exists").not.toBe("");
    expect(text).toMatch(
      /writes this run's `\.qfai\/report\/verify\.json` and names it in `artifactRefs`/i,
    );
    expect(text).toMatch(
      /the qa-gatekeeper verdict is a `reviewResults` entry, from a reviewer independent of the authors/i,
    );
    expect(text).toMatch(/own `gateResults` are information only/i);
  });
});
