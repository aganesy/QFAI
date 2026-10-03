/**
 * Integration: what `/qfai-discussion` and `/qfai-prototyping` do when a workflow run hands them a
 * work order.
 *
 * Reads the shipped parent skills, their steps and the operating baseline they cite. The workflow
 * core's checks at `accept` are not this module's.
 */
import { describe, expect, it } from "vitest";

import { flat, readShipped, rowOf, sectionOf } from "../../helpers/shippedAssistant.js";

const DISCUSSION_INTERVIEW_STEP = "step/discussion-interview/STEP.md";
const PROTOTYPING_SCOPE_STEP = "step/prototyping-grill/STEP.md";
const OPERATING = "rule/shared-skill-operating-baseline.md";
const ENTRY_CHECK =
  "`.qfai/assistant/rule/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory`";

async function section(file: string, heading: string): Promise<string> {
  const text = flat(sectionOf(await readShipped(file), heading));
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

describe("qfai-discussion in a workflow run", () => {
  // QFAI:AC-0001-0199-01
  // QFAI:EX-0001-0199-01
  it("takes what the work order settled as settled and covers only the rest", async () => {
    const text = await section(DISCUSSION_INTERVIEW_STEP, "## Procedure");
    expect(text).toMatch(/what the work order's `settled` field records is not asked again/i);
    expect(text).toMatch(/the interview covers only the product scope it leaves unresolved/i);
  });

  // QFAI:AC-0001-0199-02
  // QFAI:EX-0001-0199-02
  it("runs the entry check before its steps, and a work order only the steps it names", async () => {
    const skill = flat(await readShipped("skill/qfai-discussion/SKILL.md"));
    expect(skill).toContain("shared-skill-operating-baseline.md#a-parent-skill-invoked-by-name");
    expect(skill).toContain("shared-skill-operating-baseline.md#a-work-orders-steps");
    const byName = await section(OPERATING, "### A parent skill invoked by name");
    expect(byName).toContain("Run the [entry check](#workflow-run-entry-check-mandatory)");
    const entry = sectionOf(await readShipped(OPERATING), "## Workflow Run Entry Check");
    expect(rowOf(entry, "| `pass-on`")).toMatch(/Edit nothing\. Pass the request to `qfai-run`/);
    expect(rowOf(entry, "| `step`")).toMatch(/Do only that step.s work/);
  });
});

describe("qfai-prototyping in a workflow run", () => {
  // QFAI:AC-0001-0204-01
  // QFAI:EX-0001-0204-01
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
