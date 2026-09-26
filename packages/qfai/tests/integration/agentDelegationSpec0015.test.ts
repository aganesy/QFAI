/**
 * Integration coverage for agent card definitions, package routing defaults,
 * and delegation behavior.
 */
// QFAI:AC-0001-0167-01
// QFAI:EX-0001-0169-01
// QFAI:EX-0001-0169-02
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { runInit } from "../../src/cli/commands/init.js";
import { parseAgentFrontmatter } from "../../src/core/agentFrontmatter.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const ASSETS = path.resolve(__dirname, "..", "..", "assets");
const AGENTS_DIR = path.join(ASSETS, "init", ".qfai", "assistant", "agent");
const DEFAULTS_DIR = path.join(ASSETS, "defaults");
const SHARED_DELEGATION_BASELINE = path.join(
  ASSETS,
  "init",
  ".qfai",
  "assistant",
  "rule",
  "shared-skill-delegation-baseline.md",
);
const QFAI_IMPLEMENT_SKILL = path.join(
  ASSETS,
  "init",
  ".qfai",
  "assistant",
  "skill",
  "qfai-implement",
  "SKILL.md",
);
const LIVE_SHARED_DELEGATION_BASELINE = path.resolve(
  __dirname,
  "../../../..",
  ".qfai",
  "assistant",
  "rule",
  "shared-skill-delegation-baseline.md",
);
const LIVE_QFAI_IMPLEMENT_SKILL = path.resolve(
  __dirname,
  "../../../..",
  ".qfai",
  "assistant",
  "skill",
  "qfai-implement",
  "SKILL.md",
);

async function readAsset(filePath: string): Promise<string> {
  return readFile(filePath, "utf-8");
}

function getSection(content: string, heading: string): string {
  const start = content.indexOf(heading);
  expect(start).toBeGreaterThanOrEqual(0);
  const afterHeading = content.slice(start + heading.length);
  const nextHeadingOffset = afterHeading.search(/\n### |\n## /);
  return (
    nextHeadingOffset === -1 ? afterHeading : afterHeading.slice(0, nextHeadingOffset)
  ).trim();
}

const MANIFEST_FILE_NAMES = new Set([
  "agent-catalog.yml",
  "agent-routing.yml",
  "review-profiles.yml",
  "review-gate.rules.yml",
]);

/** Every file below `dir`, at any depth, whose name is one of the former manifest files. */
async function manifestFilesUnder(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true });
  return entries.filter((entry) => MANIFEST_FILE_NAMES.has(path.basename(entry)));
}

describe("agent cards are the only definitions", () => {
  it("ships nineteen complete cards without project manifest copies", async () => {
    const cards = (await readdir(AGENTS_DIR)).filter((name) => name.endsWith(".md"));
    expect(cards).toHaveLength(19);
    const repeatedMissions: string[] = [];
    for (const fileName of cards) {
      const parsed = parseAgentFrontmatter(await readAsset(path.join(AGENTS_DIR, fileName)));
      expect(parsed.ok, fileName).toBe(true);
      if (parsed.ok) {
        expect(parsed.frontmatter.name).toBe(fileName.slice(0, -3));
        expect(parsed.frontmatter.mission.length).toBeGreaterThan(0);
        if (parsed.frontmatter.mission === parsed.frontmatter.description) {
          repeatedMissions.push(fileName);
        }
      }
    }
    expect(
      repeatedMissions,
      "mission must state the role's purpose separately from description",
    ).toEqual([]);
    const assistant = path.join(ASSETS, "init", ".qfai", "assistant");
    expect(await manifestFilesUnder(assistant)).toEqual([]);
  });

  it("does not write routing or review-profile files during init", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-agent-init-"));
    try {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
      expect(await manifestFilesUnder(path.join(root, ".qfai", "assistant"))).toEqual([]);
    } finally {
      await removeTempTree(root);
    }
  });
});

describe("routing defaults are package data", () => {
  it("keeps routing and review profiles together outside init assets", async () => {
    const routing = parseYaml(await readAsset(path.join(DEFAULTS_DIR, "agent-routing.yml"))) as {
      routing: Array<{ skill: string; phases: Array<{ id: string }>; review_profile: string }>;
    };
    const profiles = parseYaml(await readAsset(path.join(DEFAULTS_DIR, "review-profiles.yml"))) as {
      profiles: Record<string, unknown>;
      optional_modes: Record<string, unknown>;
    };
    expect(routing.routing.some((entry) => entry.skill === "qfai-sdd")).toBe(true);
    expect(Object.keys(profiles.profiles)).not.toContain("full-harness");
    expect(profiles.optional_modes).toHaveProperty("pattern-doubler");
    expect(profiles.optional_modes).toHaveProperty("devils-advocate");
  });

  it("routes the migration skill through the required three phases", async () => {
    const routing = parseYaml(await readAsset(path.join(DEFAULTS_DIR, "agent-routing.yml"))) as {
      routing: Array<{
        skill: string;
        phases: Array<{ id: string; mandatory_agents: string[]; blocking_agents: string[] }>;
        review_profile: string;
      }>;
    };
    const migration = routing.routing.find((entry) => entry.skill === "qfai-migration-v1-to-v2");
    expect(migration?.phases.map((phase) => phase.id)).toEqual(["plan", "execution", "review"]);
    expect(migration?.phases[0]?.mandatory_agents).toEqual([
      "requirements-analyst",
      "solution-architect",
    ]);
    expect(migration?.phases[0]?.blocking_agents).toEqual(["solution-architect"]);
    expect(migration?.phases[1]?.mandatory_agents).toEqual(["devops-ci-engineer"]);
    expect(migration?.phases[2]?.blocking_agents).toEqual([
      "completion-reviewer",
      "architecture-reviewer",
    ]);
    expect(migration?.review_profile).toBe("architecture-heavy");
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
    expect(skillContent).toContain("rule/shared-skill-delegation-baseline.md");

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

    // Live operational files must satisfy the same hard-stop reporting contract
    const liveCapabilitySection = getSection(liveBaselineContent, "### Capability Probe (MUST)");
    const liveBaselineHardStopSection = getSection(
      liveBaselineContent,
      "### Delegation Failure (Hard Stop)",
    );
    expect(liveSkillContent).toContain("rule/shared-skill-delegation-baseline.md");

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
    expect(skillContent).toContain("rule/shared-skill-delegation-baseline.md");

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
    expect(liveSkillContent).toContain("rule/shared-skill-delegation-baseline.md");

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

// The taxonomy has to be usable
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
      "skill",
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
      // The closing `)` is what separates the retired schema from the current
      // one, so the complete token catches it in both carriers the skills use:
      // the code span `Status (PASS/REVISE)` and the bare Work Orders table
      // header `| ... | Status (PASS/REVISE) |`.
      expect(content).not.toContain("Status (PASS/REVISE)");
      expect(content).toContain("shared-skill-delegation-baseline.md");
    }
  });

  it("keeps the active routing contract aligned with the two failure classes", async () => {
    const contract = await readAsset(
      path.resolve(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        ".qfai",
        "spec",
        "03_contract",
        "cli",
        "assistant-routing.md",
      ),
    );
    const rule = contract.split(/\r?\n/).find((line) => line.includes("| BR-0344 |"));
    expect(rule).toBeDefined();
    expect(rule).toContain("`unavailable`");
    expect(rule).toContain("`saturated`");
    expect(rule).toContain("classify it before responding");
  });
});
