/**
 * Integration: the operating baseline states when a run's binding supplies `primarySpecId`.
 *
 * Both sides of the condition are held: a valid binding counts as a supplied value, and with no
 * binding the input stays hard-required. The Default Autopilot section and its buckets keep their
 * own cases.
 */
// QFAI:SPEC-0015:TC-0015-0037
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../helpers/shippedAssistant.js";

const BASELINE = "constitution/shared-skill-operating-baseline.md";
const PASSAGE = "## Default Autopilot Policy inside a run";

describe("TC-0015-0037: the operating baseline states the primarySpecId binding exception", () => {
  it("TC-0015-0037: a run's valid binding supplies primarySpecId, and with no binding it stays hard-required", async () => {
    const passage = flat(sectionOf(await readShipped(BASELINE), PASSAGE));
    expect(passage, `${BASELINE} has ${PASSAGE}`).not.toBe("");
    expect(passage).toMatch(
      /a `primarySpecId` that a run's valid binding supplies counts as supplied/i,
    );
    expect(passage).toMatch(/with no binding,? `primarySpecId` stays `hard-required`/i);
  });
});
