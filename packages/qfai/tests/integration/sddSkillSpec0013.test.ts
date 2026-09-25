import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { validateProject } from "../../src/core/validate.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..", "..");
const skillRoot = path.resolve(
  here,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skill",
  "qfai-sdd",
);

async function skill(): Promise<string> {
  return await readFile(path.join(skillRoot, "SKILL.md"), "utf-8");
}

async function reference(name: string): Promise<string> {
  return await readFile(path.join(skillRoot, "references", name), "utf-8");
}

describe("shipped qfai-sdd story-tree contract", () => {
  it("writes concrete examples before the rules that cite them", async () => {
    const content = await skill();
    const policy = content.indexOf("1. `01_policy/`");
    const flow = content.indexOf("2. `02_business-flow/`");
    const story = content.indexOf("3. Each flow's");
    const contract = content.indexOf("4. `03_contract/`");
    expect(policy).toBeGreaterThanOrEqual(0);
    expect(policy).toBeLessThan(flow);
    expect(flow).toBeLessThan(story);
    expect(story).toBeLessThan(contract);
    expect(content).toContain("A BR never cites an unwritten EX");
  });

  it("requires paired templates and exactly three files in a story directory", async () => {
    const content = await skill();
    expect(content).toContain("paired template under `templates/spec/`");
    expect(content).toContain("`01_User-story.md`");
    expect(content).toContain("`02_Acceptance-Criteria.md`");
    expect(content).toContain("`03_Example.md`");
    expect(content).toContain("Do not create another document inside a story directory");
  });

  it("requires the complete BF to contract trace and a real Mermaid flow", async () => {
    const content = await skill();
    expect(content).toContain("BF → US → AC → EX ← BR");
    expect(content).toMatch(/Mermaid `flowchart` or `sequenceDiagram`/);
    expect(content).toContain(
      "Every EX cites one AC; every AC and BR has an EX; every EX has a BR",
    );
    expect(content).toContain("Give each EX exactly one existing AC");
  });

  it("keeps contract rules and their index rows together", async () => {
    const content = await skill();
    expect(content).toContain("Put each BR in the contract that enforces it");
    expect(content).toContain("shared by contracts is defined once");
    expect(content).toContain(
      "Add a row to `<paths.contractsDir>/contracts.md` in the same change",
    );
  });

  it("uses four-column records with immutable content and no recycled IDs", async () => {
    const content = await skill();
    expect(content).toContain("ID | Content | Approach | Status");
    expect(content).toContain("Append rows only; afterwards change only Status");
    expect(content).toContain("including retired IDs named in decisions rows");
    expect(content).toContain("A change request Content begins `Change request:`");
  });

  it("gates each changed flow and keeps its own evidence", async () => {
    const content = await skill();
    expect(content).toContain("npx qfai validate --profile sdd --fail-on error --flow BF-NNNN");
    expect(content).toContain(".qfai/evidence/sdd-BF-NNNN.md");
    expect(content).toContain("templates/evidence/sdd-flow.md");
    expect(content).toContain("routed blocking reviewer cycle");
  });

  it("gates each changed flow separately without inheriting a sibling worker's findings", async () => {
    // QFAI:EX-0001-0155-02
    const content = await skill();
    expect(content).toContain("for each BF written or changed");
    expect(content).toContain(
      "A worker's flow gate does not include a sibling flow still being edited",
    );
    expect(content).toContain("npx qfai validate --profile sdd --fail-on error --flow BF-NNNN");
    expect(content).not.toMatch(/--spec\b/);
  });

  it("runs the current BF-0001 SDD validators without error findings", async () => {
    // QFAI:EX-0001-0155-03
    const content = await skill();
    expect(content).toContain("npx qfai validate --profile sdd --fail-on error --flow BF-NNNN");
    const result = await validateProject(repoRoot, undefined, {
      profile: "sdd",
      flowIds: ["BF-0001"],
    });
    expect(result.profile).toBe("sdd");
    expect(result.profileValidatorsRan).toBe(true);
    expect(result.counts.error).toBe(0);
  });

  it("does not carry the retired layout or gate", async () => {
    const files = [
      await skill(),
      await reference("sdd-execution-playbook.md"),
      await reference("sdd-phase-checklists.md"),
      await reference("sdd-triage.md"),
      await reference("spec-traceability-rules.md"),
      await reference("sdd-quality-gate.md"),
      await reference("review-cycle-playbook.md"),
    ];
    for (const content of files) {
      expect(content).not.toMatch(/--spec\b/);
      expect(content).not.toMatch(/04_Business-Rules\.md/);
      expect(content).not.toMatch(/\.qfai\/decisions\//);
      expect(content).not.toMatch(/tdd\/test-list\.md/);
      expect(content).not.toMatch(/Contracts-first/i);
    }
  });
});
