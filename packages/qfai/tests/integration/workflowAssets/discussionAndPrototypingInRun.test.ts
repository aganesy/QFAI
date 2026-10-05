/**
 * Integration: what `/qfai-prototyping` does when a route plans it.
 *
 * Reads the shipped parent skill and its steps.
 */
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

const PROTOTYPING_SCOPE_STEP = "step/prototyping-grill/STEP.md";
const ENTRY_CHECK =
  "`.qfai/assistant/rule/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory`";

async function section(file: string, heading: string): Promise<string> {
  const text = flat(sectionOf(await readShipped(file), heading));
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

describe("qfai-prototyping in a workflow run", () => {
  it("follows the entry check and cites it on one SKILL.md line", async () => {
    const body = await readShipped("skill/qfai-prototyping/SKILL.md");
    const citing = body
      .split("\n")
      .filter((line) => line.includes("workflow-run-entry-check-mandatory"));
    expect(citing).toHaveLength(1);
    expect(flat(body)).toContain(`Run the entry check of ${ENTRY_CHECK} first.`);
  });

  // QFAI:AC-0001-0204-03
  // QFAI:EX-0001-0204-03
  it("works only on the UI contracts that serve the bound flow and creates none", async () => {
    const text = await section(PROTOTYPING_SCOPE_STEP, "## Scope");
    expect(text).toMatch(
      /works only on the UI-bearing UI contracts that serve the business flow the work order's `target` binds/i,
    );
    expect(text).toMatch(
      /a contract serves a flow when one of its rules cites an example of one of that flow's stories/i,
    );
    expect(text).toMatch(
      /changes no UI contract that serves only another flow, and creates no contract/i,
    );
    expect(text).toMatch(/a standalone invocation still resolves every UI-bearing UI contract/i);
  });

  // QFAI:AC-0001-0204-04
  // QFAI:EX-0001-0204-04
  it("writes nothing and returns blocked when no UI contract serves the bound flow", async () => {
    const text = await section(PROTOTYPING_SCOPE_STEP, "## Scope");
    expect(text).toMatch(/writes no `DESIGN\.md`, no UI contract and no surface declaration/i);
    expect(text).toMatch(
      /returns outcome `blocked` with one `debts` entry naming the missing UI surface/i,
    );
    expect(text).toMatch(/`owningFlow` the bound flow and `resolvingOwner` `operator`/i);
  });
});
