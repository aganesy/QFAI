/**
 * Integration coverage for agent card definitions, package routing defaults,
 * and delegation behavior.
 */
// QFAI:AC-0001-0161-01
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { runInit } from "../../src/cli/commands/init.js";
import { parseAgentFrontmatter } from "../../src/core/agentFrontmatter.js";
import { defaultRoutingEntries } from "../helpers/shippedAssistant.js";
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

// QFAI:EX-0001-0163-01
// QFAI:EX-0001-0163-02
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
  // QFAI:EX-0001-0158-01
  it("keeps routing and review profiles together outside init assets", async () => {
    const routing = await defaultRoutingEntries();
    const profiles = parseYaml(await readAsset(path.join(DEFAULTS_DIR, "review-profiles.yml"))) as {
      profiles: Record<string, unknown>;
      optional_modes: Record<string, unknown>;
    };
    expect(routing.some((entry) => entry.step === "sdd-triage")).toBe(true);
    expect(Object.keys(profiles.profiles)).not.toContain("full-harness");
    expect(profiles.optional_modes).toHaveProperty("pattern-doubler");
    expect(profiles.optional_modes).toHaveProperty("devils-advocate");
  });

  // QFAI:AC-0001-0164-01
  // QFAI:AC-0001-0164-02
  // QFAI:EX-0001-0164-01
  // QFAI:EX-0001-0164-02
  it("defines devils-advocate as an advisory mode that needs an alternative", async () => {
    const profiles = parseYaml(await readAsset(path.join(DEFAULTS_DIR, "review-profiles.yml"))) as {
      optional_modes: Record<string, Record<string, unknown>>;
    };
    const mode = profiles.optional_modes["devils-advocate"];
    expect(mode?.kind).toBe("advisory");
    expect(String(mode?.description)).toContain("do not block completion by default");
    expect(mode?.alternative_required).toBe(true);
    expect(mode?.bare_negation_invalid).toBe(true);
  });

  // QFAI:AC-0001-0166-01
  // QFAI:EX-0001-0166-01
  it("requires a concrete fix on every blocking finding of a REVISE", async () => {
    for (const baseline of [SHARED_DELEGATION_BASELINE, LIVE_SHARED_DELEGATION_BASELINE]) {
      const text = (await readAsset(baseline)).replace(/\s+/g, " ");
      expect(text).toContain(
        "Every reviewer returning `REVISE` must include a concrete fix proposal.",
      );
      expect(text).toContain("Fix: <action, for a blocking finding>");
      expect(text).toContain(
        "`Result: REVISE` is legal only when at least one finding is `Severity: blocking`.",
      );
      expect(text).toContain("There is no third verdict.");
    }
  });

  it("routes the migration skill through the required three phases", async () => {
    const routing = { routing: await defaultRoutingEntries() } as {
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
    expect(migration?.phases[2]?.blocking_agents).toEqual(["architecture-reviewer"]);
    expect(migration?.review_profile).toBe("architecture-heavy");
  });
});
/** The same section of the shipped baseline and of the repository's synced copy. */
async function baselineSections(heading: string): Promise<string[]> {
  const [shipped, live] = await Promise.all([
    readAsset(SHARED_DELEGATION_BASELINE),
    readAsset(LIVE_SHARED_DELEGATION_BASELINE),
  ]);
  return [getSection(shipped, heading), getSection(live, heading)].map((section) =>
    section.replace(/\s+/g, " "),
  );
}

describe("the session agent holds the work and delegates by choice", () => {
  // QFAI:AC-0001-0224-02
  // QFAI:EX-0001-0224-02
  it("lets the session author any artifact and keeps every review with a non-author", async () => {
    for (const section of await baselineSections("### Orchestrator Protocol")) {
      expect(section).toContain("may author any artifact itself");
      expect(section).toContain("sub-agents that run in parallel");
      expect(section).toContain(
        "A review is done by an agent that did not author what it reviews.",
      );
      expect(section).toContain("never reviews its own work");
    }
    for (const content of [
      await readAsset(SHARED_DELEGATION_BASELINE),
      await readAsset(LIVE_SHARED_DELEGATION_BASELINE),
    ]) {
      expect(getSection(content, "## Sub-agent Delegation (MANDATORY)")).toContain(
        "Delegation is optional.",
      );
    }
    for (const skill of [QFAI_IMPLEMENT_SKILL, LIVE_QFAI_IMPLEMENT_SKILL]) {
      expect(await readAsset(skill)).toContain("rule/shared-skill-delegation-baseline.md");
    }
  });

  // QFAI:AC-0001-0163-02
  // QFAI:EX-0001-0163-02
  it("requires no delegation at stage start, and treats a chosen delegation as the capability check", async () => {
    for (const section of await baselineSections("### Capability Probe (MUST)")) {
      expect(section).toContain("No delegation attempt is required at the start of a stage.");
      expect(section).toContain("delegates only when it chooses to");
      expect(section).toContain("the real delegation attempt is the capability check");
      expect(section).toContain("Do not gate execution on preflight availability questions");
      expect(section).toContain("If the delegation fails, classify the failure first");
    }
  });

  // QFAI:AC-0001-0163-03
  // QFAI:EX-0001-0163-01
  it("has the session do the work itself when a delegation is unavailable, and report it", async () => {
    for (const taxonomy of await baselineSections("### Delegation Failure Taxonomy (MUST)")) {
      expect(taxonomy).toMatch(/\| `unavailable` \|[^|]*\| The orchestrator does the work itself/);
    }
    for (const section of await baselineSections(
      "### Delegation Failure — `unavailable` (The Orchestrator Does The Work)",
    )) {
      expect(section).toContain("does the work itself and reports it as its own");
      for (const field of [
        "Delegation failure:",
        "Failure class: unavailable",
        "Attempted role:",
        "Attempted task:",
        "Done by: the orchestrator",
      ]) {
        expect(section).toContain(field);
      }
    }
  });
});

// The taxonomy has to be usable without mis-routing a permanent failure into a
// pointless wait.
describe("delegation failure taxonomy is actionable", () => {
  it("classifies a limit the user must lift as unavailable, not saturated", async () => {
    for (const taxonomy of await baselineSections("### Delegation Failure Taxonomy (MUST)")) {
      expect(taxonomy).toContain("A limit or quota that only a user can lift is `unavailable`");
      expect(taxonomy).toMatch(/retryability is not explicit, default to `unavailable`/);
    }
  });

  // QFAI:EX-0001-0163-06
  it("retries a saturated review delegation, then stops rather than reviewing its own work", async () => {
    for (const taxonomy of await baselineSections("### Delegation Failure Taxonomy (MUST)")) {
      expect(taxonomy).toContain("`agent thread limit reached`");
      expect(taxonomy).toContain("Bounded wait-and-retry of the identical delegation");
      expect(taxonomy).toContain(
        "handle the failure as `unavailable` and report the class as `saturated (retry budget exhausted)`",
      );
    }
    for (const retry of await baselineSections(
      "### Delegation Failure — `saturated` (Bounded Retry)",
    )) {
      expect(retry).toContain("Retry the identical delegation with backoff");
    }
    for (const stop of await baselineSections("### Delegation Failure (Hard Stop)")) {
      expect(stop).toContain("a review someone other than the author");
      expect(stop).toContain("`saturated (retry budget exhausted)`");
      expect(stop).toContain("User action needed:");
      expect(stop).toContain("Retry condition: rerun after the review delegation succeeds");
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
        "cli-0001-assistant-routing.md",
      ),
    );
    const rule = contract.split(/\r?\n/).find((line) => line.includes("| BR-0001-0004 |"));
    expect(rule).toBeDefined();
    expect(rule).toContain("`unavailable`");
    expect(rule).toContain("`saturated`");
    expect(rule).toContain("classify it before responding");
  });
});
