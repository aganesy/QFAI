/**
 * Integration: how the implement, verify, prototyping, maintain, triage and configure stages use
 * the run's deliberation record, as the shipped assistant tree states it. An agent decision is a
 * row of the record and never a line of a report; implement, verify and prototyping read no
 * record; the other stages search the records for a turned-down option before an agent decision.
 */
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

const OPERATING = "rule/shared-skill-operating-baseline.md";
const RECORD_SECTION = "## Deliberation Record";
const STAGE_POINTS = "skill/qfai-run/references/stage-points.md";
const SCREENS = "skill/qfai-run/references/operator-screens.md";
const NO_RECORD = /opens no file under `paths\.deliberationDir`/i;
const SEARCH =
  /before you take an agent decision, search the option cells of the deliberation records and the `Declined:` rows of `decisions\.md` for the option you are about to choose/i;

async function section(file: string, heading: string): Promise<string> {
  const text = flat(sectionOf(await readShipped(file), heading));
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

describe("an agent decision is a row of the run's deliberation record", () => {
  // QFAI:EX-0001-0223-03
  it("takes a decision point's other decisions as record rows, and the final report lists none", async () => {
    const point = await section(STAGE_POINTS, "## Decision point");
    expect(point).toMatch(/take every other decision yourself and ask nothing/i);
    expect(point).toMatch(
      /write each agent decision, with its reason, as an Agent decisions row of the run's deliberation record; the final report does not list it/i,
    );
    const report = await section(SCREENS, "## Final report");
    expect(report).toMatch(/name the path of the run's deliberation record/i);
    expect(report).toMatch(/list no agent decision: each is a row of that record/i);
    expect(report).not.toMatch(/every decision taken without the user/i);
  });

  // QFAI:EX-0001-0301-02
  it("says in the final report that the run wrote no record", async () => {
    expect(await section(SCREENS, "## Final report")).toMatch(/or say that the run wrote none/i);
  });

  // QFAI:EX-0001-0224-14
  it("names a covered action in the stage report and writes a covered choice to the record", async () => {
    const targets = await section(SCREENS, "## Independent targets under one goal");
    expect(targets).toMatch(/name a routine action under that authority in the stage report/i);
    expect(targets).toMatch(
      /write routine choices as the agent's decisions under that authority, Agent decisions rows of the run's deliberation record, never as the user's individual option approval/i,
    );
  });

  // QFAI:EX-0001-0301-08
  it("keeps gate verdicts, receipts, review skips and quoted delegation in the stage report, and decisions in the record", async () => {
    const record = await section(OPERATING, RECORD_SECTION);
    expect(record).toMatch(
      /an agent decision is an Agent decisions row of the record, never a line of the stage report or the final report/i,
    );
    expect(record).toMatch(
      /the stage report keeps the evidence: gate results, CI receipts, review skips and quoted delegation instructions/i,
    );
    expect(record).toMatch(
      /an assumption a no-question mode takes is a row too, and the final report also lists it/i,
    );

    const thinking = await section("rule/thinking.md", "## What the stage records");
    expect(thinking).toMatch(
      /every stage writes each agent decision it takes.*as an Agent decisions row of the run's deliberation record.*neither its stage report nor the final report lists it/i,
    );
    const steps: [string, RegExp][] = [
      [
        "step/implement-diagnose/STEP.md",
        /otherwise take the decision and write it, with its reason, as an Agent decisions row of the run's deliberation record/i,
      ],
      [
        "step/implement-sweep/STEP.md",
        /write the finding, choice and reason as an Agent decisions row of the run's deliberation record/i,
      ],
      [
        "skill/qfai-verify/SKILL.md",
        /each decision the agents adopted is an Agent decisions row of the run's deliberation record.*the completion message does not list them/i,
      ],
      [
        "rule/review-convergence.md",
        /every adopted decision is an Agent decisions row of the run's deliberation record.*no report lists it/i,
      ],
    ];
    for (const [file, statement] of steps) {
      expect(flat(await readShipped(file)), file).toMatch(statement);
    }
  });

  // QFAI:EX-0001-0298-16
  it("lets a committed record be repaired in its table layout only", async () => {
    expect(await section("rule/references/deliberation-record.md", "## Writing a record")).toMatch(
      /once committed, it may be edited only to repair its table layout.*never its content/i,
    );
  });

  // QFAI:EX-0001-0301-04
  it("commits the run's record in the commit verify-commit makes", async () => {
    expect(await section("step/verify-commit/STEP.md", "## Writes")).toMatch(
      /one commit on the current branch holding the run's changes and, where the run wrote one, its deliberation record\. no step edits the record's content after that commit/i,
    );
  });

  // QFAI:EX-0001-0301-10
  it("commits a stage skill's record at its last step when it runs by name without verify-commit", async () => {
    expect(await section(OPERATING, RECORD_SECTION)).toMatch(
      /a stage skill invoked by name, outside a `qfai-run` plan and with no `verify-commit` step, makes its record final at its last step\. that step commits locally only the record and the `open-questions\.md` rows the run wrote, and pushes nothing/i,
    );
  });
});

describe("where each stage reads deliberation records", () => {
  // QFAI:EX-0001-0299-01
  it("takes the current state from the registers, which win over a record", async () => {
    const reading = await section("rule/references/deliberation-record.md", "## Reading a record");
    expect(reading).toMatch(
      /current specification, the settled decisions and the open questions come from the story tree, `decisions\.md` and `open-questions\.md`, never from a record/i,
    );
    expect(reading).toMatch(/they win and the record stays unchanged/i);
    expect(await section("skill/qfai-implement/SKILL.md", "## Inputs")).toMatch(
      /the story tree, `decisions\.md` and `open-questions\.md` hold the current state/i,
    );
  });

  // QFAI:EX-0001-0299-02
  it("opens no record in an implement or a verify stage", async () => {
    expect(await section("skill/qfai-implement/SKILL.md", "## Inputs")).toMatch(NO_RECORD);
    expect(await section("skill/qfai-verify/SKILL.md", "## Inputs")).toMatch(NO_RECORD);
    expect(await section("rule/references/deliberation-record.md", "## Reading a record")).toMatch(
      /an implement, verify or prototyping stage reads no record/i,
    );
    expect(flat(await readShipped("step/verify-context/STEP.md"))).toMatch(
      /it opens no deliberation record: no file under `paths\.deliberationDir` is read/i,
    );
    expect(flat(await readShipped("skill/qfai-verify/references/context-load.md"))).toMatch(
      /open no file under `paths\.deliberationDir`/i,
    );
    expect(await section(OPERATING, RECORD_SECTION)).toMatch(
      /an implement, verify or prototyping stage reads no record/i,
    );
  });

  // QFAI:EX-0001-0299-03
  it("searches the records for a turned-down option before an agent decision, and puts a match to the user", async () => {
    for (const [file, heading] of [
      ["skill/qfai-maintain/SKILL.md", "## Inputs"],
      ["skill/qfai-triage/SKILL.md", "## Inputs"],
      ["skill/qfai-configure/SKILL.md", "## Inputs Priority (Preflight)"],
    ] as const) {
      const inputs = await section(file, heading);
      expect(inputs, file).toMatch(SEARCH);
      expect(inputs, file).toMatch(/read only the rows that match/i);
      expect(inputs, file).toMatch(
        /a choice whose option was turned down before goes to the user, or is registered as an open question under a no-question mode/i,
      );
    }
  });

  // QFAI:EX-0001-0301-09
  it("takes the prototype's direction from DESIGN.md and the UI contracts and opens no record", async () => {
    const inputs = await section("skill/qfai-prototyping/SKILL.md", "## Inputs Priority");
    expect(inputs).toMatch(/P3: root `DESIGN\.md`/);
    expect(inputs).toMatch(/P4: the UI contracts/);
    expect(inputs).toMatch(
      /prototyping takes its direction from P3 and P4, and opens no file under `paths\.deliberationDir`/i,
    );
    expect(flat(await readShipped("step/prototyping-grill/STEP.md"))).toMatch(
      /the step writes the record and never reads one: no file under `paths\.deliberationDir` is an input/i,
    );
  });
});
