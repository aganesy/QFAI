/**
 * Integration: the entry check every stage skill runs, as the shipped operating baseline states it.
 *
 * One row per state of the stage-skill handover: hand the request over, work the order, no check at
 * all, and the kept failure — a work order that matches no issued one.
 */
// QFAI:SPEC-0001:TC-0001-0026
// QFAI:SPEC-0001:TC-0001-0027
import { describe, expect, it } from "vitest";

import { readShipped, rowOf, sectionOf } from "../helpers/shippedAssistant.js";

const BASELINE = "constitution/shared-skill-operating-baseline.md";

async function entryCheck(): Promise<string> {
  return sectionOf(await readShipped(BASELINE), "## Workflow Run Entry Check");
}

describe("stage-skill entry check", () => {
  it("TC-0001-0026: the entry check hands over, works the order, or is off", async () => {
    const section = await entryCheck();
    expect(section, "the section exists").not.toBe("");

    const passOn = rowOf(section, "`pass-on`");
    expect(passOn).toMatch(/`active`/);
    expect(passOn).toMatch(/neither invoked by name nor handed a QFAI work order/i);
    expect(passOn).toMatch(/edit nothing/i);
    expect(passOn).toMatch(/pass the request to `qfai-run` in the same turn/i);
    expect(passOn).toMatch(/at most one line/i);

    const worker = rowOf(section, "`worker`");
    expect(worker).toMatch(/`active`/);
    expect(worker).toMatch(/run, stage and work-order IDs/i);
    expect(worker).toMatch(/do only that work/i);

    const off = rowOf(section, "`off`");
    expect(off).toMatch(/`off`.*`shadow`|`shadow`.*`off`/);
    expect(off).toMatch(/no entry check/i);
  });

  it("TC-0001-0027: a work order that matches no issued one edits nothing and is refused", async () => {
    const mismatch = rowOf(await entryCheck(), "`error`");
    expect(mismatch).toMatch(/matches no issued one/i);
    expect(mismatch).toMatch(/edit nothing/i);
    expect(mismatch).toMatch(/return the refusal to the harness/i);
  });
});
