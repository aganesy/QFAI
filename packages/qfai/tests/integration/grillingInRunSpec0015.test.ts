/**
 * Integration: inside a run, grilling works only the frontier the work order leaves open.
 *
 * What the work order's `settled` field records is taken as settled, and the split between user
 * and delegated sessions stands. That no plan names `qfai-grill` is the plan vocabulary's.
 */
// QFAI:SPEC-0015:TC-0015-0041
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../helpers/shippedAssistant.js";

const BASELINE = "constitution/shared-skill-delegation-baseline.md";
const PASSAGE = "### Grilling in a run";

describe("TC-0015-0041: the delegation baseline limits grilling in a run to the remaining frontier", () => {
  it("TC-0015-0041: settled is taken as settled, only the remaining frontier is worked, and the session split stands", async () => {
    const passage = flat(sectionOf(await readShipped(BASELINE), PASSAGE));
    expect(passage, `${BASELINE} has ${PASSAGE}`).not.toBe("");
    expect(passage).toMatch(/takes what the work order's `settled` field records as settled/i);
    expect(passage).toMatch(/works only the remaining frontier/i);
    expect(passage).toMatch(/split between user sessions and delegated sessions/i);
  });
});
