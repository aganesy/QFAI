/**
 * Integration: the governance text a workflow run relies on.
 *
 * What authorizes a run's work and what a work order binds are stated once, in the constitution or a
 * shared baseline; `workflow.md` keeps the routes apart from the change types. That no article gains
 * an exception is held elsewhere and is not re-asserted here.
 */
// QFAI:SPEC-0001:TC-0001-0032
import { describe, expect, it } from "vitest";

import { flat, readShipped } from "../helpers/shippedAssistant.js";

const GOVERNANCE = [
  "constitution/constitution.md",
  "constitution/shared-skill-operating-baseline.md",
  "constitution/shared-skill-delegation-baseline.md",
];

describe("governance text for a workflow run", () => {
  it("TC-0001-0032: the constitution states request authority and binding, and routes are not change types", async () => {
    const governance = flat((await Promise.all(GOVERNANCE.map(readShipped))).join("\n"));
    expect(governance).toMatch(/the operator's first explicit request authorizes the run's work/i);
    expect(governance).toMatch(/a QFAI work order binds the stage to its target/i);

    const workflow = flat(await readShipped("constitution/workflow.md"));
    expect(workflow).toMatch(/the workflow routes are orthogonal to the Change Type/i);
  });
});
