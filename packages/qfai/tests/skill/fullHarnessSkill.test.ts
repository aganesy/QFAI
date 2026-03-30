/**
 * Full-harness skill tests — spec-0035 TDD-0010..TDD-0012, TDD-0014, TDD-0016..TDD-0018
 *
 * QFAI:SPEC-0035:TC-0035-0010
 * QFAI:SPEC-0035:TC-0035-0011
 * QFAI:SPEC-0035:TC-0035-0012
 * QFAI:SPEC-0035:TC-0035-0014
 * QFAI:SPEC-0035:TC-0035-0016
 * QFAI:SPEC-0035:TC-0035-0017
 * QFAI:SPEC-0035:TC-0035-0018
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateFullHarnessSkill } from "../../src/core/validators/skill/fullHarnessSkill.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-harness-"));
  tempDirs.push(dir);
  return dir;
}

const VALID_HARNESS_CONTENT = [
  "# Full-Harness Prototyping Skill",
  "",
  "## Workflow Loop",
  "",
  "The full-harness mode executes an iteration loop with convergence criteria.",
  "Each iteration produces evidence and feeds into the next cycle.",
  "",
  "### Evidence Collection",
  "",
  "Render evidence, test results, and validator output are collected at each iteration.",
  "Evidence collection is mandatory for all full-harness runs.",
  "",
  "### Reviewer Invocation",
  "",
  "The reviewer receives evidence and spec context at each iteration.",
  "Review findings feed back into the next iteration planning.",
  "Review summary is generated at loop exit.",
  "",
  "### Calibration",
  "",
  "Calibration verifies scoring-ready schema alignment.",
  "Threshold enforcement prevents premature convergence exit.",
  "Calibration is the final gate before declaring convergence.",
].join("\n");

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("full-harness skill", () => {
  it("dedicated skill file exists", async () => {
    const skillsDir = await newTempDir();
    const skillDir = path.join(skillsDir, "qfai-prototyping-full-harness");
    await mkdir(skillDir, { recursive: true });
    await writeFile(path.join(skillDir, "SKILL.md"), VALID_HARNESS_CONTENT, "utf-8");

    const result = await validateFullHarnessSkill(skillsDir);

    expect(result.skillFileExists).toBe(true);
    expect(
      result.issues.filter((i) => i.code === "UIX-VAL-FULL-HARNESS-ENTRYPOINT-MISSING"),
    ).toHaveLength(0);
  });

  it("CLI entrypoint starts workflow", async () => {
    const skillsDir = await newTempDir();
    const skillDir = path.join(skillsDir, "qfai-prototyping-full-harness");
    await mkdir(skillDir, { recursive: true });
    await writeFile(path.join(skillDir, "SKILL.md"), VALID_HARNESS_CONTENT, "utf-8");

    const result = await validateFullHarnessSkill(skillsDir);

    expect(result.hasWorkflowLoop).toBe(true);
    expect(result.issues.filter((i) => i.code === "UIX-VAL-FULL-HARNESS-NO-WORKFLOW")).toHaveLength(
      0,
    );
  });

  it("workflow loop not routing-only", async () => {
    const skillsDir = await newTempDir();
    const skillDir = path.join(skillsDir, "qfai-prototyping-full-harness");
    await mkdir(skillDir, { recursive: true });
    // Routing-only skill that just redirects
    const routingContent =
      "# Full-Harness\n\nThis skill routes to `qfai prototyping --mode full-harness`.\n";
    await writeFile(path.join(skillDir, "SKILL.md"), routingContent, "utf-8");

    const result = await validateFullHarnessSkill(skillsDir);

    expect(result.hasWorkflowLoop).toBe(false);
  });

  it("loop convergence with evidence", async () => {
    const skillsDir = await newTempDir();
    const skillDir = path.join(skillsDir, "qfai-prototyping-full-harness");
    await mkdir(skillDir, { recursive: true });
    await writeFile(path.join(skillDir, "SKILL.md"), VALID_HARNESS_CONTENT, "utf-8");

    const result = await validateFullHarnessSkill(skillsDir);

    expect(result.hasWorkflowLoop).toBe(true);
    expect(result.hasEvidenceCollection).toBe(true);
  });

  it("evidence collection verification", async () => {
    const skillsDir = await newTempDir();
    const skillDir = path.join(skillsDir, "qfai-prototyping-full-harness");
    await mkdir(skillDir, { recursive: true });
    await writeFile(path.join(skillDir, "SKILL.md"), VALID_HARNESS_CONTENT, "utf-8");

    const result = await validateFullHarnessSkill(skillsDir);

    expect(result.hasEvidenceCollection).toBe(true);
  });

  it("reviewer invocation verification", async () => {
    const skillsDir = await newTempDir();
    const skillDir = path.join(skillsDir, "qfai-prototyping-full-harness");
    await mkdir(skillDir, { recursive: true });
    await writeFile(path.join(skillDir, "SKILL.md"), VALID_HARNESS_CONTENT, "utf-8");

    const result = await validateFullHarnessSkill(skillsDir);

    expect(result.hasReviewerInvocation).toBe(true);
  });

  it("calibration obligations test", async () => {
    const skillsDir = await newTempDir();
    const skillDir = path.join(skillsDir, "qfai-prototyping-full-harness");
    await mkdir(skillDir, { recursive: true });
    await writeFile(path.join(skillDir, "SKILL.md"), VALID_HARNESS_CONTENT, "utf-8");

    const result = await validateFullHarnessSkill(skillsDir);

    expect(result.hasCalibrationObligation).toBe(true);
  });
});
