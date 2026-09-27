/**
 * Integration: the delegation baseline carries the actor history across a run.
 *
 * The history travels with every work order, an author or recommender never counts as its own
 * independent reviewer, and no required reviewer is dropped to save tokens. Refusing a reviewer
 * that is not independent is the workflow core's.
 */
// QFAI:SPEC-0015:TC-0015-0040
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../helpers/shippedAssistant.js";

const BASELINE = "constitution/shared-skill-delegation-baseline.md";
const PASSAGE = "### Actor history in a run";

describe("TC-0015-0040: the delegation baseline carries the actor history across a run", () => {
  it("TC-0015-0040: the history travels with every work order, and an author or recommender is never its own independent reviewer", async () => {
    const passage = flat(sectionOf(await readShipped(BASELINE), PASSAGE));
    expect(passage, `${BASELINE} has ${PASSAGE}`).not.toBe("");
    expect(passage).toMatch(
      /the run's history of authors, recommenders and reviewers travels with every work order/i,
    );
    expect(passage).toMatch(
      /recorded there as the author or recommender of an artifact never counts as that artifact's independent reviewer/i,
    );
    expect(passage).toMatch(/no required reviewer is dropped to save tokens/i);
  });
});
