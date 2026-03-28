import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const skillPath = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "web-research",
  "SKILL.md",
);

async function readSkill(): Promise<string> {
  return readFile(skillPath, "utf-8");
}

describe("web-research evaluation metrics and HITL gates", { timeout: 15_000 }, () => {
  // QFAI:SPEC-0027:TC-0027-0017 (TDD-0025)
  it("golden task evaluation - 4 metrics scored", async () => {
    const content = await readSkill();

    // Must contain all 4 metric names
    const metrics = ["citation precision", "coverage", "freshness", "security hygiene"];
    for (const metric of metrics) {
      expect(content.toLowerCase()).toContain(metric);
    }

    // Must reference golden task
    expect(content).toMatch(/golden[_\s-]?task/i);
  });

  // QFAI:SPEC-0027:TC-0027-0018 (TDD-0026)
  it("HITL gate triggers for high-risk conclusions", async () => {
    const content = await readSkill();

    // Must mention HITL / human-in-the-loop
    expect(content).toMatch(/hitl|human[_\s-]?in[_\s-]?the[_\s-]?loop/i);

    // Must mention high-risk and trigger/gate
    expect(content).toMatch(/high[_\s-]?risk/i);
    expect(content).toMatch(/trigger|gate/i);
  });

  // QFAI:SPEC-0027:TC-0027-0019 (TDD-0027)
  it("HITL gate auto-approves low-risk", async () => {
    const content = await readSkill();

    // Must mention low-risk and auto-approve
    expect(content).toMatch(/low[_\s-]?risk/i);
    expect(content).toMatch(/auto[_\s-]?approv/i);
  });

  // QFAI:SPEC-0027:TC-0027-0020 (TDD-0028)
  it("security gate bypass prevention - --yolo ignored for security", async () => {
    const content = await readSkill();

    // Must mention --yolo and bypass/ignored/prevent
    expect(content).toMatch(/--yolo|yolo/i);
    expect(content).toMatch(/bypass|ignored|prevent/i);

    // Must mention security-critical or security gate
    expect(content).toMatch(/security[_\s-]?(critical|gate)/i);
  });
});
