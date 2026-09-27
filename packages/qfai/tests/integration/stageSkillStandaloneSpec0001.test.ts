/**
 * Integration: a stage invoked by name runs standalone, as the shipped operating baseline states it.
 */
// QFAI:SPEC-0001:TC-0001-0029
import { describe, expect, it } from "vitest";

import { readShipped, rowOf, sectionOf } from "../helpers/shippedAssistant.js";

const BASELINE = "constitution/shared-skill-operating-baseline.md";

describe("stage invoked by name", () => {
  it("TC-0001-0029: a stage invoked by name runs standalone and ends at that stage", async () => {
    const section = sectionOf(await readShipped(BASELINE), "## Workflow Run Entry Check");
    const byName = rowOf(section, "`by-name`");
    expect(byName, "the by-name row exists").not.toBe("");

    expect(byName).toMatch(/run standalone and end at this stage/i);
    expect(byName).toMatch(/start no other stage/i);
    expect(byName).toMatch(/a request to take the work to the end becomes a whole run/i);
  });
});
