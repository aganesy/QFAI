/**
 * Integration: the concrete-abstract cycle as the shipped `/qfai-sdd` assembles it.
 *
 * Each criterion is met only when the documents an agent reads in turn agree: the skill places the
 * cycle and sends the agent to its reference, the reference sends it on to the rules that govern
 * each step, the evidence template holds the record the reference asks for, and the reviewer's
 * gate reads that record. These tests follow those links, resolving every citation they depend on,
 * and for the one row a validator reads they run the validator on the row the guidance prescribes.
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
const ORCHESTRATED = "skill/qfai-sdd/references/orchestrated-mode.md";
const GATE = "skill/qfai-sdd/references/sdd-quality-gate.md";
const TRIAGE = "skill/qfai-sdd/references/sdd-triage.md";
const EVIDENCE = "skill/qfai-sdd/templates/evidence/sdd-flow.md";
const DECISIONS_TEMPLATE = "skill/qfai-sdd/templates/spec/decisions.md";
const FINDER_CARD = "agent/test-design-analyst.md";

async function section(file: string, heading: string): Promise<string> {
  const text = sectionOf(await readShipped(file), heading);
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

/**
 * The shipped file a citation written in `from` names, relative to the assistant tree, and the
 * anchor it names. An absolute `.qfai/assistant/` path is read from the tree root; a bare path is
 * read beside the citing file, or from the skill directory when it opens with `references/` or
 * `templates/`, as the skill's own files write it.
 */
function target(from: string, citation: string): { file: string; anchor: string } {
  const [raw = "", anchor = ""] = citation.split("#");
  const skillDir = from.split("/").slice(0, 2).join("/");
  const file = raw.startsWith(".qfai/assistant/")
    ? raw.slice(".qfai/assistant/".length)
    : /^(references|templates)\//.test(raw)
      ? `${skillDir}/${raw}`
      : path.posix.normalize(`${path.posix.dirname(from)}/${raw}`);
  return { file, anchor };
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
      "x-qfai-rules:\n  - id: BR-0001\n    statement: An order above 10 000 needs approval\n    examples: [EX-0001-0001-01]",
    ],
    [`${SPECS}/decisions.md`, registers.decisions ?? empty],
    [`${SPECS}/open-questions.md`, registers.openQuestions ?? empty],
  ]);
  return buildStoryTreeModel(files, { specsDir: SPECS, contractsDir: `${SPECS}/03_contract` });
}

describe("the concrete-abstract cycle across the shipped qfai-sdd", () => {
  // QFAI:AC-0001-0152-08
  it("sits between the contracts and the gate, and sends an independent test-design-analyst to find", async () => {
    const skill = await readShipped(SKILL);
    const stage4 = skill.indexOf("## Stage 4");
    const cycle = skill.indexOf("## Concrete-abstract cycle");
    const gate = skill.indexOf("## Review, gate, and evidence");
    expect(stage4).toBeGreaterThanOrEqual(0);
    expect(cycle).toBeGreaterThan(stage4);
    expect(gate).toBeGreaterThan(cycle);
    const placement = await section(SKILL, "## Concrete-abstract cycle");
    expectSentence(placement, "placement", /Between Stage 4 and the gate/i);
    await expectResolvedCitation(SKILL, placement, "references/concrete-abstract-cycle.md");

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
    const seeding = await section(
      "skill/qfai-sdd/references/sdd-phase-checklists.md",
      "### Defect example seeding",
    );
    expectSentence(
      seeding,
      "no cycle under seeding",
      /No concrete-abstract cycle runs/i,
      /no cycle row/i,
    );
  });

  // QFAI:AC-0001-0152-09
  it("hands each finding to one independent griller under the agent-to-agent grilling rule", async () => {
    const text = await section(CYCLE, "## Adjudication");
    await expectResolvedCitation(
      CYCLE,
      text,
      ".qfai/assistant/rule/review-convergence.md#agent-to-agent-grilling-must",
    );
    const rule = flat(await section("rule/review-convergence.md", "## Agent-to-agent grilling"));
    expect(rule).toMatch(/two rounds/i);
    expectSentence(text, "independence", /neither the finder nor an author/i);
    expectSentence(text, "critical goes to the user", /goes to the user/i, /no agent decides it/i);
  });

  // QFAI:AC-0001-0152-10
  it("changes an existing item only by the drift protocol's approval and the triage operations", async () => {
    const text = await section(CYCLE, "## Applying an adopted finding");
    await expectResolvedCitation(
      CYCLE,
      text,
      ".qfai/assistant/rule/drift-protocol.md#when-drift-is-detected",
    );
    const triage = flat(await readShipped(TRIAGE));
    for (const operation of ["SPLIT", "MERGE", "UPDATE:REMOVE"]) {
      expect(triage, `${TRIAGE} makes ${operation} approval-required`).toMatch(
        new RegExp(`Use the shared user-question protocol for [^.]*${operation}`),
      );
    }
    expectSentence(text, "a removal", /UPDATE:REMOVE/, /TODO/);
    expectSentence(text, "a split or merge", /splitting, merging/i, /triage approval/i);
    const contractMode = flat(await section(SKILL, "## Stage 4"));
    expect(contractMode).toMatch(/ask for a\s+wider change request when only the story can move/i);
    expectSentence(text, "the same route here", /`--contract`/, /wider change request/i);
  });

  // QFAI:AC-0001-0152-11
  it("runs inside a workflow run before the one change question, as the orchestrated mode and the reference both say", async () => {
    const note = await section(ORCHESTRATED, "## The concrete-abstract cycle in a run");
    await expectResolvedCitation(ORCHESTRATED, note, "references/concrete-abstract-cycle.md");
    expectSentence(note, "first attempt only", /first attempt only/i);
    const change = await section(ORCHESTRATED, "## A change to the story tree");
    expectSentence(change, "the one question", /first attempt asks once and changes nothing/i);
    const reference = await section(CYCLE, "## Inside a workflow run");
    expectSentence(reference, "before the question", /before it asks the one change question/i);
    expectSentence(reference, "no further cycle", /runs no further cycle/i);
    expectSentence(reference, "drift outside scope", /returns `blocked`/);
  });

  // QFAI:AC-0001-0152-12
  it("opens an Unadjudicated row the gate holds until the finding is decided", async () => {
    const text = await section(CYCLE, "## Two cycles at most");
    expectSentence(text, "no third cycle", /No third cycle runs/i);
    const row = expectSentence(
      text,
      "the row",
      /`open-questions\.md` row at TODO whose Content opens `Unadjudicated:`/i,
    );
    expect(row).not.toBe("");
    const register = (status: string): string =>
      `| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| OQ-0001 | Unadjudicated: is an unapproved order above 10 000 refused or queued? BR-0001 | Ask the user | ${status} |`;
    const open = validateStoryTreeStructureModel(storyTree({ openQuestions: register("TODO") }));
    expect(open.filter((issue) => issue.code === "QFAI-SPACK-102")).toHaveLength(1);
    const decided = validateStoryTreeStructureModel(storyTree({ openQuestions: register("DONE") }));
    expect(decided.some((issue) => issue.code === "QFAI-SPACK-102")).toBe(false);
  });

  // QFAI:AC-0001-0152-13
  it("records a rejected finding as a decisions row the register accepts", async () => {
    const text = await section(CYCLE, "## Rejected findings");
    expectSentence(text, "the row", /one `decisions\.md` row at REJECTED/i);
    const template = await readShipped(DECISIONS_TEMPLATE);
    expect(headerCells(template, "Content")).toEqual(["ID", "Content", "Approach", "Status"]);
    const decisions =
      "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| DEC-0001 | A case the rule implies that no example states: BR-0001, EX-0001-0001-01, an order of 20 000 in euros | Rejected: nothing names a currency | REJECTED |";
    const issues = validateStoryTreeStructureModel(storyTree({ decisions }));
    expect(issues.filter((issue) => issue.file?.endsWith("decisions.md") ?? false)).toEqual([]);
  });

  // QFAI:AC-0001-0152-14
  it("holds the record in the evidence template and has the completion reviewer's gate read it", async () => {
    const reference = await section(CYCLE, "## The record");
    await expectResolvedCitation(CYCLE, reference, "../templates/evidence/sdd-flow.md");
    const template = await section(EVIDENCE, "## Concrete-Abstract Cycle");
    expect(headerCells(template, "Adjudicator")).toEqual([
      "Cycle",
      "Finding",
      "Kind",
      "Target IDs",
      "Decision",
      "Adjudicator",
      "Reason",
    ]);
    const gate = await section(GATE, "## Concrete-abstract cycle record");
    expectSentence(
      gate,
      "the reader",
      /completion reviewer reads/i,
      /`## Concrete-Abstract Cycle`/,
    );
    expectSentence(gate, "no validator", /No validator reads it/i);
    const skill = await readShipped(SKILL);
    expectSentence(
      skill,
      "the skill's gate",
      /concrete-abstract cycle ran/i,
      /completion reviewer returns REVISE/i,
    );
  });
});
