import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";

const assistant = path.join(getInitAssetsDir(), ".qfai", "assistant");
const skill = (name: string) => path.join(assistant, "skill", name, "SKILL.md");
const rule = (name: string) => path.join(assistant, "rule", name);

describe("BF-0001 workflow definition", () => {
  // QFAI:EX-0001-0001-01
  it("keeps the five handoff phases in their declared order", async () => {
    const workflow = await readFile(rule("workflow.md"), "utf8");
    const ordered = [
      "Discussion (optional)",
      "Specification (SDD)",
      "Acceptance tests (ATDD)",
      "Implementation:",
      "Verify:",
    ].map((phase) => workflow.indexOf(phase));
    expect(ordered.every((position) => position >= 0)).toBe(true);
    expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
  });

  // QFAI:EX-0001-0001-02
  it("hands a fifteen-file discussion pack with REQ and NFR seeds to SDD", async () => {
    const discussion = await readFile(skill("qfai-discussion"), "utf8");
    const sdd = await readFile(skill("qfai-sdd"), "utf8");
    expect(discussion).toContain("unified 15-file discussion pack");
    expect(discussion).toContain("Capture scope, REQ, NFR");
    expect(sdd).toContain("Read the pack, its completed reviews");
  });

  // QFAI:EX-0001-0001-03
  // QFAI:EX-0001-0001-04
  it("routes the specification output to the three story-tree layers", async () => {
    const sdd = await readFile(skill("qfai-sdd"), "utf8");
    expect(sdd).toContain("`01_policy/");
    expect(sdd).toContain("`02_business-flow/");
    expect(sdd).toContain("`03_contract/");
    expect(sdd).toContain("BF → US → AC → EX ← BR");

    const seed = path.join(getInitAssetsDir(), ".qfai", "spec");
    const layers = await readdir(seed);
    expect(layers).toEqual(
      expect.arrayContaining(["01_policy", "02_business-flow", "03_contract"]),
    );
    expect(layers.some((entry) => entry.startsWith("spec-"))).toBe(false);
    const exampleStory = path.join(seed, "02_business-flow");
    expect((await readdir(exampleStory)).some((entry) => entry.includes("Test-Case"))).toBe(false);
  });

  // QFAI:EX-0001-0003-01
  // QFAI:EX-0001-0004-01
  it("defines an ordered, acyclic eight-stage workflow with the optional stages", async () => {
    const workflow = await readFile(rule("workflow.md"), "utf8");
    const stages = [...workflow.matchAll(/^([0-7])\. (.+)$/gm)].map((match) => ({
      number: Number(match[1]),
      label: match[2] ?? "",
    }));
    expect(stages.map(({ number }) => number)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(stages[0]?.label).toContain("Steering refresh");
    expect(stages[1]?.label).toContain("Discussion (optional)");
    expect(stages[4]?.label).toContain("Prototyping (optional)");
    expect(stages[5]?.label).toContain("Acceptance tests (ATDD)");
    expect(stages[6]?.label).toContain("Implementation:");
    expect(stages[7]?.label).toContain("Verify:");
    expect(workflow).toContain("At the beginning of each stage");
    expect(workflow).toContain("implements one EX at a time through Red, Green, Refactor");
    const configure = await readFile(skill("qfai-configure"), "utf8");
    expect(configure).toContain("Configure QFAI for this repository");
    expect(stages.every(({ label }) => !label.includes("Configure"))).toBe(true);
  });

  // QFAI:EX-0001-0004-02
  it("ships all eleven non-negotiable constitution articles", async () => {
    const constitution = await readFile(rule("constitution.md"), "utf8");
    const articles = [...constitution.matchAll(/^## Article ([IVX]+) — /gm)].map(
      (match) => match[1],
    );
    expect(articles).toEqual(["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"]);
    expect(constitution).toMatch(/non.negotiable operating rules/i);
  });

  // QFAI:EX-0001-0002-01
  // QFAI:EX-0001-0002-02
  // QFAI:EX-0001-0002-03
  it("defines the protected edits, change-request path, and evidence allowance", async () => {
    const drift = await readFile(rule("drift-protocol.md"), "utf8");
    expect(drift).toContain("A downstream skill does not edit an approved specification");
    expect(drift).toContain("1. Stop work on the affected obligation");
    expect(drift).toContain("2. Ask the SDD owner to append one DEC-NNNN row");
    expect(drift).toContain("3. Obtain the operator's explicit answer");
    expect(drift).toContain("4. Rerun the owner skill");
    expect(drift).toContain("5. Recheck every dependent BF, AC, and EX test obligation");
    expect(drift).toContain("6. Complete the decision row");
    expect(drift).toContain(
      "A stage may write evidence and reports in the locations its completion contract names",
    );
    expect(drift).toContain("A project may add a local overlay beside a shipped rule");
    expect(drift).toContain(
      "An owner skill may change its own upstream artifact after the required approval",
    );
  });
});
