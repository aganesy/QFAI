/**
 * Integration: Agent Delegation Framework Spec-0015 TDD Backfill
 *
 * Validates that the agent delegation framework (spec-0015) requirements
 * are covered by existing implementation: agent catalog, routing, review
 * profiles, and agent definition validator.
 *
 * TDD-0001..0010 are Exception-pattern backfill (DR-0015-0001).
 * TDD-0011..0012 add concrete coverage for delegation hard-stop reporting
 * and the real-delegation capability probe contract.
 */
// QFAI:SPEC-0015:TC-0015-0001
// QFAI:SPEC-0015:TC-0015-0002
// QFAI:SPEC-0015:TC-0015-0003
// QFAI:SPEC-0015:TC-0015-0004
// QFAI:SPEC-0015:TC-0015-0005
// QFAI:SPEC-0015:TC-0015-0006
// QFAI:SPEC-0015:TC-0015-0007
// QFAI:SPEC-0015:TC-0015-0008
// QFAI:SPEC-0015:TC-0015-0009
// QFAI:SPEC-0015:TC-0015-0010
// QFAI:SPEC-0015:TC-0015-0011
// QFAI:SPEC-0015:TC-0015-0012
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseAgentFrontmatter } from "../../src/core/agentFrontmatter.js";

const AGENTS_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "agents",
);

// Post-recut: agent-catalog.yml / agent-routing.yml / review-profiles.yml
// live in manifest/, review-gate.rules.yml lives in catalog/. Tests
// resolve per-file paths below.
const MANIFEST_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "manifest",
);
const CATALOG_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "catalog",
);

const AGENT_VALIDATOR = path.resolve(
  __dirname,
  "..",
  "..",
  "src",
  "core",
  "validators",
  "agentDefinition.ts",
);

const REVIEW_GATE_VALIDATOR = path.resolve(
  __dirname,
  "..",
  "..",
  "src",
  "core",
  "validators",
  "reviewGate.ts",
);

const SHARED_DELEGATION_BASELINE = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "constitution",
  "shared-skill-delegation-baseline.md",
);

const QFAI_IMPLEMENT_SKILL = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-implement",
  "SKILL.md",
);

const LIVE_SHARED_DELEGATION_BASELINE = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  ".qfai",
  "assistant",
  "constitution",
  "shared-skill-delegation-baseline.md",
);

const LIVE_QFAI_IMPLEMENT_SKILL = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  ".qfai",
  "assistant",
  "skills",
  "qfai-implement",
  "SKILL.md",
);

async function readAsset(filePath: string) {
  return readFile(filePath, "utf-8");
}

function getSection(content: string, heading: string) {
  const start = content.indexOf(heading);
  expect(start).toBeGreaterThanOrEqual(0);

  const afterHeading = content.slice(start + heading.length);
  const nextHeadingOffset = afterHeading.search(/\n### |\n## /);

  if (nextHeadingOffset === -1) {
    return afterHeading.trim();
  }

  return afterHeading.slice(0, nextHeadingOffset).trim();
}

// TC-0015-0001: Agent Catalog 19 Entries
describe("TC-0015-0001: Agent Catalog 19 Entries", () => {
  it("agent-catalog.yml exists in assistant/manifest", async () => {
    const catalogPath = path.join(MANIFEST_DIR, "agent-catalog.yml");
    await expect(access(catalogPath)).resolves.toBeUndefined();
  });
});

// TC-0015-0002: Standard Contract Structure
describe("TC-0015-0002: Standard Contract Structure", () => {
  it("agentDefinition validator checks required sections", async () => {
    const content = await readFile(AGENT_VALIDATOR, "utf-8");
    expect(content).toContain("Mission");
  });

  it("canonical agent markdown files include Claude/GitHub Copilot-compatible frontmatter", async () => {
    const files = (await readdir(AGENTS_DIR)).filter((fileName) => fileName.endsWith(".md"));
    for (const fileName of files) {
      const content = await readFile(path.join(AGENTS_DIR, fileName), "utf-8");
      const parsed = parseAgentFrontmatter(content);
      expect(parsed.ok, `${fileName}: invalid frontmatter`).toBe(true);
      if (!parsed.ok) {
        continue;
      }
      expect(parsed.frontmatter.name, `${fileName}: wrong name`).toBe(
        fileName.replace(/\.md$/, ""),
      );
      expect(
        parsed.frontmatter.description.length,
        `${fileName}: missing description`,
      ).toBeGreaterThan(0);
      expect(parsed.frontmatter.tools.length, `${fileName}: missing tools`).toBeGreaterThan(0);
    }
  });
});

// TC-0015-0003: Orchestrator No Direct Generation
describe("TC-0015-0003: Orchestrator No Direct Generation", () => {
  it("orchestrator agent defines delegation-only protocol", async () => {
    const orchestratorPath = path.join(AGENTS_DIR, "orchestrator.md");
    const content = await readFile(orchestratorPath, "utf-8");
    expect(content).toMatch(/MUST NOT.*generat|delegat/i);
  });
});

// TC-0015-0004: Devils-Advocate Concrete Alternative
describe("TC-0015-0004: Devils-Advocate Concrete Alternative", () => {
  it("review-gate validator exists", async () => {
    const content = await readFile(REVIEW_GATE_VALIDATOR, "utf-8");
    expect(content).toMatch(/review|gate/i);
  });
});

// TC-0015-0005: Devils-Advocate 3-FAIL Demotion
describe("TC-0015-0005: Devils-Advocate 3-FAIL Demotion", () => {
  it("review-gate rules support devils-advocate review mode", async () => {
    const rulesPath = path.join(CATALOG_DIR, "review-gate.rules.yml");
    const content = await readFile(rulesPath, "utf-8");
    expect(content).toContain("devils-advocate");
  });
});

// TC-0015-0006: Pattern-Doubler Rationale Required
describe("TC-0015-0006: Pattern-Doubler Rationale Required", () => {
  it("review-profiles.yml exists", async () => {
    const profilesPath = path.join(MANIFEST_DIR, "review-profiles.yml");
    await expect(access(profilesPath)).resolves.toBeUndefined();
  });
});

// TC-0015-0007: Pattern-Doubler N/A Default
describe("TC-0015-0007: Pattern-Doubler N/A Default", () => {
  it("review-profiles.yml defines pattern-doubler profile", async () => {
    const profilesPath = path.join(MANIFEST_DIR, "review-profiles.yml");
    const content = await readFile(profilesPath, "utf-8");
    expect(content).toMatch(/pattern-doubler/i);
  });
});

// TC-0015-0008: All-Reviewer FAIL Obligation
describe("TC-0015-0008: All-Reviewer FAIL Obligation", () => {
  it("review-gate rules require completion-reviewer", async () => {
    const rulesPath = path.join(CATALOG_DIR, "review-gate.rules.yml");
    const content = await readFile(rulesPath, "utf-8");
    expect(content).toContain("completion-reviewer");
    expect(content).toContain("reviewers");
  });
});

// TC-0015-0009: Routing SSOT
describe("TC-0015-0009: Routing SSOT", () => {
  it("agent-routing.yml exists and defines routing", async () => {
    const routingPath = path.join(MANIFEST_DIR, "agent-routing.yml");
    const content = await readFile(routingPath, "utf-8");
    expect(content).toMatch(/routing|reviewer|skill/i);
  });
});

// TC-0015-0010: Specialist Responsibilities Preserved
describe("TC-0015-0010: Specialist Responsibilities Preserved", () => {
  it("agent-catalog.yml contains agent definitions", async () => {
    const catalogPath = path.join(MANIFEST_DIR, "agent-catalog.yml");
    const content = await readFile(catalogPath, "utf-8");
    expect(content).toMatch(/agent|role|mission/i);
  });
});

// TC-0015-0011: Delegation Failure Hard Stop Reporting
describe("TC-0015-0011: Delegation Failure Hard Stop Reporting", () => {
  it("stops the stage and reports hard-stop remediation details", async () => {
    const [baselineContent, skillContent, liveBaselineContent, liveSkillContent] =
      await Promise.all([
        readAsset(SHARED_DELEGATION_BASELINE),
        readAsset(QFAI_IMPLEMENT_SKILL),
        readAsset(LIVE_SHARED_DELEGATION_BASELINE),
        readAsset(LIVE_QFAI_IMPLEMENT_SKILL),
      ]);

    const capabilitySection = getSection(baselineContent, "### Capability Probe (MUST)");
    const baselineHardStopSection = getSection(
      baselineContent,
      "### Delegation Failure (Hard Stop)",
    );
    const skillHardStopSection = getSection(skillContent, "### Delegation Failure (Hard Stop)");

    expect(capabilitySection).toContain("If the delegation fails, classify the failure first");
    expect(capabilitySection).toContain(
      "Never simulate roles and never continue with self-execution",
    );

    expect(baselineHardStopSection).toContain("Delegation failure:");
    expect(baselineHardStopSection).toContain("Attempted role:");
    expect(baselineHardStopSection).toContain("Attempted task:");
    expect(baselineHardStopSection).toContain("User action needed:");
    expect(baselineHardStopSection).toContain(
      "Retry condition: rerun after the required delegation succeeds",
    );

    expect(skillHardStopSection).toContain("No additional overrides.");
    expect(skillHardStopSection).toContain("Do not simulate roles.");
    expect(skillHardStopSection).toContain("Classify the failure per the baseline taxonomy first");

    // Live operational files must satisfy the same hard-stop reporting contract
    const liveCapabilitySection = getSection(liveBaselineContent, "### Capability Probe (MUST)");
    const liveBaselineHardStopSection = getSection(
      liveBaselineContent,
      "### Delegation Failure (Hard Stop)",
    );
    const liveSkillHardStopSection = getSection(
      liveSkillContent,
      "### Delegation Failure (Hard Stop)",
    );

    expect(liveCapabilitySection).toContain("If the delegation fails, classify the failure first");
    expect(liveCapabilitySection).toContain(
      "Never simulate roles and never continue with self-execution",
    );

    expect(liveBaselineHardStopSection).toContain("Delegation failure:");
    expect(liveBaselineHardStopSection).toContain("Attempted role:");
    expect(liveBaselineHardStopSection).toContain("Attempted task:");
    expect(liveBaselineHardStopSection).toContain("User action needed:");
    expect(liveBaselineHardStopSection).toContain(
      "Retry condition: rerun after the required delegation succeeds",
    );

    expect(liveSkillHardStopSection).toContain("No additional overrides.");
    expect(liveSkillHardStopSection).toContain("Do not simulate roles.");
    expect(liveSkillHardStopSection).toContain(
      "Classify the failure per the baseline taxonomy first",
    );
  });
});

// TC-0015-0012: Capability Probe First Real Delegation Contract
describe("TC-0015-0012: Capability Probe First Real Delegation Contract", () => {
  it("uses the first required delegation as the capability probe", async () => {
    const [baselineContent, skillContent, liveBaselineContent, liveSkillContent] =
      await Promise.all([
        readAsset(SHARED_DELEGATION_BASELINE),
        readAsset(QFAI_IMPLEMENT_SKILL),
        readAsset(LIVE_SHARED_DELEGATION_BASELINE),
        readAsset(LIVE_QFAI_IMPLEMENT_SKILL),
      ]);

    const baselineCapabilitySection = getSection(baselineContent, "### Capability Probe (MUST)");
    const baselineHardStopSection = getSection(
      baselineContent,
      "### Delegation Failure (Hard Stop)",
    );
    const skillCapabilitySection = getSection(skillContent, "### Capability Probe (MUST)");
    const skillHardStopSection = getSection(skillContent, "### Delegation Failure (Hard Stop)");

    expect(baselineContent.indexOf("### Capability Probe (MUST)")).toBeLessThan(
      baselineContent.indexOf("### Delegation Failure (Hard Stop)"),
    );
    expect(baselineCapabilitySection).toContain(
      "Attempt the first required delegation at stage start",
    );
    expect(baselineCapabilitySection).toContain(
      "Treat that first real delegation attempt as the capability check.",
    );
    expect(baselineCapabilitySection).toContain(
      "If the delegation fails, classify the failure first",
    );

    expect(skillCapabilitySection).toContain("No additional overrides.");
    expect(skillCapabilitySection).not.toMatch(/preflight|synthetic/i);
    expect(skillContent.indexOf("### Capability Probe (MUST)")).toBeLessThan(
      skillContent.indexOf("### Delegation Failure (Hard Stop)"),
    );
    expect(skillHardStopSection).toContain("Classify the failure per the baseline taxonomy first");

    expect(baselineHardStopSection).toContain("Delegation failure:");
    expect(baselineHardStopSection).toContain("Attempted role:");
    expect(baselineHardStopSection).toContain("Attempted task:");
    expect(baselineHardStopSection).toContain(
      "Why stopped: QFAI requires real sub-agent delegation in this environment.",
    );
    expect(baselineHardStopSection).toContain("User action needed:");
    expect(baselineHardStopSection).toContain(
      "Retry condition: rerun after the required delegation succeeds",
    );

    // Live operational files must satisfy the same capability probe contract
    const liveBaselineCapabilitySection = getSection(
      liveBaselineContent,
      "### Capability Probe (MUST)",
    );
    const liveBaselineHardStopSection = getSection(
      liveBaselineContent,
      "### Delegation Failure (Hard Stop)",
    );
    const liveSkillCapabilitySection = getSection(liveSkillContent, "### Capability Probe (MUST)");
    const liveSkillHardStopSection = getSection(
      liveSkillContent,
      "### Delegation Failure (Hard Stop)",
    );

    expect(liveBaselineContent.indexOf("### Capability Probe (MUST)")).toBeLessThan(
      liveBaselineContent.indexOf("### Delegation Failure (Hard Stop)"),
    );
    expect(liveBaselineCapabilitySection).toContain(
      "Attempt the first required delegation at stage start",
    );
    expect(liveBaselineCapabilitySection).toContain(
      "Treat that first real delegation attempt as the capability check.",
    );
    expect(liveBaselineCapabilitySection).toContain(
      "If the delegation fails, classify the failure first",
    );

    expect(liveSkillCapabilitySection).toContain("No additional overrides.");
    expect(liveSkillCapabilitySection).not.toMatch(/preflight|synthetic/i);
    expect(liveSkillContent.indexOf("### Capability Probe (MUST)")).toBeLessThan(
      liveSkillContent.indexOf("### Delegation Failure (Hard Stop)"),
    );
    expect(liveSkillHardStopSection).toContain(
      "Classify the failure per the baseline taxonomy first",
    );

    expect(liveBaselineHardStopSection).toContain("Delegation failure:");
    expect(liveBaselineHardStopSection).toContain("Attempted role:");
    expect(liveBaselineHardStopSection).toContain("Attempted task:");
    expect(liveBaselineHardStopSection).toContain(
      "Why stopped: QFAI requires real sub-agent delegation in this environment.",
    );
    expect(liveBaselineHardStopSection).toContain("User action needed:");
    expect(liveBaselineHardStopSection).toContain(
      "Retry condition: rerun after the required delegation succeeds",
    );
  });
});

// TC-0015-0011 follow-up (#248 review): the taxonomy has to be usable
// without mis-routing a permanent failure into a pointless wait, and the
// status vocabulary has to admit the value the taxonomy mandates.
describe("delegation failure taxonomy is actionable", () => {
  const SKILLS_WITH_STATUS_VOCABULARY = [
    "qfai-atdd",
    "qfai-configure",
    "qfai-verify",
    "qfai-sdd",
    "qfai-discussion",
    "qfai-implement",
  ];

  function shippedSkill(skillId: string): string {
    return path.resolve(
      __dirname,
      "..",
      "..",
      "assets",
      "init",
      ".qfai",
      "assistant",
      "skills",
      skillId,
      "SKILL.md",
    );
  }

  it("classifies a limit the user must lift as unavailable, not saturated", async () => {
    // A configured cap of 0, a max delegation depth, an input-size limit
    // or an exhausted quota all name a "limit"/"quota" but never clear on
    // their own. Routing them to the retry branch burns 30/60/120s and
    // then reports that no user action is needed.
    for (const file of [SHARED_DELEGATION_BASELINE, LIVE_SHARED_DELEGATION_BASELINE]) {
      const content = await readAsset(file);
      const taxonomy = getSection(content, "### Delegation Failure Taxonomy (MUST)");
      expect(taxonomy).toContain("A limit or quota that only a user can lift is `unavailable`");
      expect(taxonomy).toMatch(/retryability is not explicit, default to `unavailable`/);
    }
  });

  it("admits PENDING in the Work Orders status vocabulary everywhere it is mandated", async () => {
    // The reviewer-budget branch mandates recording the gate as PENDING;
    // a schema that allows only PASS/REVISE leaves an agent no legal way
    // to do that.
    for (const file of [SHARED_DELEGATION_BASELINE, LIVE_SHARED_DELEGATION_BASELINE]) {
      const content = await readAsset(file);
      expect(content).toContain("Status (PASS/REVISE/PENDING)");
      expect(getSection(content, "### Reviewer budget exhausted")).toContain("`PENDING`");
    }
    for (const skillId of SKILLS_WITH_STATUS_VOCABULARY) {
      const content = await readAsset(shippedSkill(skillId));
      expect(content).not.toContain("Status (PASS/REVISE)`");
      expect(content).toContain("Status (PASS/REVISE/PENDING)");
    }
  });

  it("keeps spec-0015 obligations aligned with the two-class contract", async () => {
    const specDir = path.resolve(__dirname, "..", "..", "..", "..", ".qfai", "specs", "spec-0015");
    const [ac, br] = await Promise.all([
      readAsset(path.join(specDir, "03_Acceptance-Criteria.md")),
      readAsset(path.join(specDir, "04_Business-Rules.md")),
    ]);
    for (const content of [ac, br]) {
      expect(content).toContain("`unavailable`");
      expect(content).toContain("`saturated`");
    }
    expect(br).toContain("classify it before responding");
  });
});
