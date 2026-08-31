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

  // Pin the relocated-skillsDir contract. A project that points
  // `config.paths.skillsDir` at a non-default location must still
  // have its qfai-* SKILL.md files scanned by the autopilot policy
  // validator. Pre-fix the validator hardcoded
  // `.qfai/assistant/skills` and silently SKIPped every qfai-*
  // SKILL.md under the configured directory.
  it("scans the configured skillsDir when options.config.paths.skillsDir is set", async () => {
    const { defaultConfig } = await import("../../../src/core/config.js");
    // Seed a qfai-* SKILL.md WITHOUT a policy section under a
    // non-default skillsDir; the validator must find it via the
    // configured path.
    const customSkillsDir = path.join("custom", "skills");
    const customSkillDir = path.join(root, customSkillsDir, "qfai-relocated");
    await mkdir(customSkillDir, { recursive: true });
    await writeFile(path.join(customSkillDir, "SKILL.md"), NO_POLICY, "utf-8");

    const customConfig = {
      ...defaultConfig,
      paths: { ...defaultConfig.paths, skillsDir: customSkillsDir },
    };
    const issues = await validateAutopilotPolicy(root, { config: customConfig });
    const finding = issues.find((i) => i.code === "R-AUTOPILOT-POLICY-MISSING");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("error");
    // The relPath in the message must point at the actual scan path
    // (forward-slash normalized, root-relative) — NOT the legacy
    // `.qfai/assistant/skills/...` hardcode. Mirrors the
    // staleReferences.ts pattern.
    expect(finding?.message ?? "").toMatch(/custom\/skills\/qfai-relocated\/SKILL\.md/);
    expect(finding?.message ?? "").not.toMatch(
      /\.qfai\/assistant\/skills\/qfai-relocated\/SKILL\.md/,
    );
  });

  it("default-path scanning still works when no config is supplied (legacy single-arg call)", async () => {
    // Sanity check: a single-arg `validateAutopilotPolicy(root)`
    // invocation continues to scan the legacy
    // `.qfai/assistant/skills` location so older tests / callers
    // stay green. This pins the fallback branch.
    await writeSkill(root, "qfai-legacy", NO_POLICY);
    const issues = await validateAutopilotPolicy(root);
    const finding = issues.find((i) => i.code === "R-AUTOPILOT-POLICY-MISSING");
    expect(finding).toBeDefined();
    expect(finding?.message ?? "").toMatch(/\.qfai\/assistant\/skills\/qfai-legacy\/SKILL\.md/);
  });
});

/**
 * The bucket's CONTENT, not just its header.
 *
 * Before this, `parseAutopilotPolicy` only asked whether a `- hard-required:`
 * line existed, so an installed project whose SKILL.md still listed the retired
 * `companyName` passed `qfai validate` for good: installed skills are refreshed
 * only by an explicit `qfai init --force`, and nothing else read the bucket.
 */
describe("validateAutopilotPolicy checks the hard-required bucket's contents", () => {
  const policyWith = (hardRequired: string): string =>
    `# qfai-fixture

## Default Autopilot Policy

- auto-decide:
  - output formatting
- ask-user:
  - destructive operations
- hard-required:
${hardRequired}
`;

  const CANONICAL = "  - brand intent\n  - `primarySpecId` (when absent from inputs)";

  it("stays silent on the bucket the shipped tree ships", async () => {
    await writeSkill(root, "qfai-fixture", policyWith(CANONICAL));
    const issues = await validateAutopilotPolicy(root);
    expect(issues.filter((i) => i.code === "QFAI-AUTOPILOT-001")).toEqual([]);
  });

  it("reports the retired entry an installed SKILL.md still carries", async () => {
    await writeSkill(root, "qfai-fixture", policyWith(`${CANONICAL}\n  - companyName`));
    const issues = await validateAutopilotPolicy(root);
    const finding = issues.find((i) => i.code === "QFAI-AUTOPILOT-001");
    expect(finding).toBeDefined();
    expect(finding?.message ?? "").toContain("companyName");
    // Inside its promotion window, so a warning rather than a build failure,
    // and the message has to say which release ends the window (P7).
    expect(finding?.severity).toBe("warning");
    expect(finding?.message ?? "").toMatch(/warning until the \d+\.\d+\.\d+ release/);
  });

  it("reports a retired entry written beside a pinned one, which a substring test missed", async () => {
    await writeSkill(
      root,
      "qfai-fixture",
      policyWith("  - brand intent / companyName\n  - `primarySpecId`"),
    );
    const issues = await validateAutopilotPolicy(root);
    const finding = issues.find((i) => i.code === "QFAI-AUTOPILOT-001");
    expect(finding).toBeDefined();
    expect(finding?.message ?? "").toContain("brand intent / companyName");
  });

  it("reports a narrowed bucket too, which this set does not permit", async () => {
    await writeSkill(root, "qfai-fixture", policyWith("  - brand intent"));
    const issues = await validateAutopilotPolicy(root);
    const finding = issues.find((i) => i.code === "QFAI-AUTOPILOT-001");
    expect(finding).toBeDefined();
    expect(finding?.message ?? "").toContain("primaryspecid");
  });

  it("does not report the bucket twice when the bucket header itself is absent", async () => {
    await writeSkill(
      root,
      "qfai-fixture",
      `# qfai-fixture

## Default Autopilot Policy

- auto-decide:
  - output formatting
- ask-user:
  - destructive operations
`,
    );
    const issues = await validateAutopilotPolicy(root);
    expect(issues.map((i) => i.code)).toEqual(["R-AUTOPILOT-POLICY-MISSING"]);
  });
});
