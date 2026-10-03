/**
 * Integration: what `/qfai-sdd` does when a workflow run hands it a work order.
 *
 * Reads the shipped `qfai-sdd` steps, the triage reference's run section and the shared entry
 * check. The workflow core's record check at `accept` is not this module's.
 */
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

const SKILL = "skill/qfai-sdd/SKILL.md";
const TRIAGE = "skill/qfai-sdd/references/sdd-triage.md";
const TRIAGE_STEP = "step/sdd-triage/STEP.md";
const STORY_STEP = "step/sdd-story/STEP.md";
const STEERING_STEP = "step/common-steering-refresh/STEP.md";
const BASELINE = "rule/shared-skill-operating-baseline.md";
const SEEDING = "## A diagnosed missing test";

async function section(file: string, heading: string): Promise<string> {
  const text = flat(sectionOf(await readShipped(file), heading));
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

describe("Stage 1 approvals inside a run", () => {
  // QFAI:AC-0001-0205-01
  // QFAI:EX-0001-0205-01
  it("checks a routing-time CREATE approval and cites it from the triage row", async () => {
    const pointer = await section(TRIAGE_STEP, "## Inside a workflow run");
    expect(pointer).toMatch(
      /`\.qfai\/assistant\/skill\/qfai-sdd\/references\/sdd-triage\.md#inside-a-workflow-run`/,
    );
    const text = await section(TRIAGE, "## Inside a workflow run");
    expect(text).toMatch(/Stage 1 asks the operator nothing itself/i);
    expect(text).toMatch(
      /checks the `human_decision` the work order's `authorizationRefs` cite for its `new_story` slot, instead of asking/i,
    );
    expect(text).toMatch(
      /its Approach cites the record as `<runId>\/<authorizationId>` and writes its `answeredBy`, its `recordedAt` and the label of each chosen option exactly as the record holds them/i,
    );
    expect(text).toMatch(/the row is then raised to WIP/i);
    expect(text).toMatch(/the table keeps exactly its four columns/i);
  });

  // QFAI:AC-0001-0205-02
  // QFAI:EX-0001-0205-02
  it("appends no row and asks nothing on a missing, mismatched or stale approval", async () => {
    const text = await section(TRIAGE, "## Inside a workflow run");
    expect(text).toMatch(
      /the check passes only when the record exists, answers this slot and this operation, and is not stale/i,
    );
    expect(text).toMatch(/a missing, mismatched or stale CREATE approval/i);
    expect(text).toMatch(/Stage 1 appends no triage row and asks the operator nothing/i);
    expect(text).toMatch(/returns `awaiting_input` naming the row and the reason/i);
    expect(text).toMatch(/the clock alone never makes it stale/i);
  });

  // QFAI:AC-0001-0205-03
  // QFAI:EX-0001-0205-03
  it("opens the approval question for every other approval-required operation", async () => {
    const text = await section(TRIAGE, "## Inside a workflow run");
    expect(text).toMatch(/DELETE, SPLIT, MERGE, SUPERSEDE and UPDATE:REMOVE/);
    expect(text).toMatch(/a routing-time CREATE approval approves none of them/i);
    expect(text).toMatch(
      /opens the row's approval question as a `decision` question of its stage result, with outcome `awaiting_input`, and appends no row/i,
    );
    expect(text).toMatch(
      /the attempt that receives the answer through `authorizationRefs` appends the row at TODO, cites that `human_decision` the same way/i,
    );
  });

  // QFAI:AC-0001-0205-04
  // QFAI:EX-0001-0205-04
  it("lets --auto approve nothing inside a run", async () => {
    const text = await section(TRIAGE_STEP, "## Inside a workflow run");
    expect(text).toMatch(
      /an approval-required row with no satisfying `human_decision` stops Stage 1/i,
    );
    expect(text).toMatch(/the row never reaches WIP, nothing that depends on it is written/i);
    expect(text).toMatch(/reports the row with its operation and target/i);
    expect(text).toMatch(/`--auto` approves nothing/i);
  });
});

describe("defect example seeding", () => {
  // QFAI:AC-0001-0206-01
  // QFAI:EX-0001-0206-01
  it("appends one example under the matched criterion and cites it from the enforcing rule", async () => {
    const text = await section(STORY_STEP, SEEDING);
    expect(text).toMatch(/in a stage of kind `sdd_append`/i);
    expect(text).toMatch(
      /append exactly one EX to the `03_Example\.md` of the story that owns the AC the diagnosis matched/i,
    );
    expect(text).toMatch(
      /its ID is the next free EX ID of that story, and its `AC-Ref` is that AC/i,
    );
    expect(text).toMatch(
      /add the new EX ID to the Examples cell of the contract rule that already cites an example of that AC/i,
    );
    expect(text).toMatch(
      /records the diagnosed defect and the run ID, and names no path under `\.qfai\/run\/`/i,
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
  it("records the appended example as one approval-free UPDATE:APPEND triage row", async () => {
    const text = await section(STORY_STEP, SEEDING);
    expect(text).toMatch(
      /one `decisions\.md` triage row naming UPDATE:APPEND, the story and the diagnosis as its source/i,
    );
    expect(text).toMatch(/the row cites no `human_decision`/i);
  });
});

describe("qfai-sdd as a stage of a run", () => {
  // QFAI:AC-0001-0207-01
  // QFAI:EX-0001-0207-01
  it("refuses a work order with no target, scopes a flow target and binds a new-story slot", async () => {
    const text = await section(TRIAGE_STEP, "## Scope of the request");
    expect(text).toMatch(
      /a work order with no `target` is refused\. it never runs the no-argument batch/i,
    );
    expect(text).toMatch(
      /a `flow` target scopes the stage to that business flow, and its gate runs with `--flow BF-NNNN`/i,
    );
    const story = await section(STORY_STEP, "## Procedure");
    expect(story).toMatch(/a `new_story` target's result reports one `bindings` entry per slot/i);
  });

  // QFAI:AC-0001-0207-02
  // QFAI:EX-0001-0207-02
  it("ends at SDD when invoked by name, and hands a request to go to the end to a run", async () => {
    const text = await section(SKILL, "## /qfai-sdd");
    expect(text).toMatch(/runs standalone, ends at SDD and creates no run/i);
    expect(text).toMatch(/handed to a whole run through `qfai-run`/i);
  });

  // QFAI:AC-0001-0207-03
  // QFAI:EX-0001-0207-03
  it("hands over, refuses or works the order as the entry check says", async () => {
    const text = await section(BASELINE, "## Workflow Run Entry Check (Mandatory)");
    expect(text).toMatch(/edit nothing\. pass the request to `qfai-run` in the same turn/i);
    expect(text).toMatch(/do only that step.s work/i);
  });

  // QFAI:AC-0001-0207-05
  // QFAI:EX-0001-0207-05
  it("recomputes the Stage 0 key and always reruns the preflight readiness check", async () => {
    const text = await section(STEERING_STEP, "## Inside a workflow run");
    expect(text).toMatch(/only when the key recorded with it, recomputed, is equal/i);
    expect(text).toMatch(/refreshes only what changed/i);
    const triage = await section(TRIAGE_STEP, "## Stage 0: source and preflight");
    expect(triage).toMatch(/`npx qfai sdd preflight`/);
    expect(triage).toMatch(/preflight readiness check runs in every attempt/i);
  });

  // QFAI:AC-0001-0207-06
  // QFAI:EX-0001-0207-06
  it("changes the story tree only on the operator's answer, and moves its change request row to DONE", async () => {
    const text = await section(TRIAGE, "### A change to the story tree");
    expect(text).toMatch(/the first attempt asks once and changes nothing/i);
    expect(text).toMatch(
      /opens one `decision` question naming the files it would change and the proposed change, and returns `awaiting_input`/i,
    );
    expect(text).toMatch(
      /the attempt that holds the answer, received through `authorizationRefs`, makes the change/i,
    );
    expect(text).toMatch(
      /appends one `decisions\.md` row at WIP whose Content opens `Change request:`/i,
    );
    expect(text).toMatch(
      /Approach cites that answer as `<runId>\/<authorizationId>` and writes its `answeredBy`, its `recordedAt` and the label of each chosen option exactly as the run's authorization record holds them/i,
    );
    expect(text).toMatch(
      /names every story-tree and contract file it changed, and `decisions\.md` when it appended any other row/i,
    );
    expect(text).toMatch(
      /the same attempt moves the row to DONE once every change the row names is written/i,
    );
    expect(text).toMatch(
      /stays at WIP only while changes it names remain for a later attempt of this stage/i,
    );
    expect(text).toMatch(
      /a row that cites only the run's `request_scope` is refused\. leaving the row at TODO does not avoid the refusal/i,
    );
  });
});
