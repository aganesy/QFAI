/**
 * Integration: the package routing defaults are keyed by step, and the agent checks hold a
 * shipped step's `roles:` and `routing-profile:` against its entry as they hold a skill's.
 */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { loadConfig, routingEntryName } from "../../src/core/config.js";
import {
  ASSISTANT_ASSET_MAX_LINE_CHARS,
  ASSISTANT_ASSET_MAX_LINES,
  countLines,
  widestMeasurableLine,
} from "../../src/core/doctor/assetLineBudget.js";
import { readRoutingDefaultsFiles } from "../../src/core/routingDefaults.js";
import type { Issue } from "../../src/core/types.js";
import { validateAgentDefinition } from "../../src/core/validators/agentDefinition.js";
import { defaultRoutingEntries, frontMatterOf, readShipped } from "../helpers/shippedAssistant.js";
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

const routingEntries = defaultRoutingEntries;

/** Agent-check findings on a fresh install, after `edit` rewrites its `sdd-contract` step. */
async function agentFindings(edit?: (text: string) => string): Promise<Issue[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-step-routing-"));
  try {
    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
    if (edit) {
      const file = path.join(root, SDD_CONTRACT);
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
  // QFAI:AC-0001-0167-06
  // QFAI:EX-0001-0167-09
  it("routes sdd-contract by its step name and leaves the parent and a profile-less step unrouted", async () => {
    const entries = await routingEntries();
    const matching = entries.filter((candidate) => candidate.step === "sdd-contract");
    expect(matching).toHaveLength(1);
    const [entry = {}] = matching;
    expect(entry.review_profile).toBe("architecture-heavy");

    const step = frontMatterOf(await readShipped("step/sdd-contract/STEP.md"));
    expect(step["routing-profile"]).toBe("architecture-heavy");
    const roles = names(step.roles);
    const phases = Array.isArray(entry.phases) ? entry.phases.filter(isRecord) : [];
    const bound = phases.flatMap((phase) => [
      ...names(phase.mandatory_agents),
      ...names(phase.blocking_agents),
    ]);
    for (const agent of new Set([...bound, "completion-reviewer", "architecture-reviewer"])) {
      expect(roles, agent).toContain(agent);
    }

    const evidenceRecord = frontMatterOf(await readShipped("step/common-evidence-record/STEP.md"));
    expect(evidenceRecord["routing-profile"]).toBeUndefined();
    expect(entries.some((candidate) => candidate.step === "common-evidence-record")).toBe(false);
    expect(entries.some((candidate) => candidate.skill === "qfai-sdd")).toBe(false);

    expect(await agentFindings()).toEqual([]);
  });

  // QFAI:EX-0001-0167-09
  it("reads the routing defaults as one list over files that each stay within the asset ceilings", async () => {
    const files = await readRoutingDefaultsFiles();
    const over = files.flatMap((file) => {
      const lines = countLines(file.text);
      const widest = widestMeasurableLine(file.text);
      return [
        ...(lines > ASSISTANT_ASSET_MAX_LINES ? [`${file.rel}: ${lines} lines`] : []),
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

  // QFAI:EX-0001-0167-10
  it("reports a step whose roles or routing-profile drift from its entry", async () => {
    const missingRole = await agentFindings((text) =>
      text.replace(/^\s*architecture-reviewer,?\s*$/m, ""),
    );
    expect(
      missingRole.filter(
        (finding) =>
          finding.code === "QFAI-AGENT-019" &&
          finding.message.includes("architecture-reviewer") &&
          finding.file?.includes("sdd-contract") === true,
      ),
    ).not.toEqual([]);

    const wrongProfile = await agentFindings((text) =>
      text.replace("routing-profile: architecture-heavy", "routing-profile: default"),
    );
    expect(
      wrongProfile.filter(
        (finding) =>
          finding.code === "QFAI-AGENT-018" && finding.file?.includes("sdd-contract") === true,
      ),
    ).not.toEqual([]);
  });
});

describe("routing defaults come from the installed package", () => {
  // QFAI:AC-0001-0167-03
  // QFAI:EX-0001-0167-11
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
