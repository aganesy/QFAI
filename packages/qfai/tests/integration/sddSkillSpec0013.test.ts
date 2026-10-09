import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { runSddPreflight } from "../../src/core/preflight/sddPreflight.js";
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

const STEPS = ["sdd-triage", "sdd-flow", "sdd-story", "sdd-contract", "sdd-cycle", "sdd-gate"];

async function parent(): Promise<string> {
  return await readFile(path.join(skillRoot, "SKILL.md"), "utf-8");
}

/** The parent and its steps, read as one text with soft wraps collapsed. */
async function skill(): Promise<string> {
  const steps = await Promise.all(
    STEPS.map((name) =>
      readFile(path.join(skillRoot, "..", "..", "step", name, "STEP.md"), "utf-8"),
    ),
  );
  return [await parent(), ...steps].join("\n").replace(/[ \t]*\n[ \t]*/g, " ");
}

async function reference(name: string): Promise<string> {
  return await readFile(path.join(skillRoot, "references", name), "utf-8");
}

describe("shipped qfai-sdd story-tree contract", () => {
  it("writes concrete examples before the rules that cite them", async () => {
    const steps = /^steps: \[(.*)\]$/m.exec(await parent())?.[1] ?? "";
    const flow = steps.indexOf("sdd-flow");
    const story = steps.indexOf("sdd-story");
    const contract = steps.indexOf("sdd-contract");
    expect(flow).toBeGreaterThanOrEqual(0);
    expect(flow).toBeLessThan(story);
    expect(story).toBeLessThan(contract);
    expect(await skill()).toContain("Write a BR only after the EX it cites exists");
  });

  it("requires paired templates and exactly three files in a story directory", async () => {
    const content = await skill();
    expect(content).toContain(
      "The paired templates under `.qfai/assistant/skill/qfai-sdd/templates/spec/",
    );
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
    expect(content).toContain("Define a rule shared by contracts once");
    expect(content).toContain(
      "`<paths.contractsDir>/contracts.md` in the same change as every contract file written",
    );
  });

  it("uses four-column records with immutable content and no recycled IDs", async () => {
    const content = await skill();
    expect(content).toContain("ID | Content | Approach | Status");
    expect(content).toContain("Append rows only; afterwards change only Status");
    expect(content).toContain("including retired IDs named in decisions rows");
    expect(content).toContain("A change request Content begins `Change request:`");
  });

  it("gates each changed flow and reports it", async () => {
    const content = await skill();
    expect(content).toContain("npx qfai validate --profile sdd --fail-on error --flow BF-NNNN");
    expect(content).toContain("Report, per flow, in the stage report");
    expect(content).toContain("every finding of the specification review is fixed or answered");
  });

  // QFAI:EX-0001-0150-02
  it("gates each changed flow separately without inheriting a sibling worker's findings", async () => {
    const content = await skill();
    expect(content).toContain("Each BF written or changed");
    expect(content).toContain(
      "A worker's flow gate does not include a sibling flow still being edited",
    );
    expect(content).toContain("npx qfai validate --profile sdd --fail-on error --flow BF-NNNN");
    expect(content).not.toMatch(/--spec\b/);
  });

  // QFAI:EX-0001-0150-03
  it("runs the current BF-0001 SDD validators without error findings", async () => {
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

describe("SDD preflight stops only when no usable source exists", () => {
  const roots: string[] = [];

  afterEach(async () => {
    while (roots.length > 0) {
      const root = roots.pop();
      if (root) await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
    }
  });

  it("continues with a selected discussion pack even when it is incomplete", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-sdd-preflight-"));
    roots.push(root);
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20260924000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "06_REQ.md"),
      "# Requirements\n\n- REQ-0001: Save a draft.\n",
    );

    const result = await runSddPreflight(root, defaultConfig, { packDir });
    expect(result.status).toBe("ready");
    expect(result.selectedInputPath).toBe(packDir);
    expect(result.packGaps.length).toBeGreaterThan(0);
  });

  // QFAI:AC-0001-0148-03
  // QFAI:EX-0001-0148-01
  it("continues when the selected pack has no 06_REQ.md and records it as a gap", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-sdd-preflight-"));
    roots.push(root);
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20260924000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(path.join(packDir, "01_Context.md"), "# Context\n\nSave drafts.\n");

    const result = await runSddPreflight(root, defaultConfig, { packDir });
    expect(result.status).toBe("ready");
    expect(result.packGaps.some((gap) => gap.includes("06_REQ.md"))).toBe(true);
  });

  // QFAI:AC-0001-0151-01
  // QFAI:EX-0001-0151-01
  // QFAI:AC-0001-0148-01
  // QFAI:EX-0001-0148-03
  it("stops when no usable discussion or import-lite source exists", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-sdd-preflight-"));
    roots.push(root);

    const result = await runSddPreflight(root, defaultConfig);
    expect(result.status).toBe("blocked");
    expect(result.selectedInputPath).toBeNull();
    expect(result.blockers.length).toBeGreaterThan(0);
  });
});
