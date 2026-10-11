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

import { runInit } from "../../src/cli/commands/init.js";
import { parseAgentFrontmatter } from "../../src/core/agentFrontmatter.js";
import { CODEX_AGENT_WRAPPER_DIR, renderCodexAgentToml } from "../../src/core/codexAgentToml.js";
import { loadConfig } from "../../src/core/config.js";
import {
  readEffectiveRouting,
  validateAgentDefinition,
} from "../../src/core/validators/agentDefinition.js";
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

  // QFAI:AC-0001-0165-01
  // QFAI:EX-0001-0165-01
  it("defines pattern-doubler as an advisory mode that proposes concrete coverage with a rationale and no numeric target", async () => {
    const profiles = asRecord(
      parseYaml(await readAsset(path.join(DEFAULTS_DIR, "review-profiles.yml"))),
    );
    const mode = asRecord(asRecord(profiles.optional_modes)["pattern-doubler"]);
    expect(mode.kind).toBe("advisory");
    expect(mode.description).toBe(
      "Propose missing concrete business-flow, story, acceptance-criterion, or example coverage with rationale; do not demand more abstract rules or numeric targets.",
    );
    expect(mode.rationale_required).toBe(true);
    expect(Object.keys(mode).sort(), "the mode declares no growth target of any kind").toEqual([
      "description",
      "kind",
      "rationale_required",
    ]);
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
    expect(cards.size).toBe(19);
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
    const solution = cards.get("solution-architect") ?? "";
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

  // QFAI:AC-0001-0161-02
  // QFAI:EX-0001-0161-05
  it("keeps what each replaced role was responsible for in the card that replaced it", async () => {
    const cards = await readCards();
    const architect = cards.get("solution-architect") ?? "";
    const frontmatter = cardFrontmatter(architect);
    expect(frontmatter.replaces).toEqual(["architect", "contract-designer"]);
    expect(frontmatter.owned_artifacts).toEqual([
      "architecture-decisions",
      "contracts",
      "boundaries",
    ]);
    expect(String(frontmatter.mission).replace(/\s+/g, " ")).toBe(
      "Choose system boundaries and contracts that satisfy specs and preserve rejected options.",
    );
    const architectBody = architect.replace(/\s+/g, " ");
    expect(architectBody).toContain(
      "Define architecture boundaries, non-goals, and major trade-offs.",
    );
    expect(architectBody).toContain(
      "Design UI, API, and DB contracts that make requirements executable.",
    );
    expect(architectBody).toContain("Contract decisions and ownership boundaries");

    // One responsibility of each role a card replaces, as the card words it.
    const represented: Record<string, string[]> = {
      "acceptance-test-engineer": [
        "Implement one E2E test per BF and integration or API tests for each active AC obligation.",
      ],
      "delivery-planner": [
        "Decompose work into phases, checkpoints, owners, dependencies and rerun gates.",
      ],
      "discovery-analyst": [
        "Research domain context and external references when needed.",
        "Design high-value questions that reduce ambiguity quickly.",
        "Facilitate discussions, trade-off framing, and boundary clarification.",
      ],
      "implementation-reviewer": ["Review changed production code and tests"],
      "product-experience-architect": [
        "Define UX direction, user journeys, interaction patterns, and accessibility expectations.",
        "Define visual design direction, tokens, typography, color, and layout hierarchy.",
        "Design navigation structures, IA, and screen transition logic.",
      ],
      "product-surface-reviewer": [
        "Audit frontend changes for correctness and user-facing risk.",
        "Audit layout sanity, interaction usability, and accessibility guardrails.",
        "Audit visual design, token alignment, and service-level UX coherence.",
      ],
      "qa-gatekeeper": [
        "Block completion until validation, coverage, runtime, and prototype evidence",
      ],
      "qa-strategist": [
        "Define QA priorities, risk posture, and evidence expectations.",
        "Audit coverage, traceability, and failure handling from a strategy perspective.",
      ],
      "requirements-analyst": [
        "Harvest undefined decisions and maintain the OQ backlog.",
        "Produce multiple solution options with a recommendation.",
      ],
      "requirements-reviewer": [
        "Audit option sets for missing alternatives and weak recommendation rationale.",
        "Review OQ candidates for completeness, neutrality, and safe deferral.",
      ],
    };
    for (const [name, responsibilities] of Object.entries(represented)) {
      const card = cards.get(name) ?? "";
      const replaces = cardFrontmatter(card).replaces;
      expect(Array.isArray(replaces) && replaces.length > 0, `${name} replaces a role`).toBe(true);
      const text = card.replace(/\s+/g, " ");
      for (const responsibility of responsibilities) {
        expect(text, name).toContain(responsibility);
      }
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

    const architect = cards.get("solution-architect") ?? "";
    expect(sectionLines(architect, "Mission")).toContain(
      "- Define architecture and contract decisions aligned with specs, constraints, and rejected-option history.",
    );
    expect(sectionLines(architect, "Deliverables")).toContain(
      "- Architecture decisions with trade-offs",
    );
    expect(sectionLines(architect, "Stop conditions")).toContain(
      "- Governing specs, routing rules, or required source artifacts are missing.",
    );
    expect(sectionLines(architect, "Sign-off")).toContain("- [ ] Deliverables are complete");

    const root = await initProject();
    try {
      const file = path.join(root, ".qfai", "assistant", "agent", "solution-architect.md");
      await writeFile(file, architect.replace("## Stop conditions", "## Stop"), "utf-8");
      const { config } = await loadConfig(root);
      const findings = await validateAgentDefinition(root, config);
      expect(
        findings
          .filter((finding) => finding.code === "QFAI-AGENT-005")
          .map((finding) => finding.message),
      ).toEqual([
        'Missing required section "## Stop conditions" in .qfai/assistant/agent/solution-architect.md',
      ]);
    } finally {
      await removeTempTree(root);
    }
  });
});

describe("a project overrides the built-in routing and review profiles whole", () => {
  const override = {
    step: "sdd-contract",
    phases: [
      {
        id: "review",
        mandatory_agents: ["implementation-reviewer"],
        parallel_groups: [],
        rerun_policy: "changed-scope-dependents",
      },
    ],
    review_profile: "project-strict",
  };
  const agentsOf = (entry: { agents: Map<string, string> } | undefined): string[] =>
    [...(entry?.agents.keys() ?? [])].sort();

  // QFAI:EX-0001-0161-02
  it("uses the package defaults when nothing is overridden, and the override entry alone when one is", async () => {
    const root = await initProject();
    try {
      const everything = await readdir(root, { recursive: true });
      expect(
        everything.filter((entry) =>
          ["agent-routing.yml", "review-profiles.yml"].includes(path.basename(entry)),
        ),
        "the project holds no routing file and no review-profile file",
      ).toEqual([]);
    } finally {
      await removeTempTree(root);
    }

    const defaults = await readEffectiveRouting({});
    expect(agentsOf(defaults.routing?.get("sdd-contract"))).toContain("solution-architect");
    expect([...(defaults.profiles?.keys() ?? [])].sort()).toEqual([
      "architecture-heavy",
      "default",
      "runtime-heavy",
    ]);

    const overridden = await readEffectiveRouting({
      routing: [override],
      reviewProfiles: {
        "project-strict": {
          always_required: ["implementation-reviewer"],
          conditional_required: [],
        },
      },
    });
    expect(
      agentsOf(overridden.routing?.get("sdd-contract")),
      "none of the default entry's other phases are merged in",
    ).toEqual(["implementation-reviewer"]);
    expect(overridden.routing?.get("sdd-contract")?.phases).toBe(1);
    expect(overridden.routing?.get("sdd-contract")?.reviewProfile).toBe("project-strict");
    expect([...(overridden.profiles?.keys() ?? [])].sort()).toEqual([
      "architecture-heavy",
      "default",
      "project-strict",
      "runtime-heavy",
    ]);
  });

  // QFAI:EX-0001-0161-03
  it("rejects an override that names an agent with no card, and offers no key for an optional review mode", async () => {
    const root = await initProject();
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        [
          "routing:",
          "  - step: sdd-contract",
          "    phases:",
          "      - id: design",
          "        mandatory_agents: [release-auditor]",
          "    review_profile: default",
          "reviewProfiles:",
          "  project-strict:",
          "    always_required: []",
          "optional_modes:",
          "  devils-advocate:",
          "    kind: blocking",
          "optionalModes:",
          "  pattern-doubler:",
          "    kind: blocking",
          "reviewModes:",
          "  devils-advocate: off",
          "",
        ].join("\n"),
        "utf-8",
      );
      const { config } = await loadConfig(root);
      expect(Object.keys(config).filter((key) => /mode/i.test(key))).toEqual([]);
      expect(Object.keys(config.reviewProfiles ?? {})).toEqual(["project-strict"]);
      expect(config.routing?.map((entry) => entry.step)).toEqual(["sdd-contract"]);

      const findings = await validateAgentDefinition(root, config);
      const unknown = findings.filter((finding) => finding.code === "QFAI-AGENT-008");
      expect(unknown.length).toBeGreaterThan(0);
      expect(unknown.every((finding) => finding.message.includes("release-auditor"))).toBe(true);
    } finally {
      await removeTempTree(root);
    }

    const profiles = asRecord(
      parseYaml(await readAsset(path.join(DEFAULTS_DIR, "review-profiles.yml"))),
    );
    const modes = asRecord(profiles.optional_modes);
    expect(Object.keys(modes)).toEqual(["devils-advocate", "pattern-doubler"]);
    expect(asRecord(modes["devils-advocate"]).kind).toBe("advisory");
    expect(asRecord(modes["pattern-doubler"]).kind).toBe("advisory");
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
      expect(section).toMatch(/may (?:author|write) any artifact itself/);
      expect(section).toMatch(/independent parts[^.]*sub-agents[^.]*parallel/);
      expect(section).toMatch(/review[^.]*agent[^.]*did not (?:author|write) what it reviews/);
      expect(section).toContain("never reviews its own work");
    }
    for (const content of [
      await readAsset(SHARED_DELEGATION_BASELINE),
      await readAsset(LIVE_SHARED_DELEGATION_BASELINE),
    ]) {
      expect(getSection(content, "## Sub-agent Delegation (MANDATORY)")).toMatch(
        /Delegation is optional/,
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
      expect(section).toMatch(/Never simulate a role/);
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
      expect(section).toMatch(/does the work itself[^.]*reports it as its own/);
      expect(section).toMatch(/never as the attempted role/);
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
