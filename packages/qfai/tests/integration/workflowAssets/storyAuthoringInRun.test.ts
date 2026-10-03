/**
 * Integration: how `/qfai-sdd` seeds a diagnosed example and changes the story tree.
 *
 * Reads the shipped `qfai-sdd` skill, its steps and the triage reference.
 */
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

const SKILL = "skill/qfai-sdd/SKILL.md";
const TRIAGE = "skill/qfai-sdd/references/sdd-triage.md";
const TRIAGE_STEP = "step/sdd-triage/STEP.md";
const STORY_STEP = "step/sdd-story/STEP.md";
const SEEDING = "## A diagnosed missing test";

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
    expect(text).toMatch(
      /its ID is the next free EX ID of that story, and its `AC-Ref` is that AC/i,
    );
    expect(text).toMatch(
      /add the new EX ID to the Examples cell of the contract rule that already cites an example of that AC/i,
    );
  });

  // QFAI:AC-0001-0206-02
  // QFAI:EX-0001-0206-02
  it("changes no story, criterion, rule statement, existing example or test", async () => {
    const text = await section(STORY_STEP, SEEDING);
    expect(text).toMatch(/the rule's Statement is unchanged/i);
    expect(text).toMatch(/add or change no US or AC, and no existing EX/i);
    expect(text).toMatch(
      /write or annotate no test: the new EX stays an example no test annotates/i,
    );
  });

  // QFAI:AC-0001-0206-03
  // QFAI:EX-0001-0206-03
  it("appends no decision row for the approval-free seeding", async () => {
    const text = await section(STORY_STEP, SEEDING);
    expect(text).toMatch(
      /append no triage or seeding row of its own: the operation needs no triage approval/i,
    );
    expect(text).toMatch(/on approval the stage's one `Change request:` row names them/i);
  });
});

describe("qfai-sdd changes the story tree", () => {
  // QFAI:AC-0001-0147-03
  // QFAI:EX-0001-0147-05
  it("records in decisions.md only the change the user approved, with who, when and the option", async () => {
    const text = await section(TRIAGE, "## Decision and question rows");
    expect(text).toMatch(/decisions\.md records only what the user approved/i);
    expect(text).toMatch(/a row is appended once the user has approved what it records/i);
    expect(text).toMatch(/who approved it, when, and the option chosen/i);
    expect(text).toMatch(/a declined change appends no row/i);
    expect(text).toMatch(/open questions use OQ-NNNN rows/i);
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
  it("changes the story tree only on the user's approval, recording who approved it, when and what", async () => {
    const text = await section(TRIAGE, "### A change to the story tree");
    expect(text).toMatch(/changes only on the user's approval/i);
    expect(text).toMatch(
      /show the user the files the stage would change and the proposed change, and change nothing until the user answers/i,
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
