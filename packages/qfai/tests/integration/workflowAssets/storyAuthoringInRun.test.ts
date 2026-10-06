/**
 * Integration: how a fix route's implement stage seeds a diagnosed example, and how `/qfai-sdd`
 * changes the story tree.
 *
 * Reads the shipped `implement-tdd` step, the `qfai-sdd` skill, its steps and the triage reference.
 */
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

const SKILL = "skill/qfai-sdd/SKILL.md";
const TRIAGE = "skill/qfai-sdd/references/sdd-triage.md";
const TRIAGE_STEP = "step/sdd-triage/STEP.md";
const CHECKLISTS = "skill/qfai-sdd/references/sdd-phase-checklists.md";
const STORY_STEP = "step/implement-tdd/STEP.md";
const SEEDING = "## A diagnosed missing example";

async function section(file: string, heading: string): Promise<string> {
  const text = flat(sectionOf(await readShipped(file), heading));
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

describe("defect example seeding", () => {
  // QFAI:AC-0001-0206-01
  // QFAI:EX-0001-0206-01
  it("appends one example under the matched criterion and cites it from the enforcing rule", async () => {
    const text = await section(STORY_STEP, SEEDING);
    expect(text).toMatch(
      /append exactly one EX to the `03_Example\.md` of the story that owns the AC the diagnosis matched/i,
    );
    expect(text).toMatch(/its ID is the next free EX ID of that story, its `AC-Ref` is that AC/i);
    expect(text).toMatch(
      /add the new EX ID to the Examples cell of the contract rule the diagnosis names as owning that AC/i,
    );
  });

  // QFAI:AC-0001-0206-02
  // QFAI:EX-0001-0206-02
  it("changes no story, criterion, rule statement, existing example or test", async () => {
    const text = await section(STORY_STEP, SEEDING);
    expect(text).toMatch(/the rule's Statement is unchanged/i);
    expect(text).toMatch(/change no story, AC, rule statement or existing EX/i);
  });

  // QFAI:AC-0001-0186-01
  // QFAI:EX-0001-0186-02
  it("carries the diagnosis as the reason for the appended example, and changes no statement", async () => {
    const text = await section(STORY_STEP, SEEDING);
    expect(text).toMatch(/the diagnosis is its reason/i);
    expect(text).toMatch(/change no story, AC/i);
    expect(text).toMatch(/the rule's Statement is unchanged/i);
  });

  // QFAI:AC-0001-0206-03
  // QFAI:EX-0001-0206-03
  it("asks nothing and appends no decisions row", async () => {
    const text = await section(STORY_STEP, SEEDING);
    expect(text).toMatch(/the step asks the user nothing/i);
    expect(text).toMatch(
      /append no `decisions\.md` row: the drift gate needs no `Change request:` row for appended example rows/i,
    );
    expect(text).toMatch(/list the EX in the run's final report/i);
  });
});

describe("qfai-sdd changes the story tree", () => {
  // QFAI:AC-0001-0147-03
  // QFAI:EX-0001-0147-05
  it("records in decisions.md only what the user decided, with who, when and the option", async () => {
    const text = await section(TRIAGE, "## Decision and question rows");
    expect(text).toMatch(/decisions\.md records only what the user decided/i);
    expect(text).toMatch(/a row is appended once the user has decided what it records/i);
    expect(text).toMatch(/who approved it, when, and the option chosen/i);
    expect(text).toMatch(/a declined change request is appended at REJECTED/i);
    expect(text).toMatch(/who declined it and when/i);
    expect(text).toMatch(/open questions use OQ-NNNN rows/i);
    expect(flat(await readShipped(CHECKLISTS))).toMatch(
      /a declined change request is a REJECTED `Change request:` row/i,
    );
  });

  // QFAI:AC-0001-0207-02
  // QFAI:EX-0001-0207-02
  it("ends at SDD when invoked by name, and hands a request to go to the end to qfai-run", async () => {
    const text = await section(SKILL, "## /qfai-sdd");
    expect(text).toMatch(/runs standalone, ends at SDD/i);
    expect(text).toMatch(/`qfai-run`/);
  });

  // QFAI:AC-0001-0207-06
  // QFAI:EX-0001-0207-06
  // QFAI:EX-0001-0207-07
  it("changes the story tree only on the user's approval, recording who approved it, when and what", async () => {
    const text = await section(TRIAGE, "### A change to the story tree");
    expect(text).toMatch(/changes only on the user's approval/i);
    expect(text).toMatch(
      /show the user the files the stage would change and the proposed change, and change nothing until the user answers/i,
    );
    expect(text).toMatch(
      /a request from the user in the session that names the change and its effect is that answer: the stage lists the files in its announcement, asks no second question, and records the request as the option chosen/i,
    );
    expect(text).toMatch(
      /on approval, write the change and append one `decisions\.md` row whose Content opens `Change request:`/i,
    );
    expect(text).toMatch(
      /names every story-tree and contract file it changed, and `decisions\.md` when it appended any other row/i,
    );
    expect(text).toMatch(
      /its Approach records who approved it, when, and the label of the option chosen/i,
    );
    expect(text).toMatch(/move the row to DONE once every change it names is written/i);
    const step = await section(TRIAGE_STEP, "## A change to the story tree");
    expect(step).toMatch(/sdd-triage\.md#a-change-to-the-story-tree/);
  });
});
