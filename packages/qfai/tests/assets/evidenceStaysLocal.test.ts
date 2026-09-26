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
  // QFAI:EX-0001-0002-13
  it("states the rule once, in the drift protocol", async () => {
    const drift = await read("rule/drift-protocol.md");
    expect(drift).toContain("## Evidence stays local");
    expect(drift).toContain("Git ignores that directory; never commit anything in it.");
    expect(drift).toContain("Reviewers read the evidence in the working tree");
    expect(drift).toContain("goes into the story tree");
  });

  // QFAI:EX-0001-0002-13
  it("points the orchestrator at the rule", async () => {
    const orchestrator = await read("agent/orchestrator.md");
    expect(orchestrator).toContain("rule/drift-protocol.md#evidence-stays-local");
  });

  // QFAI:EX-0001-0073-05
  it("keeps the ATDD evidence file local and lets the annotated tests carry the coverage", async () => {
    const atdd = await read("skill/qfai-atdd/SKILL.md");
    expect(atdd).toContain(".qfai/evidence/atdd-BF-NNNN.md");
    expect(atdd).toContain("The evidence file is local and never committed");
    expect(atdd).toContain("The annotated tests carry the coverage");
  });

  // QFAI:EX-0001-0002-13
  it("lets implement find the acceptance tests without the local handoff", async () => {
    const implement = await read("skill/qfai-implement/SKILL.md");
    expect(implement).toContain("where this checkout lacks it, find the tests by their");
  });

  // QFAI:EX-0001-0002-13
  it("keeps prototyping outputs and checks local", async () => {
    const prototyping = await read("skill/qfai-prototyping/SKILL.md");
    expect(prototyping).toContain("it stays local and is never committed");
    expect(prototyping).toContain("CI does not run them");
  });

  // QFAI:EX-0001-0002-13
  it("records an approval in the decision row, not in a committed run record", async () => {
    const payloads = await read("skill/qfai-run/references/payloads.md");
    expect(payloads).toContain("is written into the `decisions.md` row the run appends");
    expect(payloads).toContain("stay local and are never committed");
  });
});
