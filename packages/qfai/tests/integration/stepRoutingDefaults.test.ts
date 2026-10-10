/**
 * Integration: the package routing defaults are keyed by step, and the agent checks hold a
 * shipped step's `roles:` and `routing-profile:` against its entry as they hold a skill's.
 */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { loadConfig, routingEntryName } from "../../src/core/config.js";
import {
  ASSISTANT_ASSET_MAX_LINE_CHARS,
  assistantLineCeiling,
  countLines,
  widestMeasurableLine,
} from "../../src/core/doctor/assetLineBudget.js";
import { readRoutingDefaultsFiles } from "../../src/core/routingDefaults.js";
import type { Issue } from "../../src/core/types.js";
import { validateAgentDefinition } from "../../src/core/validators/agentDefinition.js";
import {
  defaultRoutingEntries,
  frontMatterOf,
  readDefault,
  readShipped,
} from "../helpers/shippedAssistant.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

type RoutingEntry = Record<string, unknown>;

function isRecord(value: unknown): value is RoutingEntry {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function names(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

const AGENT_CHECKS = /^QFAI-AGENT-01[3-9]$/;
const SDD_CONTRACT = path.join(".qfai", "assistant", "step", "sdd-contract", "STEP.md");
const MIGRATION_SKILL = path.join(
  ".qfai",
  "assistant",
  "skill",
  "qfai-migration-v1-to-v2",
  "SKILL.md",
);

const routingEntries = defaultRoutingEntries;

/** Agent-check findings on a fresh install, after `edit` rewrites the step or skill at `relative`. */
async function agentFindings(
  edit?: (text: string) => string,
  relative: string = SDD_CONTRACT,
): Promise<Issue[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-step-routing-"));
  try {
    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
    if (edit) {
      const file = path.join(root, relative);
      await writeFile(file, edit(await readFile(file, "utf-8")), "utf-8");
    }
    const { config } = await loadConfig(root);
    const issues = await validateAgentDefinition(root, config);
    return issues.filter((finding) => AGENT_CHECKS.test(finding.code));
  } finally {
    await removeTempTree(root);
  }
}

describe("routing keyed by step", () => {
  // QFAI:AC-0001-0161-06
  // QFAI:EX-0001-0161-07
  it("routes sdd-contract by its step name and leaves the parent and a profile-less step unrouted", async () => {
    const entries = await routingEntries();
    const matching = entries.filter((candidate) => candidate.step === "sdd-contract");
    expect(matching).toHaveLength(1);
    const [entry = {}] = matching;
    expect(entry.review_profile).toBe("default");

    const step = frontMatterOf(await readShipped("step/sdd-contract/STEP.md"));
    expect(step["routing-profile"]).toBe("default");
    const roles = names(step.roles);
    const phases = Array.isArray(entry.phases) ? entry.phases.filter(isRecord) : [];
    for (const agent of new Set(phases.flatMap((phase) => names(phase.mandatory_agents)))) {
      expect(roles, agent).toContain(agent);
    }

    const gateRun = frontMatterOf(await readShipped("step/common-gate-run/STEP.md"));
    expect(gateRun["routing-profile"]).toBeUndefined();
    expect(entries.some((candidate) => candidate.step === "common-gate-run")).toBe(false);
    expect(entries.some((candidate) => candidate.skill === "qfai-sdd")).toBe(false);

    expect(await agentFindings()).toEqual([]);
  });

  // QFAI:EX-0001-0161-07
  it("reads the routing defaults as one list over files that each stay within the asset ceilings", async () => {
    const files = await readRoutingDefaultsFiles();
    const over = files.flatMap((file) => {
      const lines = countLines(file.text);
      const widest = widestMeasurableLine(file.text);
      return [
        ...(lines > assistantLineCeiling(file.rel) ? [`${file.rel}: ${lines} lines`] : []),
        ...(widest > ASSISTANT_ASSET_MAX_LINE_CHARS ? [`${file.rel}: ${widest} characters`] : []),
      ];
    });
    expect(over).toEqual([]);
    const names = files.map((file) => path.posix.basename(file.rel));
    expect(names).toEqual([...names].sort());

    const keys = (await routingEntries()).map((entry) => routingEntryName(entry));
    expect(keys.filter((key, index) => keys.indexOf(key) !== index)).toEqual([]);
    expect(keys).toContain("sdd-contract");
  });

  // QFAI:EX-0001-0161-08
  it("reports a step whose roles or routing-profile drift from its entry", async () => {
    const missingRole = await agentFindings((text) =>
      text.replace("roles: [solution-architect, ", "roles: ["),
    );
    expect(
      missingRole.filter(
        (finding) =>
          finding.code === "QFAI-AGENT-019" &&
          finding.message.includes("solution-architect") &&
          finding.file?.includes("sdd-contract") === true,
      ),
    ).not.toEqual([]);

    const wrongProfile = await agentFindings((text) =>
      text.replace("routing-profile: default", "routing-profile: architecture-heavy"),
    );
    expect(
      wrongProfile.filter(
        (finding) =>
          finding.code === "QFAI-AGENT-018" && finding.file?.includes("sdd-contract") === true,
      ),
    ).not.toEqual([]);
  });
});

describe("the migration skill's routing", () => {
  // QFAI:AC-0001-0161-04
  // QFAI:EX-0001-0161-04
  it("runs plan, execution and review under the architecture-heavy profile, with roles that match", async () => {
    const entry = (await routingEntries()).find(
      (candidate) => candidate.skill === "qfai-migration-v1-to-v2",
    );
    const phases = Array.isArray(entry?.phases) ? entry.phases.filter(isRecord) : [];
    expect(
      phases.map((phase) => ({
        id: phase.id,
        mandatory: names(phase.mandatory_agents),
        blocking: names(phase.blocking_agents),
      })),
    ).toEqual([
      {
        id: "plan",
        mandatory: ["requirements-analyst", "solution-architect"],
        blocking: ["solution-architect"],
      },
      { id: "execution", mandatory: ["devops-ci-engineer"], blocking: [] },
      { id: "review", mandatory: ["architecture-reviewer"], blocking: ["architecture-reviewer"] },
    ]);
    expect(entry?.review_profile).toBe("architecture-heavy");

    const profiles: unknown = parseYaml(await readDefault("review-profiles.yml"));
    const selected = isRecord(profiles) && isRecord(profiles.profiles) ? profiles.profiles : {};
    const heavy = isRecord(selected["architecture-heavy"]) ? selected["architecture-heavy"] : {};
    const reviewers = names(heavy.always_required);
    expect(reviewers).toEqual(["architecture-reviewer"]);

    const skill = frontMatterOf(await readShipped("skill/qfai-migration-v1-to-v2/SKILL.md"));
    expect(skill["routing-profile"]).toBe("architecture-heavy");
    const roles = names(skill.roles);
    for (const agent of [
      "requirements-analyst",
      "solution-architect",
      "devops-ci-engineer",
      "architecture-reviewer",
      ...reviewers,
    ]) {
      expect(roles, agent).toContain(agent);
    }

    const ownFindings = (findings: Issue[]): Issue[] =>
      findings.filter(
        (finding) =>
          /^QFAI-AGENT-01[5-9]$/.test(finding.code) &&
          finding.message.includes("qfai-migration-v1-to-v2"),
      );
    expect(ownFindings(await agentFindings())).toEqual([]);

    const unbound = ownFindings(
      await agentFindings(
        (text) => text.replace(/ +architecture-reviewer,\r?\n/, ""),
        MIGRATION_SKILL,
      ),
    );
    expect(unbound.map((finding) => finding.code)).toContain("QFAI-AGENT-019");
  });
});

describe("routing defaults come from the installed package", () => {
  // QFAI:AC-0001-0161-03
  // QFAI:EX-0001-0161-09
  it("stops and names the install command when the package is not installed", async () => {
    const rule = (await readShipped("rule/agent-selection.md")).replace(/\s+/g, " ");
    expect(rule).toContain(
      "If it is unavailable, stop and ask for a local install with `npm install -D qfai`.",
    );
    expect(rule).toContain(
      "Do not infer routing from a skill body or continue without the defaults.",
    );
    expect(rule).toContain("The project does not own copies of these default files.");
  });
});
