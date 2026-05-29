/**
 * Integration: `R-AUTOPILOT-POLICY-MISSING` (severity error).
 *
 * - TC-0015-0020: a SKILL.md WITHOUT a `## Default Autopilot Policy`
 *   section makes the validator emit `R-AUTOPILOT-POLICY-MISSING` at
 *   severity error with a non-empty `justification:` naming the
 *   SKILL.md path and the absent section.
 *
 * The detection scans `.qfai/assistant/skills/<id>/SKILL.md` files
 * (qfai-* skill scope, same scoping rule as
 * `validateSkillDocReferences`). Non-qfai user skills are NOT flagged.
 */
// QFAI:SPEC-0015:TC-0015-0020

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { validateAutopilotPolicy } from "../../../src/core/validators/autopilotPolicy.js";

async function writeSkill(root: string, skillId: string, body: string): Promise<void> {
  const dir = path.join(root, ".qfai", "assistant", "skills", skillId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "SKILL.md"), body, "utf-8");
}

const FULL_POLICY = `# qfai-fixture

## Default Autopilot Policy

- auto-decide:
  - output formatting
  - ID / sequence numbering
  - append-vs-create on subject overlap
  - equivalent-option pick
- ask-user:
  - CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE triage ops (with prompt template)
  - destructive operations
  - version-pin changes
  - scope expansions
- hard-required:
  - companyName
  - brand intent
  - primarySpecId when absent
`;

const NO_POLICY = `# qfai-fixture

## Some Other Section

- bullet
`;

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-autopilot-policy-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("TC-0015-0020: validateAutopilotPolicy emits R-AUTOPILOT-POLICY-MISSING on missing section", () => {
  it("fires (error) for a qfai-* SKILL.md that lacks ## Default Autopilot Policy", async () => {
    await writeSkill(root, "qfai-fixture", NO_POLICY);
    const issues = await validateAutopilotPolicy(root);
    const findings = issues.filter((i) => i.code === "R-AUTOPILOT-POLICY-MISSING");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    const f = findings[0];
    expect(f?.severity).toBe("error");
    // Justification names the SKILL.md path and the absent section.
    expect(f?.message).toMatch(/qfai-fixture\/SKILL\.md/);
    expect(f?.message).toMatch(/Default Autopilot Policy/);
    expect(f?.message).toMatch(/justification/i);
  });

  it("does NOT fire when the SKILL.md carries the full 3-bucket policy", async () => {
    await writeSkill(root, "qfai-fixture", FULL_POLICY);
    const issues = await validateAutopilotPolicy(root);
    expect(issues.filter((i) => i.code === "R-AUTOPILOT-POLICY-MISSING")).toEqual([]);
  });

  it("does NOT fire for non-qfai user skills (scoping rule)", async () => {
    await writeSkill(root, "user-skill", NO_POLICY);
    const issues = await validateAutopilotPolicy(root);
    expect(issues.filter((i) => i.code === "R-AUTOPILOT-POLICY-MISSING")).toEqual([]);
  });

  it("does NOT fire when the skills directory is absent (fresh project)", async () => {
    const issues = await validateAutopilotPolicy(root);
    expect(issues.filter((i) => i.code === "R-AUTOPILOT-POLICY-MISSING")).toEqual([]);
  });
});
