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

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateAgentDefinition } from "../../src/core/validators/agentDefinition.js";
import type { Issue } from "../../src/core/types.js";

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
  "QFAI-AGENT-014",
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
  phases?: "empty" | "absent" | "not-a-list";
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
    default:
      return [
        "    phases:",
        "      - id: only",
        `        mandatory_agents: [${(fixture.mandatory ?? []).join(", ")}]`,
        `        conditional_agents: [${(fixture.conditional ?? []).join(", ")}]`,
        "        parallel_groups: []",
        `        blocking_agents: [${(fixture.blocking ?? []).join(", ")}]`,
      ];
  }
}

async function runFixture(fixture: Fixture): Promise<Issue[]> {
  const root = path.join(
    os.tmpdir(),
    `qfai-skill-roles-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const manifest = path.join(root, ".qfai", "assistant", "manifest");
  await mkdir(manifest, { recursive: true });
  await mkdir(path.join(root, ".qfai", "assistant", "agents"), { recursive: true });
  try {
    await writeFile(path.join(manifest, "agent-catalog.yml"), CATALOG, "utf-8");
    await writeFile(path.join(manifest, "review-profiles.yml"), PROFILES, "utf-8");
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
    if (rolesLine ?? fixture.skillRoutingProfile) {
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
    const issues = await validateAgentDefinition(root, defaultConfig);
    return issues.filter((entry) => ROLES_ROUTING_CODES.has(entry.code));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("QFAI-AGENT-014 — routed agents must be declared in the skill's roles:", () => {
  it("reports an error when a mandatory routed agent is absent from roles:", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "implementation-reviewer"],
      mandatory: ["delivery-planner", "completion-reviewer"],
      blocking: ["completion-reviewer"],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-AGENT-014");
    expect(issues[0]?.severity).toBe("error");
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
    expect(issues[0]?.code).toBe("QFAI-AGENT-014");
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.message).toContain("implementation-reviewer");
    expect(issues[0]?.message).toContain("conditional_required");
  });

  it("makes an always_required reviewer of the profile an error", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "implementation-reviewer"],
      mandatory: ["delivery-planner"],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-AGENT-014");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.message).toContain("always_required");
  });

  it("reports a warning when only a conditional routed agent is absent from roles:", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      mandatory: ["delivery-planner"],
      conditional: ["qa-strategist"],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-AGENT-014");
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
    expect(issues[0]?.severity).toBe("error");
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
    expect(issues[0]?.severity).toBe("error");
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
      expect(issues[0]?.severity).toBe("error");
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
    expect(issues[0]?.severity).toBe("error");
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
