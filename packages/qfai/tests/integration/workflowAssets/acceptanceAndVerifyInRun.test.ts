/**
 * Integration: which steps `/qfai-verify` runs when a route plans it.
 *
 * Reads the shipped operating baseline that states the skill's behaviour inside a route.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseAgentFrontmatter } from "../../../src/core/agentFrontmatter.js";
import { defaultConfig } from "../../../src/core/config.js";
import { readEffectiveRouting, stepReview } from "../../../src/core/validators/agentDefinition.js";
import {
  SHIPPED_ASSISTANT,
  flat,
  readShipped,
  rowOf,
  sectionOf,
  shippedExists,
} from "../../helpers/shippedAssistant.js";

const OPERATING = "rule/shared-skill-operating-baseline.md";
const VERIFY_SKILL = "skill/qfai-verify/SKILL.md";
const VERIFY_CONTEXT = "step/verify-context/STEP.md";
const AGENT_SELECTION = "rule/agent-selection.md";

/** Every file `/qfai-verify` reads as text: its skill directory and its steps. */
async function verifyAssets(): Promise<string[]> {
  const skillDir = path.join(SHIPPED_ASSISTANT, "skill", "qfai-verify");
  const skillFiles = (await readdir(skillDir, { recursive: true })).filter((name) =>
    /\.(md|ya?ml)$/i.test(name),
  );
  const steps = (await readdir(path.join(SHIPPED_ASSISTANT, "step"))).filter((name) =>
    name.startsWith("verify-"),
  );
  return [
    ...skillFiles.map((name) => path.join(skillDir, name)),
    ...steps.map((name) => path.join(SHIPPED_ASSISTANT, "step", name, "STEP.md")),
  ];
}

async function section(file: string, heading: string): Promise<string> {
  const text = flat(sectionOf(await readShipped(file), heading));
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

describe("qfai-verify in a workflow run", () => {
  // QFAI:AC-0001-0208-06
  // QFAI:EX-0001-0208-07
  it("runs only the work order's gates and hands over a request with no work order", async () => {
    const entry = sectionOf(await readShipped(OPERATING), "## Workflow Run Entry Check");
    expect(rowOf(entry, "| `pass-on`")).toMatch(/Edit nothing\. Pass the request to `qfai-run`/);
    expect(rowOf(entry, "| `step`")).toMatch(/Do only that step.s work/);
    const steps = await section(OPERATING, "### A plan's steps");
    expect(steps).toMatch(
      /runs the steps of the plan `npx qfai workflow plan` returned, stage by stage, and no other/i,
    );
  });
});

describe("qfai-verify loads its inputs from the shipped assistant tree", () => {
  // QFAI:AC-0001-0158-03
  // QFAI:EX-0001-0158-03
  it("reads the rows of decisions.md, cites the ones it relied on and treats a REJECTED row as a rejected option", async () => {
    const reads = await section(VERIFY_CONTEXT, "## Reads");
    expect(reads).toContain(
      '`.qfai/spec/decisions.md`. When no decision applies, say "not applicable".',
    );
    const completion = await section(VERIFY_SKILL, "## Completion");
    expect(completion).toContain('the decision IDs referenced, or "none" when no decision applies');
    expect(completion).toContain("confirmation that no rejected option was reintroduced");
    expect(flat(await readShipped(VERIFY_SKILL))).toContain(
      "Every step follows `.qfai/assistant/rule/shared-skill-operating-baseline.md`",
    );
    const guard = await section(OPERATING, "## Rejected Option Guard");
    expect(guard).toContain(
      "Do not reintroduce an option whose row in `<paths.specsDir>/decisions.md` has Status `REJECTED`.",
    );
    expect(guard).toContain("append a new `DEC-NNNN` row");
    for (const file of await verifyAssets()) {
      expect(await readFile(file, "utf-8"), file).not.toMatch(/0[78]_Decisions/);
    }
  });

  // QFAI:AC-0001-0159-03
  // QFAI:EX-0001-0159-03
  it("loads the constitution from the rule directory and cites no constitution directory", async () => {
    const files = await verifyAssets();
    for (const file of files) {
      expect(await readFile(file, "utf-8"), file).not.toContain(".qfai/assistant/constitution/");
    }
    const contextLoad = path.join(
      SHIPPED_ASSISTANT,
      "skill",
      "qfai-verify",
      "references",
      "context-load.md",
    );
    expect(await readFile(contextLoad, "utf-8")).toContain(".qfai/assistant/rule/constitution.md");
    expect(shippedExists("rule/constitution.md")).toBe(true);
    expect(shippedExists("constitution")).toBe(false);
  });

  // QFAI:AC-0001-0159-03
  // QFAI:EX-0001-0159-04
  it("takes routing and review profiles from the package defaults with the overrides applied, and an agent's entry from its card", async () => {
    expect(await section(VERIFY_CONTEXT, "## Delegation")).toContain(
      "Use `.qfai/assistant/rule/agent-selection.md` as the routing SSOT.",
    );
    const selection = flat(await readShipped(AGENT_SELECTION));
    expect(selection).toContain(
      "A `qfai.config.yaml` `routing:` or `reviewProfiles:` entry replaces the matching default entry as a whole; a new key adds an entry.",
    );
    expect(selection).toContain("Do not keep another copy of its definition in a routing file.");

    const defaults = await readEffectiveRouting(defaultConfig);
    const overridden = await readEffectiveRouting({
      routing: [
        {
          step: "verify-context",
          phases: [{ id: "plan", mandatory_agents: ["qa-strategist"] }],
        },
      ],
    });
    expect(stepReview(defaults, "verify-context").requiredAgents).toEqual([
      "delivery-planner",
      "qa-strategist",
    ]);
    expect(stepReview(overridden, "verify-context").requiredAgents).toEqual(["qa-strategist"]);
    const names = [...(defaults.routing?.keys() ?? [])];
    expect(names.length).toBeGreaterThan(1);
    for (const name of names.filter((entry) => entry !== "verify-context")) {
      expect(stepReview(overridden, name), name).toEqual(stepReview(defaults, name));
    }
    expect([...(overridden.profiles?.keys() ?? [])]).toEqual([
      ...(defaults.profiles?.keys() ?? []),
    ]);

    const card = parseAgentFrontmatter(
      await readFile(path.join(SHIPPED_ASSISTANT, "agent", "qa-strategist.md"), "utf-8"),
    );
    if (!card.ok) throw new Error(card.error);
    expect(["worker", "reviewer"]).toContain(card.frontmatter.kind);
    expect(card.frontmatter.owned_artifacts.length).toBeGreaterThan(0);
    expect(card.frontmatter.tool_profile).not.toBe("");
    expect(card.frontmatter.permission_profile).not.toBe("");
    expect(card.frontmatter.specialization_tags.length).toBeGreaterThan(0);
    const assistantFiles = await readdir(SHIPPED_ASSISTANT, { recursive: true });
    expect(assistantFiles.filter((name) => path.basename(name) === "agent-catalog.yml")).toEqual(
      [],
    );
  });
});
