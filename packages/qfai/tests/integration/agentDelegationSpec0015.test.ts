/**
 * Integration coverage for agent card definitions, package routing defaults,
 * and delegation behavior.
 */
// QFAI:AC-0001-0161-01
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { runInit } from "../helpers/legacyInit.js";
import { parseAgentFrontmatter } from "../../src/core/agentFrontmatter.js";
import { CODEX_AGENT_WRAPPER_DIR, renderCodexAgentToml } from "../../src/core/codexAgentToml.js";
import { validateAgentDefinition } from "../../src/core/validators/agentDefinition.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const ASSETS = path.resolve(__dirname, "..", "..", "assets");
const AGENTS_DIR = path.join(ASSETS, "init", ".qfai", "assistant", "agent");
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
  it("ships the five cards, one worker and four reviewers, without project manifest copies", async () => {
    const cards = (await readdir(AGENTS_DIR)).filter((name) => name.endsWith(".md"));
    expect(cards.sort()).toEqual([
      "architecture-reviewer.md",
      "fullstack-engineer.md",
      "implementation-reviewer.md",
      "product-surface-reviewer.md",
      "requirements-reviewer.md",
    ]);
    const repeatedMissions: string[] = [];
    for (const fileName of cards) {
      const parsed = parseAgentFrontmatter(await readAsset(path.join(AGENTS_DIR, fileName)));
      expect(parsed.ok, fileName).toBe(true);
      if (parsed.ok) {
        expect(parsed.frontmatter.name).toBe(fileName.slice(0, -3));
        expect(parsed.frontmatter.kind, fileName).toBe(
          fileName === "fullstack-engineer.md" ? "worker" : "reviewer",
        );
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

describe("reviewer findings", () => {
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
});
/** Every card's text, by card name. */
async function readCards(): Promise<Map<string, string>> {
  const cards = new Map<string, string>();
  for (const fileName of (await readdir(AGENTS_DIR)).filter((name) => name.endsWith(".md"))) {
    cards.set(fileName.slice(0, -3), await readAsset(path.join(AGENTS_DIR, fileName)));
  }
  return cards;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
}

/** The YAML mapping between a card's `---` lines. */
function cardFrontmatter(card: string): Record<string, unknown> {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(card)?.[1] ?? "";
  return asRecord(parseYaml(block));
}

async function initProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-agent-cards-"));
  await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
  return root;
}

describe("the agent cards carry the whole definition of a role", () => {
  // QFAI:EX-0001-0161-01
  it("gives each card its metadata keys, leaves no catalog file, and generates the Codex profiles from the cards", async () => {
    const cards = await readCards();
    expect(cards.size).toBe(5);
    const keys = [
      "name",
      "kind",
      "domain",
      "mission",
      "replaces",
      "owned_artifacts",
      "tool_profile",
      "permission_profile",
      "specialization_tags",
    ];
    for (const [name, card] of cards) {
      const frontmatter = cardFrontmatter(card);
      for (const key of keys) {
        expect(Object.hasOwn(frontmatter, key), `${name}: ${key}`).toBe(true);
      }
      expect(frontmatter.name, name).toBe(name);
      expect(frontmatter.mission, `${name}: mission beside description`).not.toBe(
        frontmatter.description,
      );
      expect(parseAgentFrontmatter(card).ok, name).toBe(true);
    }

    // A card with no mission key breaks the rule, and a mission read from the description does not
    // stand in for it.
    const solution = cards.get("fullstack-engineer") ?? "";
    const withoutMission = solution.replace(/^mission:[\s\S]*?(?=^replaces:)/m, "");
    expect(withoutMission).not.toBe(solution);
    expect(parseAgentFrontmatter(withoutMission).ok).toBe(false);

    const root = await initProject();
    try {
      const everything = await readdir(root, { recursive: true });
      expect(everything.filter((entry) => path.basename(entry) === "agent-catalog.yml")).toEqual(
        [],
      );
      for (const [name, card] of cards) {
        const kind = cardFrontmatter(card).kind;
        expect(kind === "worker" || kind === "reviewer", `${name}: kind`).toBe(true);
        const generated = renderCodexAgentToml(
          card,
          kind === "reviewer" ? "reviewer" : "worker",
          name,
        );
        expect(generated.ok, name).toBe(true);
        const written = await readFile(
          path.join(root, ...CODEX_AGENT_WRAPPER_DIR.split("/"), `${name}.toml`),
          "utf-8",
        );
        expect(written, `${name}: profile equals what the generator produces`).toBe(
          generated.ok ? generated.toml : "",
        );
      }
    } finally {
      await removeTempTree(root);
    }
  });
});

describe("every agent card follows the standard contract", () => {
  const SECTIONS = [
    "Mission",
    "Inputs you must read",
    "Deliverables",
    "Stop conditions",
    "Sign-off",
  ];

  /** The lines under `## <heading>`, up to the next `## ` heading. */
  function sectionLines(card: string, heading: string): string[] {
    const part = card
      .split(/^## /m)
      .find((candidate) => candidate.split(/\r?\n/, 1)[0] === heading);
    return (part ?? "").split(/\r?\n/).slice(1);
  }

  // QFAI:AC-0001-0162-01
  // QFAI:EX-0001-0162-01
  it("has Mission, Inputs you must read, Deliverables, Stop conditions and Sign-off, each with content, and reports a card missing one", async () => {
    const cards = await readCards();
    for (const [name, card] of cards) {
      for (const heading of SECTIONS) {
        const items = sectionLines(card, heading).filter((line) => line.trim().length > 0);
        expect(items.length, `${name}: ${heading}`).toBeGreaterThan(0);
      }
    }

    const worker = cards.get("fullstack-engineer") ?? "";
    expect(sectionLines(worker, "Deliverables")).toContain(
      "- One final answer, with no interim messages.",
    );
    expect(sectionLines(worker, "Stop conditions")).toContain(
      "- The unit would review its own work, or start another agent.",
    );
    expect(sectionLines(worker, "Sign-off")).toContain("- [ ] Every open point is named");

    const root = await initProject();
    try {
      const file = path.join(root, ".qfai", "assistant", "agent", "fullstack-engineer.md");
      await writeFile(file, worker.replace("## Stop conditions", "## Stop"), "utf-8");
      const findings = await validateAgentDefinition(root);
      expect(
        findings
          .filter((finding) => finding.code === "QFAI-AGENT-005")
          .map((finding) => finding.message),
      ).toEqual([
        'Missing required section "## Stop conditions" in .qfai/assistant/agent/fullstack-engineer.md',
      ]);
    } finally {
      await removeTempTree(root);
    }
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
  it("has the session write every artifact and give only gated units and judgements away", async () => {
    for (const section of await baselineSections("### Session Agent Protocol")) {
      expect(section).toContain("The session agent authors every artifact itself");
      expect(section).toMatch(/review[^.]*agent[^.]*did not author what it reviews/);
      expect(section).toContain("never judges its own work");
    }
    for (const doors of await baselineSections("## Sub-agent Delegation (MANDATORY)")) {
      expect(doors).toContain("starts a sub-agent for exactly two reasons");
      expect(doors).toContain(
        "| Parallel units | Two or more story units or read-only lookups that pass the parallel-unit gate",
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
      expect(section).toMatch(/No delegation attempt is required[^.]*start of a stage/);
      expect(section).toMatch(/delegates only when it chooses/);
      expect(section).toMatch(/(?:real|actual) delegation attempt is the capability check/);
      expect(section).toMatch(/Do not gate execution on preflight availability questions/);
      expect(section).toMatch(/delegation fails[^.]*classify the failure first/);
      expect(section).toMatch(/Never simulate an agent/);
    }
  });

  // QFAI:AC-0001-0163-03
  // QFAI:EX-0001-0163-01
  it("has the session do the work itself when a delegation is unavailable, and report it", async () => {
    for (const taxonomy of await baselineSections("### Delegation Failure Taxonomy (MUST)")) {
      expect(taxonomy).toMatch(/\| `unavailable` \|[^|]*\| The session agent does the work itself/);
    }
    for (const section of await baselineSections(
      "### Delegation Failure — `unavailable` (The Session Agent Does The Work)",
    )) {
      expect(section).toMatch(/does the work itself[^.]*reports it as its own/);
      expect(section).toMatch(/never as the attempted agent/);
      for (const field of [
        "Delegation failure:",
        "Failure class: unavailable",
        "Attempted agent:",
        "Attempted task:",
        "Done by: the session agent",
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
      expect(taxonomy).toMatch(/limit or quota[^.]*only a user can lift[^.]*`unavailable`/);
      expect(taxonomy).toMatch(/retryability is not explicit, default to `unavailable`/);
    }
  });

  // QFAI:EX-0001-0163-06
  it("retries a saturated review delegation, then stops rather than reviewing its own work", async () => {
    for (const taxonomy of await baselineSections("### Delegation Failure Taxonomy (MUST)")) {
      expect(taxonomy).toContain("`agent thread limit reached`");
      expect(taxonomy).toContain("Bounded wait-and-retry of the identical delegation");
      expect(taxonomy).toMatch(
        /handle the failure as `unavailable`[^.]*report[^.]*`saturated \(retry budget exhausted\)`/,
      );
    }
    for (const retry of await baselineSections(
      "### Delegation Failure — `saturated` (Bounded Retry)",
    )) {
      expect(retry).toContain("Retry the identical delegation with backoff");
    }
    for (const stop of await baselineSections("### Delegation Failure (Hard Stop)")) {
      expect(stop).toContain("an independent judgement");
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
