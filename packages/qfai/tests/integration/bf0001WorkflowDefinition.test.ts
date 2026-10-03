import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";
import { readDiscussionSkill } from "../helpers/discussionSteps.js";

const assistant = path.join(getInitAssetsDir(), ".qfai", "assistant");
const skill = (name: string) => path.join(assistant, "skill", name, "SKILL.md");
const rule = (name: string) => path.join(assistant, "rule", name);

/** `qfai-sdd` and its steps, read as one text with soft wraps collapsed. */
async function readSdd(): Promise<string> {
  const steps = ["sdd-triage", "sdd-flow", "sdd-story", "sdd-contract", "sdd-cycle", "sdd-gate"];
  const texts = await Promise.all([
    readFile(skill("qfai-sdd"), "utf8"),
    ...steps.map((name) => readFile(path.join(assistant, "step", name, "STEP.md"), "utf8")),
  ]);
  return texts.join("\n").replace(/\s+/g, " ");
}

describe("BF-0001 workflow definition", () => {
  // QFAI:EX-0001-0006-05
  it("keeps the sample's executable quality commands in tech.md only", async () => {
    const seed = path.join(assistant, "skill", "qfai-sdd", "templates", "spec");
    const techPath = path.join(seed, "03_contract", "tech.md");
    const tech = await readFile(techPath, "utf8");
    const labels = [
      "Install",
      "Format",
      "Test",
      "Lint",
      "Typecheck",
      "Build",
      "Skeleton",
      "Validate",
    ];
    const commandRows = (content: string) =>
      content.match(/^- (?:Install|Format|Test|Lint|Typecheck|Build|Skeleton|Validate): .+$/gm) ??
      [];
    const section = tech
      .split(/^## /m)
      .find((part) => part.startsWith("Standard commands (copy-paste)"));
    expect(section).toBeDefined();
    expect(commandRows(section ?? "").map((row) => row.split(":")[0]?.slice(2))).toEqual(labels);
    expect(commandRows(tech)).toEqual(commandRows(section ?? ""));

    const visit = async (directory: string): Promise<void> => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          await visit(file);
        } else if (entry.isFile() && file !== techPath) {
          expect(commandRows(await readFile(file, "utf8")), file).toEqual([]);
        }
      }
    };
    await visit(seed);
    const config = await readFile(
      path.join(getInitAssetsDir(), "root", "qfai.config.yaml"),
      "utf8",
    );
    expect(commandRows(config)).toEqual([]);
  });

  // QFAI:EX-0001-0001-01
  it("keeps the five handoff phases in their declared order", async () => {
    const workflow = await readFile(rule("workflow.md"), "utf8");
    const ordered = [
      "Discussion (optional)",
      "Specification (SDD)",
      "writes the BF E2E and AC integration or API tests",
      "implements one EX at a time",
      "Verify:",
    ].map((phase) => workflow.indexOf(phase));
    expect(ordered.every((position) => position >= 0)).toBe(true);
    expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
  });

  // QFAI:EX-0001-0001-02
  it("hands a fifteen-file discussion pack with REQ and NFR seeds to SDD", async () => {
    const discussion = await readDiscussionSkill(assistant);
    const sdd = await readSdd();
    expect(discussion).toContain("unified 15-file discussion pack");
    expect(discussion).toContain("Capture scope, REQ, NFR");
    expect(sdd).toContain("Read the pack, its completed reviews");
  });

  // QFAI:EX-0001-0017-01
  it("instructs SDD to reconcile discussion and completed reviews in its own evidence", async () => {
    const sdd = await readSdd();
    const playbook = await readFile(
      path.join(assistant, "skill", "qfai-sdd", "references", "sdd-execution-playbook.md"),
      "utf8",
    );
    const checklist = await readFile(
      path.join(assistant, "skill", "qfai-sdd", "references", "sdd-phase-checklists.md"),
      "utf8",
    );
    expect(sdd).toContain("Read the pack, its completed reviews");
    expect(sdd).toContain("Record a discrepancy in an SDD-owned row or evidence");
    expect(sdd).toContain("do not edit the");
    expect(playbook).toContain("Disposition its applicable review advice in SDD evidence");
    expect(checklist).toContain("A disagreement was resolved in an SDD-owned artifact");
  });

  // QFAI:EX-0001-0001-03
  it("routes the specification output to the three story-tree layers", async () => {
    const sdd = await readSdd();
    expect(sdd).toContain("`01_policy/");
    expect(sdd).toContain("`02_business-flow/");
    expect(sdd).toContain("`03_contract/");
    expect(sdd).toContain("BF → US → AC → EX ← BR");

    const seed = path.join(assistant, "skill", "qfai-sdd", "templates", "spec");
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
  it("defines an ordered, acyclic seven-stage workflow with the optional stages", async () => {
    const workflow = await readFile(rule("workflow.md"), "utf8");
    const canonicalStages = workflow.split("## Stages (canonical)")[1]?.split("\nStage 3")[0] ?? "";
    const stages = [...canonicalStages.matchAll(/^([0-7])\. (.+)$/gm)].map((match) => ({
      number: Number(match[1]),
      label: match[2] ?? "",
    }));
    expect(stages.map(({ number }) => number)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(stages[0]?.label).toContain("Steering refresh");
    expect(stages[1]?.label).toContain("Discussion (optional)");
    expect(stages[4]?.label).toContain("Prototyping (optional)");
    expect(stages[5]?.label).toContain("Implementation:");
    expect(stages[5]?.label).toContain("integration or API tests with empty bodies");
    expect(stages[6]?.label).toContain("Verify:");
    expect(workflow).toContain("At the beginning of each stage");
    expect(workflow).toContain("implements one EX at a time through Red, Green, Refactor");
    const configure = await readFile(skill("qfai-configure"), "utf8");
    expect(configure).toContain("Configure QFAI for this repository");
    expect(stages.every(({ label }) => !label.includes("Configure"))).toBe(true);
  });

  // QFAI:AC-0001-0004-05
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
    expect(drift).toContain("2. Prepare the change request for the SDD owner");
    expect(drift).toContain("3. Obtain the user's explicit answer");
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

  // QFAI:EX-0001-0007-09
  // QFAI:EX-0001-0007-10
  it("records an approved change request, retirement included, as one decision row", async () => {
    const sdd = await readSdd();
    const triage = (
      await readFile(
        path.join(assistant, "skill", "qfai-sdd", "references", "sdd-triage.md"),
        "utf8",
      )
    ).replace(/\s+/g, " ");
    expect(sdd).toContain("Record in `<paths.specsDir>/decisions.md` only what the user approved");
    expect(sdd).toContain(
      "Do not write a second decision-record directory or a retired story file",
    );
    expect(triage).toContain(
      "Retiring a story removes its directory under the change request that names it, with no separate retired-story file",
    );
  });

  // QFAI:EX-0001-0012-03
  // QFAI:EX-0001-0012-04
  it("keeps shared drift rules under rule and implement-only guidance under its references", async () => {
    const drift = await readFile(rule("drift-protocol.md"), "utf8");
    const implement = await readFile(skill("qfai-implement"), "utf8");
    const credentials = await readFile(
      path.join(assistant, "skill", "qfai-implement", "references", "credential-reuse.md"),
      "utf8",
    );
    expect(drift).toContain("# Drift Protocol");
    expect(implement).toContain("[DRIFT-PROTOCOL:MANDATORY]");
    expect(credentials.length).toBeGreaterThan(0);
  });
});
