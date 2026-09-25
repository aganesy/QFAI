/**
 * Integration: the two entry skills a workflow run adds, `qfai-run` and `qfai-maintain`, and their
 * routing entries in the package defaults.
 *
 * Reads the shipped skill files and `assets/defaults/`, and runs the role and routing validators over
 * them. What the workflow core does with a proposal is not this module's.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { defaultConfig } from "../../../src/core/config.js";
import {
  ASSISTANT_ASSET_MAX_LINES,
  ASSISTANT_ASSET_MAX_LINE_CHARS,
} from "../../../src/core/doctor/assetLineBudget.js";
import { validateAgentDefinition } from "../../../src/core/validators/agentDefinition.js";
import {
  PACKAGE_DEFAULTS,
  SHIPPED_ASSISTANT,
  flat,
  readDefault,
  readShipped,
  rowOf,
  sectionOf,
} from "../../helpers/shippedAssistant.js";

const RUN = "skill/qfai-run/SKILL.md";
const PAYLOADS = "skill/qfai-run/references/payloads.md";
const SCREENS = "skill/qfai-run/references/operator-screens.md";
const MAINTAIN = "skill/qfai-maintain/SKILL.md";
const MAINTAIN_RUN = "skill/qfai-maintain/references/orchestrated-mode.md";

const SIX_PROFILES = [
  "architecture-heavy",
  "default",
  "implementation-heavy",
  "requirements-heavy",
  "runtime-heavy",
  "ui-bearing",
];

const AGENT_FIELDS = ["mandatory_agents", "conditional_agents", "blocking_agents"] as const;

type Phase = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function phaseAgents(phase: Phase): string[] {
  const grouped = Array.isArray(phase.parallel_groups)
    ? phase.parallel_groups.flatMap(strings)
    : [];
  return [...AGENT_FIELDS.flatMap((field) => strings(phase[field])), ...grouped];
}

async function routingEntry(skill: string): Promise<Record<string, unknown> | undefined> {
  const manifest: unknown = parse(await readDefault("agent-routing.yml"));
  const routing = isRecord(manifest) && Array.isArray(manifest.routing) ? manifest.routing : [];
  return routing.filter(isRecord).find((entry) => entry.skill === skill);
}

async function profiles(): Promise<Record<string, unknown>> {
  const file: unknown = parse(await readDefault("review-profiles.yml"));
  return isRecord(file) && isRecord(file.profiles) ? file.profiles : {};
}

function phasesOf(entry: Record<string, unknown> | undefined): Phase[] {
  return entry && Array.isArray(entry.phases) ? entry.phases.filter(isRecord) : [];
}

async function filesUnder(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));
}

describe("qfai-run", () => {
  // QFAI:EX-0001-0201-13
  it("keeps its SKILL.md within 150 lines", async () => {
    const lines = (await readShipped(RUN)).replace(/\n$/, "").split("\n");
    expect(lines.length).toBeLessThanOrEqual(150);
  });

  // QFAI:EX-0001-0197-01
  it("starts a run only for a change, and serves every other request kind another way", async () => {
    const text = flat(sectionOf(await readShipped(RUN), "## Request kinds"));
    expect(text).toMatch(/only `change` calls `start`/i);
    expect(text).toMatch(/`resume`, or `continue` on a run in progress: call `resume`/i);
    expect(text).toMatch(/`cancel`: call `decision` with `stop`/i);
    expect(text).toMatch(
      /`explicit_stage`, `plan_only`, `verify_only`: invoke the stage skill by name/i,
    );
    expect(text).toMatch(/`read_only`: answer it in the conversation/i);
  });

  // QFAI:EX-0001-0199-02
  it("writes nothing under shadow and starts no run under off", async () => {
    const mode = sectionOf(await readShipped(RUN), "## Mode");
    expect(flat(mode)).toMatch(/read the mode from `npx qfai workflow status` first/i);
    expect(rowOf(mode, "`shadow`")).toMatch(
      /call no write operation, and say that nothing was written/i,
    );
    expect(rowOf(mode, "`off`")).toMatch(
      /start no run\. the operator invokes the stage skills by name/i,
    );
  });

  // QFAI:EX-0001-0192-40
  it("names the narrowest write areas per stage kind, and never a stage's own records", async () => {
    const text = sectionOf(await readShipped(PAYLOADS), "## Routing result");
    expect(rowOf(text, "`sdd_delta`")).toMatch(
      /the story and contract files of the bound flow it changes/i,
    );
    expect(rowOf(text, "| `sdd` ")).toMatch(/the new story's directory, or the new flow's/i);
    expect(rowOf(text, "`discussion`")).toMatch(
      /its tracked records, and `DESIGN\.md` for a UI-bearing target/i,
    );
    expect(rowOf(text, "`prototype`")).toMatch(/`<paths\.contractsDir>\/design\/\*\*`/);
    const flatText = flat(text);
    expect(flatText).toMatch(
      /never names `\.git\/`, `\.qfai\/run\/`, `\.qfai\/evidence\/workflow\/`, `\.qfai\/evidence\/decision\/`/,
    );
    expect(flatText).toMatch(/`decisions\.md` or `open-questions\.md` under `paths\.specsDir`/);
  });

  it("proposes flows and new stories, never spec packs", async () => {
    const text = flat(await readShipped(PAYLOADS));
    expect(text).toMatch(/"affectedFlowIds": \["BF-0002"\]/);
    expect(text).toMatch(/"newStories": \[\]/);
    expect(text).toMatch(/`newStories` holds `\{ goal, covers, excludes, evidence, flowId \}`/);
    expect(text).not.toMatch(/affectedSpecIds|newCapabilities|spec-id|\.qfai\/runs\//);
  });

  // QFAI:EX-0001-0196-15
  it("offers recovery as a reverse diff of the run's own paths only", async () => {
    const text = flat(sectionOf(await readShipped(SCREENS), "## Halt notice"));
    expect(text).toMatch(/recovery is a reverse diff limited to the paths the run wrote/i);
    expect(text).toMatch(/never offer a reset, a stash, a branch switch or a worktree removal/i);
  });
});

describe("qfai-maintain", () => {
  // QFAI:EX-0001-0198-02
  it("edits only non-normative text in the write scope and returns the four receipts", async () => {
    const skill = await readShipped(MAINTAIN);
    expect(flat(sectionOf(skill, "## What this is for"))).toMatch(
      /alters what a reader reads and nothing a program or an agent does/i,
    );
    expect(flat(sectionOf(skill, "## The edit"))).toMatch(/edit nothing outside it/i);
    const returns = flat(sectionOf(skill, "## What the stage returns"));
    for (const receipt of [
      /the diff/i,
      /the no-behaviour-change judgement/i,
      /the independent review's verdict/i,
      /the lint and link checks run/i,
    ]) {
      expect(returns).toMatch(receipt);
    }
  });

  // QFAI:EX-0001-0198-04
  it("stops before an edit with a semantic effect and returns the run for reclassification", async () => {
    const skill = await readShipped(MAINTAIN);
    const edit = flat(sectionOf(skill, "## The edit"));
    expect(edit).toMatch(/judge whether each planned edit has a semantic effect/i);
    expect(edit).toMatch(/stop before editing as \[A semantic effect\]/i);
    expect(edit).toMatch(/do not make the edit/i);
    const effect = flat(sectionOf(skill, "## A semantic effect"));
    expect(effect).toMatch(/is not a maintenance edit\. nothing is edited/i);
    expect(effect).toMatch(/`references\/orchestrated-mode\.md#a-semantic-effect`/);
    expect(effect).toMatch(
      /invoked by name: stop, and report that the change is not a maintenance edit/i,
    );
    const inRun = flat(sectionOf(await readShipped(MAINTAIN_RUN), "## A semantic effect"));
    expect(inRun).toMatch(/the outcome is `needs_repair`, and `changedFiles` is empty/i);
    expect(inRun).toMatch(
      /`debts` holds the finding\. its `resolvingOwner` is the skill that owns that kind of change, never one the `direct` plan names/i,
    );
  });
});

describe("the entry skills' routing entries", () => {
  // QFAI:EX-0001-0167-08
  // QFAI:EX-0001-0192-16
  it("routes qfai-run to the orchestrator only, and qfai-maintain to an author and an independent reviewer", async () => {
    const run = await routingEntry("qfai-run");
    expect(run, "agent-routing.yml has a qfai-run entry").toBeDefined();
    const runPhases = phasesOf(run);
    expect(runPhases.length, "qfai-run has a phase").toBeGreaterThan(0);
    expect([...new Set(runPhases.flatMap(phaseAgents))]).toEqual(["orchestrator"]);
    expect(run?.review_profile, "qfai-run names no review profile").toBeUndefined();

    const maintain = await routingEntry("qfai-maintain");
    expect(maintain?.review_profile).toBe("default");
    const maintainPhases = phasesOf(maintain);
    const authors = maintainPhases
      .filter((phase) => !strings(phase.mandatory_agents).includes("completion-reviewer"))
      .flatMap(phaseAgents);
    expect(authors.length, "qfai-maintain has an authoring phase").toBeGreaterThan(0);
    const reviewing = maintainPhases.filter((phase) =>
      strings(phase.blocking_agents).includes("completion-reviewer"),
    );
    expect(reviewing.length, "qfai-maintain has a blocking reviewer phase").toBeGreaterThan(0);
    expect(authors, "the reviewer is not an author").not.toContain("completion-reviewer");

    expect(Object.keys(await profiles()).sort()).toEqual(SIX_PROFILES);

    const shippedRoot = path.dirname(path.dirname(SHIPPED_ASSISTANT));
    expect(await validateAgentDefinition(shippedRoot, defaultConfig)).toEqual([]);
  });
});

describe("shipped text the workflow adds", () => {
  it("keeps every entry-skill file and plan within the line and width ceilings", async () => {
    const files = [
      ...(await filesUnder(path.join(SHIPPED_ASSISTANT, "skill", "qfai-run"))),
      ...(await filesUnder(path.join(SHIPPED_ASSISTANT, "skill", "qfai-maintain"))),
      ...(await filesUnder(path.join(PACKAGE_DEFAULTS, "workflows"))),
    ];
    expect(files.length).toBeGreaterThanOrEqual(9);
    for (const file of files) {
      const rel = path.relative(path.dirname(PACKAGE_DEFAULTS), file);
      const lines = (await readFile(file, "utf-8")).split("\n");
      expect(lines.length, rel).toBeLessThanOrEqual(ASSISTANT_ASSET_MAX_LINES);
      const widest = Math.max(...lines.map((line) => line.length));
      expect(widest, rel).toBeLessThanOrEqual(ASSISTANT_ASSET_MAX_LINE_CHARS);
    }
  });

  // QFAI:EX-0001-0201-16
  it("names the command as npx qfai workflow wherever the shipped tree mentions it", async () => {
    const files = [
      ...(await filesUnder(SHIPPED_ASSISTANT)),
      ...(await filesUnder(PACKAGE_DEFAULTS)),
    ].filter((file) => /\.(md|ya?ml)$/.test(file));
    const bare: string[] = [];
    for (const file of files) {
      const text = await readFile(file, "utf-8");
      if (/(?<!npx )qfai workflow/.test(text)) {
        bare.push(path.relative(path.dirname(PACKAGE_DEFAULTS), file));
      }
    }
    expect(bare).toEqual([]);
  });
});
