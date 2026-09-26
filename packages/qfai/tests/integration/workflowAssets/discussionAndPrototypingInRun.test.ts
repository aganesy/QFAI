/**
 * Integration: what `/qfai-discussion` and `/qfai-prototyping` do when a workflow run hands them a
 * work order.
 *
 * Reads each skill's shipped `references/orchestrated-mode.md`. The workflow core's checks at
 * `accept` are not this module's.
 */
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

const DISCUSSION = "skill/qfai-discussion/references/orchestrated-mode.md";
const PROTOTYPING = "skill/qfai-prototyping/references/orchestrated-mode.md";
const ENTRY_CHECK =
  "`.qfai/assistant/rule/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory`";

async function citingLines(skill: string): Promise<string[]> {
  const body = await readShipped(`skill/${skill}/SKILL.md`);
  return body.split("\n").filter((line) => line.includes("references/orchestrated-mode.md"));
}

async function section(file: string, heading: string): Promise<string> {
  const text = flat(sectionOf(await readShipped(file), heading));
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

describe("qfai-discussion in a workflow run", () => {
  // QFAI:AC-0001-0206-01
  // QFAI:EX-0001-0206-01
  it("takes what the work order settled as settled and covers only the rest", async () => {
    const text = await section(DISCUSSION, "## What is already settled");
    expect(text).toMatch(
      /the checked proposal's routing result and every answered question with its chosen answer, is taken as settled and not asked again/i,
    );
    expect(text).toMatch(/the discussion covers only the scope `settled` leaves unresolved/i);
  });

  // QFAI:AC-0001-0206-02
  // QFAI:EX-0001-0206-02
  it("follows the entry check and cites its reference on one SKILL.md line", async () => {
    expect(await citingLines("qfai-discussion")).toHaveLength(1);
    const reference = flat(await readShipped(DISCUSSION));
    expect(reference).toContain(`Run the entry check in ${ENTRY_CHECK} first.`);
    expect(reference).toMatch(/applies only to the `worker` state/i);
  });
});

describe("qfai-prototyping in a workflow run", () => {
  // QFAI:AC-0001-0211-01
  // QFAI:EX-0001-0211-01
  it("follows the entry check and cites its reference on one SKILL.md line", async () => {
    expect(await citingLines("qfai-prototyping")).toHaveLength(1);
    const reference = flat(await readShipped(PROTOTYPING));
    expect(reference).toContain(`Run the entry check in ${ENTRY_CHECK} first.`);
    expect(reference).toMatch(/applies only to the `worker` state/i);
  });

  // QFAI:AC-0001-0211-03
  // QFAI:EX-0001-0211-03
  it("works only on the UI contracts that serve the bound flow and creates none", async () => {
    const text = await section(PROTOTYPING, "## Work order scope");
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

  // QFAI:AC-0001-0211-04
  // QFAI:EX-0001-0211-04
  it("writes nothing and returns blocked when no UI contract serves the bound flow", async () => {
    const text = await section(PROTOTYPING, "## Work order scope");
    expect(text).toMatch(/writes no `DESIGN\.md`, no UI contract and no surface declaration/i);
    expect(text).toMatch(
      /returns outcome `blocked` with one `debts` entry naming the missing UI surface/i,
    );
    expect(text).toMatch(/`owningFlow` the bound flow and `resolvingOwner` `operator`/i);
  });
});
