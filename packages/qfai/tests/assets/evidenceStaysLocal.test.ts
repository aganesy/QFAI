/**
 * `.qfai/evidence/` is a local work area: git ignores it and nothing in it is
 * committed. Reviewers read it during the work; the story tree, the decision
 * rows and the tests carry what has to outlast it.
 *
 * These cases pin the shipped instructions to that rule: each names the
 * wording that has to be there and the instruction to commit that has to be
 * gone.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

const assistant = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../assets/init/.qfai/assistant",
);

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const read = async (rel: string): Promise<string> =>
  (await readFile(path.join(assistant, rel), "utf-8")).replace(/\s*\n\s*/g, " ");

describe("shipped instructions keep evidence local", () => {
  it("states the rule once, in the drift protocol", async () => {
    const drift = await read("rule/drift-protocol.md");
    expect(drift).toContain("## Evidence stays local");
    expect(drift).toContain("Git ignores that directory; never commit anything in it.");
    expect(drift).toContain("Reviewers read the evidence in the working tree");
    expect(drift).toContain("goes into the story tree");
    expect(drift).not.toContain("Commit durable decision rows");
  });

  it("points the orchestrator at the rule instead of a commit", async () => {
    const orchestrator = await read("agent/orchestrator.md");
    expect(orchestrator).toContain("rule/drift-protocol.md#evidence-stays-local");
    expect(orchestrator).not.toContain("Commit the current BF stage evidence");
    expect(orchestrator).not.toContain("present and committed");
  });

  it("drops the ATDD commit and the coverage depth matrix", async () => {
    const atdd = await read("skill/qfai-atdd/SKILL.md");
    expect(atdd).toContain(".qfai/evidence/atdd-BF-NNNN.md");
    expect(atdd).toContain("The evidence file is local and never committed");
    expect(atdd).toContain("The annotated tests carry the coverage");
    expect(atdd).not.toContain("Commit both evidence files");
  });

  it("names no coverage depth matrix anywhere in the shipped tree", async () => {
    const files = await fg(["**/*.md"], { cwd: assistant, dot: true });
    const hits: string[] = [];
    for (const rel of files) {
      const text = await read(rel);
      if (/coverage-depth|Coverage Depth Matrix/i.test(text)) hits.push(rel);
    }
    expect(hits).toEqual([]);
  });

  it("lets implement find the acceptance tests without the local handoff", async () => {
    const implement = await read("skill/qfai-implement/SKILL.md");
    expect(implement).toContain("where this checkout lacks it, find the tests by their");
  });

  it("keeps prototyping outputs and checks local", async () => {
    const prototyping = await read("skill/qfai-prototyping/SKILL.md");
    expect(prototyping).toContain("it stays local and is never committed");
    expect(prototyping).toContain("CI does not run them");
    expect(prototyping).not.toContain("negates this path");
  });

  it("records an approval in the decision row, not in a committed run record", async () => {
    const payloads = await read("skill/qfai-run/references/payloads.md");
    expect(payloads).toContain("is written into the `decisions.md` row the run appends");
    expect(payloads).toContain("stay local and are never committed");
  });
});
