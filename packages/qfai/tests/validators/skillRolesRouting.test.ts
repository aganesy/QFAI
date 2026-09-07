/**
 * A skill's `roles:` frontmatter and `agent-routing.yml` both declare who may
 * act inside that skill, and until now nothing compared them.
 *
 * `QFAI-AGENT-008` checks a routed id against the agent catalog, so the
 * manifest cannot name an agent that does not exist — but a skill could omit
 * an agent the manifest routes to it (including a mandatory, blocking one)
 * and a skill could grant a role no phase and no review profile ever
 * dispatches. Both directions are checked here.
 *
 * Two ways of escaping the comparison entirely are checked too: a `roles:` key
 * that is not a list (`QFAI-AGENT-016`), and a skill the manifest routes
 * nothing to at all (`QFAI-AGENT-017`).
 */

import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { RULE_PROMOTIONS } from "../../src/core/sunset.js";
import { validateAgentDefinition } from "../../src/core/validators/agentDefinition.js";
import type { Issue } from "../../src/core/types.js";
import type * as VersionModule from "../../src/core/version.js";

/**
 * The version the cross-check reads, overridable per test.
 *
 * The five findings ship behind one promotion window
 * (`RULE_PROMOTIONS.skillRolesRoutingCrossCheck`), so at the shipped version
 * they are warnings. An empty override means "defer to the real resolver", so
 * every case below keeps running against the version this package actually
 * ships.
 */
const toolVersion = vi.hoisted(() => ({ override: "" }));

vi.mock("../../src/core/version.js", async (importOriginal) => {
  const actual = await importOriginal<typeof VersionModule>();
  return {
    ...actual,
    resolveToolVersion: async (): Promise<string> =>
      toolVersion.override.length > 0 ? toolVersion.override : actual.resolveToolVersion(),
  };
});

afterEach(() => {
  toolVersion.override = "";
});

// tests/validators/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const shippedRoot = path.join(packageRoot, "assets", "init");

const CATALOG = `agents:
  - id: delivery-planner
    kind: worker
  - id: qa-strategist
    kind: worker
  - id: completion-reviewer
    kind: reviewer
  - id: implementation-reviewer
    kind: reviewer
`;

const PROFILES = `profiles:
  demo-profile:
    always_required: [completion-reviewer]
    conditional_required: [implementation-reviewer]
`;

const ROLES_ROUTING_CODES = new Set([
  "QFAI-AGENT-019",
  "QFAI-AGENT-015",
  "QFAI-AGENT-016",
  "QFAI-AGENT-017",
  "QFAI-AGENT-018",
]);

/** One `SKILL.md` with the given extra frontmatter lines. */
async function writeSkill(
  root: string,
  name: string,
  frontmatter: readonly string[],
): Promise<void> {
  const skillDir = path.join(root, ".qfai", "assistant", "skills", name);
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    ["---", `name: ${name}`, ...frontmatter, "---", "", "# Demo", ""].join("\n"),
    "utf-8",
  );
}

type Fixture = {
  /** Omit to write no SKILL.md at all. */
  roles?: readonly string[];
  /** The literal `roles:` line, for declarations that are not a string list. */
  rolesLine?: string;
  mandatory?: readonly string[];
  conditional?: readonly string[];
  blocking?: readonly string[];
  /** A second skill directory the routing manifest names nowhere. */
  extraSkill?: { name: string; routingProfile?: string };
  /** `routing-profile:` for demo-skill's own frontmatter. */
  skillRoutingProfile?: string;
  /** The manifest's `review_profile:` for demo-skill; `null` omits the key. */
  reviewProfile?: string | null;
  /** Replace demo-skill's phase list with one that dispatches nothing. */
  phases?: "empty" | "absent" | "not-a-list" | "no-agents";
  /** The literal `mandatory_agents:` line, for values that are not a list. */
  mandatoryLine?: string;
  /** Replace `review-profiles.yml` wholesale. */
  profilesYaml?: string;
  /** demo-skill's whole `SKILL.md`, for frontmatter the parser cannot read. */
  rawSkillDoc?: string;
  /** The whole routing manifest, for shapes the walk cannot use at all. */
  brokenRouting?: string;
  /** Replace demo-skill's `SKILL.md` with a FIFO (POSIX only). */
  fifoSkillDoc?: boolean;
};

/** demo-skill's `phases:` block, in the shape the fixture asked for. */
function phaseLines(fixture: Fixture): string[] {
  switch (fixture.phases) {
    case "absent":
      return [];
    case "empty":
      return ["    phases: []"];
    case "not-a-list":
      return ["    phases: none"];
    case "no-agents":
      // A well-formed phase object that names no agent field at all.
      return ["    phases:", "      - id: only"];
    default:
      return [
        "    phases:",
        "      - id: only",
        fixture.mandatoryLine ??
          `        mandatory_agents: [${(fixture.mandatory ?? []).join(", ")}]`,
        `        conditional_agents: [${(fixture.conditional ?? []).join(", ")}]`,
        "        parallel_groups: []",
        `        blocking_agents: [${(fixture.blocking ?? []).join(", ")}]`,
      ];
  }
}

async function collectIssues(fixture: Fixture): Promise<Issue[]> {
  const root = path.join(
    os.tmpdir(),
    `qfai-skill-roles-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const manifest = path.join(root, ".qfai", "assistant", "manifest");
  await mkdir(manifest, { recursive: true });
  await mkdir(path.join(root, ".qfai", "assistant", "agents"), { recursive: true });
  try {
    await writeFile(path.join(manifest, "agent-catalog.yml"), CATALOG, "utf-8");
    await writeFile(
      path.join(manifest, "review-profiles.yml"),
      fixture.profilesYaml ?? PROFILES,
      "utf-8",
    );
    const reviewProfile =
      fixture.reviewProfile === undefined ? "demo-profile" : fixture.reviewProfile;
    await writeFile(
      path.join(manifest, "agent-routing.yml"),
      fixture.brokenRouting ??
        [
          "routing:",
          "  - skill: demo-skill",
          ...phaseLines(fixture),
          ...(reviewProfile === null ? [] : [`    review_profile: ${reviewProfile}`]),
          "",
        ].join("\n"),
      "utf-8",
    );
    const rolesLine =
      fixture.rolesLine ?? (fixture.roles && `roles: [${fixture.roles.join(", ")}]`);
    if (fixture.rawSkillDoc !== undefined) {
      const skillDir = path.join(root, ".qfai", "assistant", "skills", "demo-skill");
      await mkdir(skillDir, { recursive: true });
      await writeFile(path.join(skillDir, "SKILL.md"), fixture.rawSkillDoc, "utf-8");
    } else if (rolesLine ?? fixture.skillRoutingProfile) {
      await writeSkill(root, "demo-skill", [
        ...(rolesLine ? [rolesLine] : []),
        ...(fixture.skillRoutingProfile ? [`routing-profile: ${fixture.skillRoutingProfile}`] : []),
      ]);
    }
    if (fixture.fifoSkillDoc) {
      const skillDoc = path.join(root, ".qfai", "assistant", "skills", "demo-skill", "SKILL.md");
      await rm(skillDoc, { force: true });
      execFileSync("mkfifo", [skillDoc]);
    }
    if (fixture.extraSkill) {
      await writeSkill(
        root,
        fixture.extraSkill.name,
        fixture.extraSkill.routingProfile
          ? [`routing-profile: ${fixture.extraSkill.routingProfile}`]
          : [],
      );
    }
    return await validateAgentDefinition(root, defaultConfig);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** {@link collectIssues} narrowed to the roles/routing cross-check family. */
async function runFixture(fixture: Fixture): Promise<Issue[]> {
  const issues = await collectIssues(fixture);
  return issues.filter((entry) => ROLES_ROUTING_CODES.has(entry.code));
}

/**
 * The cross-check family plus the manifest-shape and dangling-reference codes
 * it has to stay out of the way of. `QFAI-AGENT-004` — no definition file for
 * a catalogued agent — is the fixture's own noise: it writes a catalog but no
 * `agents/*.md`, and every case here would carry four copies of it.
 */
const MANIFEST_CODES = new Set([
  ...ROLES_ROUTING_CODES,
  "QFAI-AGENT-008",
  "QFAI-AGENT-009",
  "QFAI-AGENT-010",
  "QFAI-AGENT-013",
]);

/** {@link collectIssues} narrowed to {@link MANIFEST_CODES}. */
async function runManifestFixture(fixture: Fixture): Promise<Issue[]> {
  const issues = await collectIssues(fixture);
  return issues.filter((entry) => MANIFEST_CODES.has(entry.code));
}

describe("QFAI-AGENT-019 — routed agents must be declared in the skill's roles:", () => {
  it("reports a mandatory routed agent absent from roles:", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "implementation-reviewer"],
      mandatory: ["delivery-planner", "completion-reviewer"],
      blocking: ["completion-reviewer"],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-AGENT-019");
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.message).toContain("completion-reviewer");
    expect(issues[0]?.file).toBe(".qfai/assistant/skills/demo-skill/SKILL.md");
  });

  it("reports a reviewer only the review profile selects", async () => {
    // `implementation-reviewer` is in no phase list — `demo-profile` alone
    // reaches it, exactly as `runtime-heavy` does for the shipped
    // `qfai-configure`. The `roles:` closed set has to cover it too.
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer"],
      mandatory: ["delivery-planner"],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-AGENT-019");
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.message).toContain("implementation-reviewer");
    expect(issues[0]?.message).toContain("conditional_required");
  });

  it("reports an always_required reviewer of the profile", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "implementation-reviewer"],
      mandatory: ["delivery-planner"],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-AGENT-019");
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.message).toContain("always_required");
  });

  it("reports a warning when only a conditional routed agent is absent from roles:", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      mandatory: ["delivery-planner"],
      conditional: ["qa-strategist"],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-AGENT-019");
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.message).toContain("qa-strategist");
  });

  it("passes when every routed agent is declared", async () => {
    const issues = await runFixture({
      roles: [
        "delivery-planner",
        "qa-strategist",
        "completion-reviewer",
        "implementation-reviewer",
      ],
      mandatory: ["delivery-planner"],
      conditional: ["qa-strategist"],
      blocking: ["delivery-planner"],
    });
    expect(issues).toEqual([]);
  });

  it("stays silent for a routed skill that ships no SKILL.md", async () => {
    const issues = await runFixture({ mandatory: ["delivery-planner"] });
    expect(issues).toEqual([]);
  });
});

describe("QFAI-AGENT-015 — declared roles must be selectable", () => {
  it("reports a warning for a role no phase and no review profile selects", async () => {
    const issues = await runFixture({
      roles: [
        "delivery-planner",
        "completion-reviewer",
        "implementation-reviewer",
        "qa-strategist",
      ],
      mandatory: ["delivery-planner"],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-AGENT-015");
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.message).toContain("qa-strategist");
  });

  it("accepts a role that only the declared review profile selects", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      mandatory: ["delivery-planner"],
    });
    expect(issues).toEqual([]);
  });

  it("accepts orchestrator, which is dispatched outside the routing manifest", async () => {
    const issues = await runFixture({
      roles: ["orchestrator", "delivery-planner", "completion-reviewer", "implementation-reviewer"],
      mandatory: ["delivery-planner"],
    });
    expect(issues).toEqual([]);
  });
});

describe("QFAI-AGENT-016 — a malformed roles: declaration is not 'no declaration'", () => {
  it("reports the scalar form instead of silently skipping both directions", async () => {
    // `roles: completion-reviewer` is valid YAML and reads as a declaration to
    // a human, but it is not a list. Treating it as an absent key disabled the
    // whole cross-check, so a missing mandatory routed agent passed.
    const issues = await runFixture({
      rolesLine: "roles: completion-reviewer",
      mandatory: ["delivery-planner", "completion-reviewer"],
      blocking: ["completion-reviewer"],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-AGENT-016");
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.file).toBe(".qfai/assistant/skills/demo-skill/SKILL.md");
  });

  it("reports a list that is not made of agent ids", async () => {
    const issues = await runFixture({
      rolesLine: "roles: [delivery-planner, { nested: true }]",
      mandatory: ["delivery-planner"],
    });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-016"]);
  });
});

describe("QFAI-AGENT-017 — a skill bound to the manifest must be routed", () => {
  it("reports a skill that declares routing-profile: with no route", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      mandatory: ["delivery-planner"],
      extraSkill: { name: "orphan-skill", routingProfile: "demo-profile" },
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-AGENT-017");
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.file).toBe(".qfai/assistant/skills/orphan-skill/SKILL.md");
  });

  it("exempts a skill that declares no routing-profile:", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      mandatory: ["delivery-planner"],
      extraSkill: { name: "unrouted-by-design" },
    });
    expect(issues).toEqual([]);
  });

  // A `- skill:` header alone registered the skill as routed, so all three of
  // these left a workflow that can dispatch no one looking fully routed.
  for (const phases of ["empty", "absent", "not-a-list"] as const) {
    it(`reports a route header whose phases: is ${phases}`, async () => {
      const issues = await runFixture({
        roles: ["delivery-planner"],
        skillRoutingProfile: "demo-profile",
        phases,
      });
      expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-017"]);
      expect(issues[0]?.severity).toBe("warning");
      expect(issues[0]?.file).toBe(".qfai/assistant/skills/demo-skill/SKILL.md");
    });
  }

  it("does not blame the declared roles of a skill with no usable phases", async () => {
    // The manifest dispatches nobody inside it, so neither direction of the
    // roles cross-check can say anything true — only QFAI-AGENT-017 can.
    const issues = await runFixture({
      roles: ["delivery-planner", "qa-strategist"],
      skillRoutingProfile: "demo-profile",
      phases: "empty",
    });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-017"]);
  });
});

describe("a damaged SKILL.md cannot hang the run", () => {
  // The pre-flight that stops `qfai validate` on a damaged skills tree knows
  // only the canonical `.qfai/assistant/skills`, so a project that moved
  // `paths.skillsDir` reaches this read with the damage unreported — and
  // `readFile` on a FIFO waits for a writer that never comes.
  const posixOnly = process.platform === "win32" ? it.skip : it;

  posixOnly(
    "skips a SKILL.md that is not a regular file instead of waiting on it",
    async () => {
      const issues = await runFixture({
        roles: ["delivery-planner"],
        mandatory: ["delivery-planner"],
        fifoSkillDoc: true,
      });
      expect(issues).toEqual([]);
    },
    20_000,
  );
});

describe("QFAI-AGENT-018 — the skill and the manifest must name the same review gate", () => {
  it("reports a routing-profile: the manifest's review_profile: contradicts", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      mandatory: ["delivery-planner"],
      skillRoutingProfile: "other-profile",
    });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-018"]);
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.message).toContain("other-profile");
    expect(issues[0]?.message).toContain("demo-profile");
  });

  it("reports a route that gives the skill no review_profile: at all", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner"],
      mandatory: ["delivery-planner"],
      skillRoutingProfile: "demo-profile",
      reviewProfile: null,
    });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-018"]);
    expect(issues[0]?.message).toContain("no review_profile");
  });

  it("reports a profile review-profiles.yml does not define", async () => {
    // Both sides agreeing is not enough: `qfai-prototyping` named
    // `ui-surface-aware`, which no profile file has ever defined.
    const issues = await runFixture({
      roles: ["delivery-planner"],
      mandatory: ["delivery-planner"],
      skillRoutingProfile: "ghost-profile",
      reviewProfile: "ghost-profile",
    });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-018"]);
    expect(issues[0]?.message).toContain("ghost-profile");
  });

  it("accepts a routing-profile: that matches a defined profile", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      mandatory: ["delivery-planner"],
      skillRoutingProfile: "demo-profile",
    });
    expect(issues).toEqual([]);
  });
});

describe("an unusable routing manifest stops the cross-check", () => {
  // `validateRouting` reports QFAI-AGENT-007 and resolves no routes at all, so
  // holding every skill against that empty result told each of them its route
  // was missing and each declared role unreachable — for one broken manifest.
  for (const [label, brokenRouting] of [
    ["a scalar document", "just a string\n"],
    ["a non-list routing:", "routing: none\n"],
    ["unparseable YAML", "routing:\n  - skill: demo-skill\n   bad-indent: [\n"],
  ] as const) {
    it(`emits no roles/routing finding for ${label}`, async () => {
      const issues = await runFixture({
        roles: ["delivery-planner", "qa-strategist"],
        skillRoutingProfile: "demo-profile",
        brokenRouting,
      });
      expect(issues).toEqual([]);
    });
  }
});

describe("a phase that dispatches nobody is not a routed phase", () => {
  // `entry.phases` counted every well-formed phase object, so a phase with no
  // agent field — or one whose fields are scalars both readers drop — left the
  // skill looking routed while the manifest could dispatch no one inside it.
  it("reports a phase object that names no agent field at all", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner"],
      skillRoutingProfile: "demo-profile",
      phases: "no-agents",
    });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-017"]);
  });

  it("reports a scalar mandatory_agents and does not count its phase", async () => {
    const issues = await runManifestFixture({
      roles: ["delivery-planner"],
      skillRoutingProfile: "demo-profile",
      mandatoryLine: "        mandatory_agents: completion-reviewer",
    });
    const codes = issues.map((entry) => entry.code).sort();
    // The shape finding names the slip; 017 says the route dispatches nobody.
    expect(codes).toEqual(["QFAI-AGENT-013", "QFAI-AGENT-017"]);
    const shape = issues.find((entry) => entry.code === "QFAI-AGENT-013");
    expect(shape?.severity).toBe("error");
    expect(shape?.message).toContain("mandatory_agents");
    expect(shape?.message).toContain("expected a list of agent ids");
  });

  it("still counts a phase whose only agents come from parallel_groups", async () => {
    const issues = await runManifestFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      skillRoutingProfile: "demo-profile",
      brokenRouting: `routing:
  - skill: demo-skill
    review_profile: demo-profile
    phases:
      - id: only
        parallel_groups: [[delivery-planner]]
`,
    });
    expect(issues).toEqual([]);
  });

  it("reports a parallel_groups entry that is not a list", async () => {
    const issues = await runManifestFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      skillRoutingProfile: "demo-profile",
      brokenRouting: `routing:
  - skill: demo-skill
    review_profile: demo-profile
    phases:
      - id: only
        mandatory_agents: [delivery-planner]
        parallel_groups: [delivery-planner]
`,
    });
    const shape = issues.filter((entry) => entry.code === "QFAI-AGENT-013");
    expect(shape).toHaveLength(1);
    expect(shape[0]?.message).toContain("parallel_groups entry");
  });
});

describe("a broken manifest reference is never pushed onto the skill", () => {
  it("does not ask a skill to declare an agent the catalog does not define", async () => {
    const issues = await runManifestFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      mandatory: ["delivery-planner", "ghost-agent"],
      skillRoutingProfile: "demo-profile",
    });
    // QFAI-AGENT-008 owns the dangling reference. QFAI-AGENT-019 must not
    // also tell the operator to add "ghost-agent" to roles:.
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-008"]);
  });

  it("does not ask a skill to declare a non-reviewer the profile names", async () => {
    const issues = await runManifestFixture({
      roles: ["delivery-planner", "completion-reviewer"],
      mandatory: ["delivery-planner"],
      skillRoutingProfile: "demo-profile",
      profilesYaml: `profiles:
  demo-profile:
    always_required: [completion-reviewer]
    conditional_required: [delivery-planner, qa-strategist]
`,
    });
    // `delivery-planner` / `qa-strategist` are workers, not reviewers.
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-010", "QFAI-AGENT-010"]);
  });

  it("reports a reviewer field that is not a list", async () => {
    const issues = await runManifestFixture({
      roles: ["delivery-planner"],
      mandatory: ["delivery-planner"],
      skillRoutingProfile: "demo-profile",
      profilesYaml: `profiles:
  demo-profile:
    always_required: completion-reviewer
`,
    });
    const shape = issues.filter((entry) => entry.code === "QFAI-AGENT-009");
    expect(shape).toHaveLength(1);
    expect(shape[0]?.severity).toBe("error");
    expect(shape[0]?.message).toContain("always_required");
    expect(shape[0]?.message).toContain("expected a list of reviewer ids");
  });
});

describe("QFAI-AGENT-016 — an unreadable SKILL.md frontmatter is reported", () => {
  for (const [label, rawSkillDoc] of [
    ["a YAML syntax error", "---\nname: demo-skill\n roles: [\n---\n\n# Demo\n"],
    ["a frontmatter block that is not a mapping", "---\n- just\n- a list\n---\n\n# Demo\n"],
  ] as const) {
    it(`reports ${label} instead of skipping every check`, async () => {
      const issues = await runFixture({
        mandatory: ["delivery-planner"],
        rawSkillDoc,
      });
      expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-016"]);
      expect(issues[0]?.severity).toBe("warning");
      expect(issues[0]?.file).toBe(".qfai/assistant/skills/demo-skill/SKILL.md");
    });
  }

  it("reports a frontmatter block that is opened and never closed", async () => {
    // The delimiter regex needs both fences, so a lost closing `---` simply
    // failed to match and read as "this file has no frontmatter" — while the
    // assistant sees the whole document as body text and loads no skill at
    // all. Absence and breakage are not the same claim.
    const issues = await runFixture({
      mandatory: ["delivery-planner"],
      rawSkillDoc: "---\nname: demo-skill\nroles: [delivery-planner]\n\n# Demo\n",
    });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-016"]);
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.file).toBe(".qfai/assistant/skills/demo-skill/SKILL.md");
  });

  it("still treats a SKILL.md with no frontmatter block as no declaration", async () => {
    const issues = await runFixture({
      mandatory: ["delivery-planner"],
      rawSkillDoc: "# Demo\n\nNo frontmatter at all.\n",
    });
    expect(issues).toEqual([]);
  });

  it("does not read a body-level --- rule as an unterminated block", async () => {
    const issues = await runFixture({
      mandatory: ["delivery-planner"],
      rawSkillDoc: "# Demo\n\nIntro.\n\n---\n\nA thematic break, not frontmatter.\n",
    });
    expect(issues).toEqual([]);
  });
});

describe("QFAI-AGENT-016 — an unusable routing-profile: is not an absent one", () => {
  // An absent `routing-profile:` is the deliberate "not routed" declaration
  // (`web-research`). A key that is present but is not a profile name binds the
  // skill to nothing while looking like that exemption, so neither
  // `QFAI-AGENT-016` nor `QFAI-AGENT-018` could fire on it.
  for (const [label, declared] of [
    ["a list", "[demo-profile]"],
    ["an empty string", '""'],
  ] as const) {
    it(`reports ${label} instead of reading the skill as deliberately un-routed`, async () => {
      const issues = await runFixture({
        roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
        mandatory: ["delivery-planner"],
        skillRoutingProfile: declared,
      });
      expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-016"]);
      expect(issues[0]?.severity).toBe("warning");
      expect(issues[0]?.file).toBe(".qfai/assistant/skills/demo-skill/SKILL.md");
    });
  }

  it("reports it for a skill directory the manifest routes nothing to", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      mandatory: ["delivery-planner"],
      extraSkill: { name: "orphan-skill", routingProfile: "[demo-profile]" },
    });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-016"]);
    expect(issues[0]?.file).toBe(".qfai/assistant/skills/orphan-skill/SKILL.md");
  });
});

describe("QFAI-AGENT-018 — manifest-side profile defects do not need a skill declaration", () => {
  it("reports a route pointing at an undefined profile when the skill declares none", async () => {
    // The existence check used to sit behind `routing-profile:`, so a route
    // through `ghost-profile` was invisible — and `collectSelections` reads an
    // unknown profile as an empty reviewer set, losing the gate silently.
    const issues = await runFixture({
      roles: ["delivery-planner"],
      mandatory: ["delivery-planner"],
      reviewProfile: "ghost-profile",
    });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-018"]);
    expect(issues[0]?.message).toContain("ghost-profile");
    expect(issues[0]?.message).toContain("review-profiles.yml does not define");
  });

  it("reports an undefined profile once when both sides name it", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner"],
      mandatory: ["delivery-planner"],
      skillRoutingProfile: "ghost-profile",
      reviewProfile: "ghost-profile",
    });
    expect(issues).toHaveLength(1);
  });

  it("reports an undefined profile for a routed skill that ships no SKILL.md", async () => {
    // The existence check sat behind the `SKILL.md` read, so a route through a
    // profile `review-profiles.yml` never defines was invisible whenever the
    // skill shipped no readable file — and nothing else in this validator
    // checks a route's profile reference at all.
    const issues = await runFixture({
      mandatory: ["delivery-planner"],
      reviewProfile: "ghost-profile",
    });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-018"]);
    expect(issues[0]?.message).toContain("ghost-profile");
    expect(issues[0]?.message).toContain("review-profiles.yml does not define");
  });

  it("reports a review_profile: that is not a profile name", async () => {
    // `typeof === "string"` alone dropped the value, collecting the route as
    // one that declares no review gate — so the reviewers the key was meant to
    // bind vanished and no finding named the key.
    const issues = await runManifestFixture({
      roles: ["delivery-planner"],
      mandatory: ["delivery-planner"],
      reviewProfile: "[demo-profile]",
    });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-013"]);
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.message).toContain("review_profile");
  });

  it("does not call a malformed review_profile: an absent one", async () => {
    const issues = await runManifestFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      mandatory: ["delivery-planner"],
      skillRoutingProfile: "demo-profile",
      reviewProfile: "[demo-profile]",
    });
    // The shape finding owns it. Reporting a mismatch as well would say the
    // route "declares no review_profile", which is not what the file says.
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-013"]);
  });

  it("reports two route blocks that give one skill different review gates", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      skillRoutingProfile: "demo-profile",
      brokenRouting: `routing:
  - skill: demo-skill
    review_profile: demo-profile
    phases:
      - id: first
        mandatory_agents: [delivery-planner]
  - skill: demo-skill
    review_profile: other-profile
    phases:
      - id: second
        mandatory_agents: [delivery-planner]
`,
    });
    const conflict = issues.filter(
      (entry) => entry.code === "QFAI-AGENT-018" && entry.message.includes("two different"),
    );
    expect(conflict).toHaveLength(1);
    expect(conflict[0]?.severity).toBe("warning");
    expect(conflict[0]?.message).toContain("demo-profile");
    expect(conflict[0]?.message).toContain("other-profile");
  });
});

describe("an untrustworthy review gate short-circuits the roles cross-check", () => {
  // Every case below already produces one precise finding about the gate. The
  // reviewer set behind that finding is known to be partial, so running the
  // closed-set comparison on it adds work items that name roles the skill in
  // fact declared correctly — and stops asking for the mandatory ones.
  it("does not call a reviewer unreachable when the route names no gate", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer"],
      mandatory: ["delivery-planner"],
      skillRoutingProfile: "demo-profile",
      reviewProfile: null,
    });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-018"]);
  });

  it("does not ask a skill to drop a reviewer a truncated profile lost", async () => {
    const issues = await runManifestFixture({
      roles: ["delivery-planner", "completion-reviewer"],
      mandatory: ["delivery-planner"],
      skillRoutingProfile: "demo-profile",
      profilesYaml: `profiles:
  demo-profile:
    always_required: completion-reviewer
`,
    });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-009"]);
  });

  it("does not blame the roles of a skill routed through an undefined profile", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer"],
      mandatory: ["delivery-planner"],
      skillRoutingProfile: "ghost-profile",
      reviewProfile: "ghost-profile",
    });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-018"]);
  });

  it("does not cross-check against the first of two conflicting gates", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner"],
      skillRoutingProfile: "demo-profile",
      brokenRouting: `routing:
  - skill: demo-skill
    review_profile: demo-profile
    phases:
      - id: first
        mandatory_agents: [delivery-planner]
  - skill: demo-skill
    review_profile: other-profile
    phases:
      - id: second
        mandatory_agents: [delivery-planner]
`,
    });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-018"]);
    expect(issues[0]?.message).toContain("two different");
  });

  it("still runs both directions when the gate is sound", async () => {
    // The over-correction pin: a trustworthy profile must keep producing the
    // findings the short-circuit above suppresses.
    const issues = await runFixture({
      roles: ["delivery-planner"],
      mandatory: ["delivery-planner"],
      skillRoutingProfile: "demo-profile",
    });
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-019", "QFAI-AGENT-019"]);
    expect(issues.map((entry) => entry.severity).sort()).toEqual(["warning", "warning"]);
  });
});

describe("shipped manifests and skills agree", () => {
  it("emits no roles/routing divergence for the shipped assistant tree", async () => {
    const issues = await validateAgentDefinition(shippedRoot, defaultConfig);
    const divergences = issues
      .filter((entry) => ROLES_ROUTING_CODES.has(entry.code))
      .map((entry) => entry.message);
    expect(divergences).toEqual([]);
  });

  it("catches a shipped route deleted from the manifest", async () => {
    // The guard above only walks the routing map, so deleting a whole
    // `- skill:` block would have left every skill it named unexamined.
    const root = path.join(
      os.tmpdir(),
      `qfai-skill-roles-dropped-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    try {
      await cp(path.join(shippedRoot, ".qfai"), path.join(root, ".qfai"), { recursive: true });
      const routingPath = path.join(root, ".qfai", "assistant", "manifest", "agent-routing.yml");
      const routing = await readFile(routingPath, "utf-8");
      const start = routing.indexOf("  - skill: qfai-sdd");
      const end = routing.indexOf("  - skill: qfai-implement");
      expect(start).toBeGreaterThan(-1);
      expect(end).toBeGreaterThan(start);
      await writeFile(routingPath, routing.slice(0, start) + routing.slice(end), "utf-8");

      const issues = await validateAgentDefinition(root, defaultConfig);
      const dropped = issues.filter((entry) => entry.code === "QFAI-AGENT-017");
      expect(dropped.map((entry) => entry.file)).toEqual([
        ".qfai/assistant/skills/qfai-sdd/SKILL.md",
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

/**
 * The window itself.
 *
 * Nothing compared a skill's `roles:` with `agent-routing.yml` before, so on
 * the release that introduces this rule every project whose two sides drifted
 * apart meets the whole backlog at once — the shape P7 exists to keep out of a
 * consuming repository's `--fail-on error` gate. All five findings therefore
 * report as warnings until `RULE_PROMOTIONS.skillRolesRoutingCrossCheck`, and
 * as errors from it. Asserted against the pin rather than a copy of it, so
 * moving the pin moves these tests with it.
 */
describe("the routing cross-check ships behind a promotion window", () => {
  const promoteAt = RULE_PROMOTIONS.skillRolesRoutingCrossCheck.promoteAt;

  const undeclaredRequired = {
    roles: ["delivery-planner", "implementation-reviewer"],
    mandatory: ["delivery-planner", "completion-reviewer"],
  } as const;

  it("names the release that ends the window while it is open", async () => {
    const issues = await runFixture(undeclaredRequired);
    expect(issues[0]?.code).toBe("QFAI-AGENT-019");
    expect(issues[0]?.severity).toBe("warning");
    // P7 step 3: an operator running `--fail-on error` can read the debt.
    expect(issues[0]?.message).toContain(promoteAt);
  });

  it("promotes the required half of QFAI-AGENT-019 at the pinned release", async () => {
    toolVersion.override = promoteAt;
    const issues = await runFixture(undeclaredRequired);
    expect(issues[0]?.code).toBe("QFAI-AGENT-019");
    expect(issues[0]?.severity).toBe("error");
    // No window left to advertise once it has closed.
    expect(issues[0]?.message).not.toContain(promoteAt);
  });

  it("leaves a conditional omission a warning after the window closes", async () => {
    // Only the `required` half is on the ladder: a `conditional_agents` /
    // `conditional_required` omission is a documentation gap, not a gate the
    // run cannot finish without.
    toolVersion.override = promoteAt;
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      mandatory: ["delivery-planner"],
      conditional: ["qa-strategist"],
    });
    expect(issues[0]?.code).toBe("QFAI-AGENT-019");
    expect(issues[0]?.severity).toBe("warning");
  });

  it("promotes QFAI-AGENT-015 at the pinned release", async () => {
    toolVersion.override = promoteAt;
    const issues = await runFixture({
      roles: [
        "delivery-planner",
        "completion-reviewer",
        "implementation-reviewer",
        "qa-strategist",
      ],
      mandatory: ["delivery-planner"],
    });
    expect(issues[0]?.code).toBe("QFAI-AGENT-015");
    expect(issues[0]?.severity).toBe("error");
  });

  it("stays inside the window when the version cannot be read", async () => {
    // `resolveToolVersion` answers "unknown" on a read failure. An unreadable
    // version must never be the thing that turns a warning into a build break.
    toolVersion.override = "unknown";
    const issues = await runFixture(undeclaredRequired);
    expect(issues[0]?.severity).toBe("warning");
  });
});
