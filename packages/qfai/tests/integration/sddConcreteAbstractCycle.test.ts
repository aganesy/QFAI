/**
 * Integration: the concrete-abstract cycle as the shipped `/qfai-sdd` assembles it.
 *
 * Each criterion is met only when the documents an agent reads in turn agree: the skill places the
 * cycle's step, the step sends the agent to its reference, and the reference sends it on to the rules
 * that govern each step. These tests follow those links, resolving every citation they depend on,
 * and for the rows a validator reads they run the validator on the row the guidance prescribes.
 * The statements each example needs are asserted in `tests/assets/sddConcreteAbstractCycle.test.ts`.
 */
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildStoryTreeModel } from "../../src/core/storyTree/tree.js";
import { collectHeadingSlugs } from "../../src/core/validators/assistantAnchorReferences.js";
import { validateStoryTreeStructureModel } from "../../src/core/validators/storyTreeStructure.js";
import { flat, readShipped, rowOf, sectionOf, shippedExists } from "../helpers/shippedAssistant.js";
import { expectSentence } from "../helpers/shippedSentences.js";

const SKILL = "skill/qfai-sdd/SKILL.md";
const CYCLE = "skill/qfai-sdd/references/concrete-abstract-cycle.md";
const CYCLE_STEP = "step/sdd-cycle/STEP.md";
const STORY_STEP = "step/sdd-story/STEP.md";
const CONTRACT_STEP = "step/sdd-contract/STEP.md";
const CYCLE_CITATION = ".qfai/assistant/skill/qfai-sdd/references/concrete-abstract-cycle.md";
const TRIAGE = "skill/qfai-sdd/references/sdd-triage.md";
const DECISIONS_TEMPLATE = "skill/qfai-sdd/templates/spec/decisions.md";
const FINDER_CARD = "agent/test-design-analyst.md";

async function section(file: string, heading: string): Promise<string> {
  const text = sectionOf(await readShipped(file), heading);
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

/**
 * The shipped file a citation written in `from` names, relative to the assistant tree, and the
 * anchor it names. A `.qfai/assistant/` path, and one opening with `skill/`, `rule/` or `agent/` as
 * an agent card writes it, is read from the tree root. One opening with `references/` or
 * `templates/` is read from the skill directory, as the skill's own files write it, and any other
 * is read beside the citing file.
 */
function target(from: string, citation: string): { file: string; anchor: string } {
  const [raw = "", anchor = ""] = citation.split("#");
  if (raw.startsWith(".qfai/assistant/")) {
    return { file: raw.slice(".qfai/assistant/".length), anchor };
  }
  if (/^(skill|rule|agent)\//.test(raw)) return { file: raw, anchor };
  if (/^(references|templates)\//.test(raw)) {
    return { file: `${from.split("/").slice(0, 2).join("/")}/${raw}`, anchor };
  }
  return { file: path.posix.normalize(`${path.posix.dirname(from)}/${raw}`), anchor };
}

/** Asserts that `text`, a part of `from`, cites `citation` and that it resolves. */
async function expectResolvedCitation(from: string, text: string, citation: string): Promise<void> {
  expect(text, `${from} cites ${citation}`).toContain(`\`${citation}\``);
  const { file, anchor } = target(from, citation);
  expect(shippedExists(file), `${citation} from ${from} names ${file}`).toBe(true);
  if (anchor === "") return;
  const slugs = collectHeadingSlugs(await readShipped(file));
  expect(slugs.has(anchor), `${file} has #${anchor}`).toBe(true);
}

/** The header cells of the first table of `text` whose header holds `token`. */
function headerCells(text: string, token: string): string[] {
  return rowOf(text, token)
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => cell !== "");
}

const SPECS = ".qfai/spec";
const STORY = `${SPECS}/02_business-flow/business-flow-0001/user-story-0001-0001`;

/** A one-flow story tree, with the given register text in place of an empty one. */
function storyTree(registers: { decisions?: string; openQuestions?: string }) {
  const empty = "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |";
  const files = new Map<string, string>([
    [
      `${SPECS}/02_business-flow/business-flows.md`,
      "| BF-ID | Flow | Path |\n| --- | --- | --- |\n| BF-0001 | Order | `business-flow-0001/` |",
    ],
    [
      `${SPECS}/02_business-flow/business-flow-0001/business-flow.md`,
      "# BF-0001: Order\n\n```mermaid\nflowchart LR\nA --> B\n```\n",
    ],
    [
      `${SPECS}/02_business-flow/business-flow-0001/user-stories.md`,
      "| US-ID | Story | Path |\n| --- | --- | --- |\n| US-0001-0001 | Order | `user-story-0001-0001/` |",
    ],
    [`${STORY}/01_User-story.md`, "# US-0001-0001: Order"],
    [
      `${STORY}/02_Acceptance-Criteria.md`,
      "```gherkin\n# AC-0001-0001-01\nScenario: approval\n```",
    ],
    [
      `${STORY}/03_Example.md`,
      "| EX-ID | AC-Ref | Example |\n| --- | --- | --- |\n| EX-0001-0001-01 | AC-0001-0001-01 | 20 000 needs approval |",
    ],
    [
      `${SPECS}/03_contract/api/orders.yaml`,
      "# QFAI-CONTRACT-ID: API-0001\nx-qfai-rules:\n  - id: BR-0001-0001\n    statement: An order above 10 000 needs approval\n    examples: [EX-0001-0001-01]",
    ],
    [`${SPECS}/decisions.md`, registers.decisions ?? empty],
    [`${SPECS}/open-questions.md`, registers.openQuestions ?? empty],
  ]);
  return buildStoryTreeModel(files, { specsDir: SPECS, contractsDir: `${SPECS}/03_contract` });
}

describe("the concrete-abstract cycle across the shipped qfai-sdd", () => {
  // QFAI:AC-0001-0147-08
  it("sits between the contracts and the gate, and sends a sub-agent that wrote no rule to find", async () => {
    const steps = /^steps: \[(.*)\]$/m.exec(await readShipped(SKILL))?.[1] ?? "";
    const contracts = steps.indexOf("sdd-contract");
    const cycle = steps.indexOf("sdd-cycle");
    const gate = steps.indexOf("sdd-gate");
    expect(contracts).toBeGreaterThanOrEqual(0);
    expect(cycle).toBeGreaterThan(contracts);
    expect(gate).toBeGreaterThan(cycle);
    const placement = await readShipped(CYCLE_STEP);
    expectSentence(placement, "placement", /Between `sdd-contract` and `sdd-gate`/);
    await expectResolvedCitation(CYCLE_STEP, placement, CYCLE_CITATION);

    const card = await readShipped(FINDER_CARD);
    await expectResolvedCitation(
      FINDER_CARD,
      card,
      "skill/qfai-sdd/references/concrete-abstract-cycle.md",
    );
    expectSentence(
      card,
      "the finder's duty",
      /concrete-abstract cycle/i,
      /wrote none|wrote no BR/i,
    );

    const reference = await section(CYCLE, "## When a cycle runs");
    expectSentence(reference, "the trigger", /Statement or the Examples cell of at least one BR/i);
    expectSentence(reference, "no cycle under seeding", /stage is an append stage/i);
    const seeding = await section(STORY_STEP, "## A diagnosed missing test");
    expectSentence(seeding, "no cycle under seeding", /No concrete-abstract cycle runs/i);
  });

  // QFAI:AC-0001-0147-09
  it("has the session decide each finding, sending a critical one to the user", async () => {
    const text = await section(CYCLE, "## Deciding a finding");
    expectSentence(text, "the session decides", /decides each finding that is not critical/i);
    expectSentence(text, "critical goes to the user", /goes to the user/i, /no agent decides it/i);
    expectSentence(text, "unimplied examples are dropped", /session drops one that is not/i);
    const step = flat(await readShipped(CYCLE_STEP));
    expect(step).toMatch(/session agent decides each finding that is not critical/i);
  });

  // QFAI:AC-0001-0147-10
  it("changes an existing item only by the drift protocol's approval and the user's answer", async () => {
    const text = await section(CYCLE, "## Applying an adopted finding");
    await expectResolvedCitation(
      CYCLE,
      text,
      ".qfai/assistant/rule/drift-protocol.md#when-drift-is-detected",
    );
    await expectResolvedCitation(
      CYCLE,
      text,
      ".qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#a-change-to-the-story-tree",
    );
    const triage = flat(await readShipped(TRIAGE));
    for (const operation of ["SPLIT", "MERGE", "UPDATE:REMOVE"]) {
      expect(triage, `${TRIAGE} makes ${operation} approval-required`).toMatch(
        new RegExp(`Use the shared user-question protocol for [^.]*${operation}`),
      );
    }
    expectSentence(text, "a split or merge", /splitting, merging/i, /Put to the user/i);
    const contractMode = flat(await section(CONTRACT_STEP, "## A named contract"));
    expect(contractMode).toMatch(/ask for a\s+wider change request when only the story can move/i);
    expectSentence(text, "the same route here", /`--contract`/, /wider change request/i);
  });

  // QFAI:AC-0001-0147-12
  it("opens an Unadjudicated row the gate holds until the finding is decided", async () => {
    const text = await section(CYCLE, "## Two cycles at most");
    expectSentence(text, "no third cycle", /No third cycle runs/i);
    expectSentence(
      text,
      "the row",
      /`open-questions\.md` row at TODO whose Content opens `Unadjudicated:`/i,
    );
    const register = (status: string): string =>
      `| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| OQ-0001 | Unadjudicated: is an unapproved order above 10 000 refused or queued? BR-0001-0001 | Ask the user | ${status} |`;
    const open = validateStoryTreeStructureModel(storyTree({ openQuestions: register("TODO") }));
    expect(open.filter((issue) => issue.code === "QFAI-SPACK-102")).toHaveLength(1);
    const decided = validateStoryTreeStructureModel(storyTree({ openQuestions: register("DONE") }));
    expect(decided.some((issue) => issue.code === "QFAI-SPACK-102")).toBe(false);
  });

  // QFAI:AC-0001-0147-13
  it("raises no decided finding again, and reads a REJECTED row the register accepts as decided", async () => {
    const text = await section(CYCLE, "## A decided finding is not raised again");
    expectSentence(text, "decided findings", /does not raise a finding again/i);
    expectSentence(text, "wording", /Matching never goes by wording/i);
    expectSentence(text, "reopening", /reopen a REJECTED row lifts it/i);
    const template = await readShipped(DECISIONS_TEMPLATE);
    expect(headerCells(template, "Content")).toEqual(["ID", "Content", "Approach", "Status"]);
    const register = (status: string): string =>
      `| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| DEC-0001 | Change request: user-story-0001-0001/03_Example.md; an order of 20 000 in euros | Declined by the user | ${status} |`;
    const decisionsIssues = (status: string) =>
      validateStoryTreeStructureModel(storyTree({ decisions: register(status) })).filter(
        (issue) => issue.file?.endsWith("decisions.md") ?? false,
      );
    expect(decisionsIssues("REJECTED")).toEqual([]);
    expect(decisionsIssues("CLOSED")).not.toEqual([]);
  });
});
