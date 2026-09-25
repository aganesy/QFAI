/**
 * Integration: under a work order, the discussion takes what `settled` records as settled.
 *
 * The routing result and every answered question are not asked again, and the discussion covers
 * only the scope `settled` leaves unresolved.
 */
// QFAI:SPEC-0010:TC-0010-0014
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../helpers/shippedAssistant.js";

const REF = "skills/qfai-discussion/references/orchestrated-mode.md";

describe("TC-0010-0014: the discussion takes the work order's settled inputs as settled", () => {
  it("TC-0010-0014: settled inputs are not asked again, and only the unresolved scope is covered", async () => {
    const text = flat(sectionOf(await readShipped(REF), "## What is already settled"));
    expect(text, `${REF} has ## What is already settled`).not.toBe("");
    expect(text).toMatch(
      /what the work order's `settled` field records, the checked proposal's routing result and every answered question with its chosen answer, is taken as settled and not asked again/i,
    );
    expect(text).toMatch(/the discussion covers only the scope `settled` leaves unresolved/i);
  });
});
