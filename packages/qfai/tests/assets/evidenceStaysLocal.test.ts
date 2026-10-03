/**
 * `.qfai/evidence/` is a local work area: git ignores it and nothing in it is
 * committed. Reviewers read it during the work; the story tree, the decision
 * rows and the tests carry what has to outlast it.
 *
 * These cases pin the shipped instructions to that rule by the wording each
 * one has to carry.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const assistant = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../assets/init/.qfai/assistant",
);

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const read = async (rel: string): Promise<string> =>
  (await readFile(path.join(assistant, rel), "utf-8")).replace(/\s*\n\s*/g, " ");

describe("shipped instructions keep evidence local", () => {
  // QFAI:EX-0001-0002-08
  it("states the rule once, in the drift protocol", async () => {
    const drift = await read("rule/drift-protocol.md");
    expect(drift).toContain("## Evidence stays local");
    expect(drift).toContain("Git ignores that directory; never commit anything in it.");
    expect(drift).toContain("Reviewers read the evidence in the working tree");
    expect(drift).toContain("goes into the story tree");
  });

  // QFAI:EX-0001-0002-08
  it("points the orchestrator at the rule", async () => {
    const orchestrator = await read("agent/orchestrator.md");
    expect(orchestrator).toContain("rule/drift-protocol.md#evidence-stays-local");
  });

  // QFAI:EX-0001-0071-04
  it("keeps the ATDD evidence file local and lets the annotated tests carry the coverage", async () => {
    const atdd = await read("step/atdd-author/STEP.md");
    const evidence = await read("step/common-evidence-record/STEP.md");
    expect(atdd).toContain(".qfai/evidence/atdd-BF-NNNN.md");
    expect(atdd).toContain("`common-evidence-record`");
    expect(evidence).toContain("stays local and is never committed");
    expect(atdd).toContain("The annotated tests carry the coverage");
  });

  // QFAI:EX-0001-0002-08
  it("lets implement find the acceptance tests without the local handoff", async () => {
    const implement = await read("step/implement-tdd/STEP.md");
    expect(implement).toContain("where this checkout lacks it, find the tests by their");
  });

  // QFAI:EX-0001-0002-08
  it("keeps prototyping outputs and checks local", async () => {
    const grill = await read("step/prototyping-grill/STEP.md");
    expect(grill).toContain("it stays local and is never committed");
    const handoff = await read("step/prototyping-handoff/STEP.md");
    expect(handoff).toContain("CI does not run them");
  });

  // QFAI:EX-0001-0002-08
  it("records an approval in the decision row, not in a committed run record", async () => {
    const skill = await read("skill/qfai-run/SKILL.md");
    expect(skill).toMatch(
      /is one `decisions\.md` row naming what was\s+approved, who approved it, when, and the label of the option chosen/,
    );
    const plan = await read("skill/qfai-run/references/plan.md");
    expect(plan).toContain("Each call prints one JSON document and writes no file.");
  });
});
