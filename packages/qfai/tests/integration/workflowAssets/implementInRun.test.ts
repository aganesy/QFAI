/**
 * Integration: what `/qfai-implement` does when a workflow run hands it a work order.
 *
 * Reads the shipped `qfai-implement` steps a run names, and the shared rule every worker follows.
 * The workflow core's checks at `accept` are not this module's.
 */
import { describe, expect, it } from "vitest";

import { flat, readShipped, rowOf, sectionOf } from "../../helpers/shippedAssistant.js";

const OPERATING = "rule/shared-skill-operating-baseline.md";
const TDD = "step/implement-tdd/STEP.md";
const DIAGNOSE = "step/implement-diagnose/STEP.md";
const SEAM = "step/implement-seam/STEP.md";
const REGRESSION_FIX = "step/implement-regression-fix/STEP.md";
const TEST_FIX = "step/implement-test-fix/STEP.md";
const ACCEPTANCE = "step/implement-acceptance/STEP.md";

async function step(file: string): Promise<string> {
  const text = flat(await readShipped(file));
  expect(text, `${file} is shipped`).not.toBe("");
  return text;
}

describe("qfai-implement in a workflow run", () => {
  // QFAI:AC-0001-0200-01
  // QFAI:EX-0001-0200-01
  it("works only the work order's examples and hands over a request with no work order", async () => {
    const entry = sectionOf(await readShipped(OPERATING), "## Workflow Run Entry Check");
    expect(rowOf(entry, "| `pass-on`")).toMatch(/Edit nothing\. Pass the request to `qfai-run`/);
    expect(rowOf(entry, "| `step`")).toMatch(/Do only that step.s work/);
    const steps = flat(sectionOf(await readShipped(OPERATING), "### A plan's steps"));
    expect(steps).toMatch(
      /runs the steps of the plan `npx qfai workflow plan` returned, stage by stage, and no other/i,
    );
  });

  // QFAI:AC-0001-0200-03
  // QFAI:EX-0001-0200-03
  it("takes the flow from the work order's target and asks nothing about it", async () => {
    const text = await step(TDD);
    expect(text).toMatch(/a work order whose `target` binds a flow supplies the flow/i);
    expect(text).toMatch(/no question asks which flow/i);
    expect(text).toMatch(/otherwise the invocation's BF argument names it/i);
    expect(text).toContain("npx qfai validate --profile tdd --flow BF-NNNN");
  });

  // QFAI:AC-0001-0200-04
  // QFAI:EX-0001-0200-04
  it("resumes at the checkpoint example and records no progress state of its own", async () => {
    const text = await step(TDD);
    expect(text).toMatch(/resumes starts at the example its work order's `checkpointRef` names/i);
    expect(text).toMatch(/the result names EX IDs and records no progress state of its own/i);
    expect(text).toMatch(/the procedure order is unchanged on resume/i);
  });

  // QFAI:AC-0001-0200-05
  // QFAI:EX-0001-0200-05
  it("selects the next example from its own fresh flow-scoped validate", async () => {
    const text = await step(TDD);
    expect(text).toMatch(/the stage runs that validation itself at every stage start/i);
    expect(text).toMatch(/never from a shared Stage 0 snapshot/i);
  });

  // QFAI:AC-0001-0200-06
  // QFAI:EX-0001-0200-06
  it("lands only the minimal seam and leaves the target test failing at its assertion", async () => {
    const text = await step(SEAM);
    expect(text).toMatch(/only the minimal connection the target test needs is landed/i);
    expect(text).toMatch(/the test is left failing at its assertion/i);
    expect(text).toMatch(/names the target test in `seam\.targetTestId`/i);
    expect(text).toMatch(/the main implementation waits until the acceptance stage has taken RED/i);
  });

  // QFAI:EX-0001-0200-07
  it("blocks on a cause outside its write areas and repairs one inside them", async () => {
    const text = await step(SEAM);
    expect(text).toMatch(
      /a cause outside the stage's write areas, such as a missing environment, is returned `blocked`/i,
    );
    expect(text).toMatch(/`operator` as its `resolvingOwner`/i);
    expect(text).toMatch(
      /a cause the stage can repair inside its write areas is returned `needs_repair`, never `blocked`/i,
    );
    expect(text).toMatch(/none of these results reports a `pass` observation/i);
    expect(text).toMatch(/a reissued seam request is served as a new attempt/i);
  });

  // QFAI:AC-0001-0201-01
  // QFAI:EX-0001-0201-01
  it("changes no tracked file while diagnosing, and names its record as an artifact", async () => {
    const text = await step(DIAGNOSE);
    expect(text).toMatch(/changes no file git tracks/i);
    expect(text).toMatch(/the result names no changed file/i);
    expect(text).toMatch(/reproduction record goes in the stage report, not in a file/i);
  });

  // QFAI:AC-0001-0201-02
  // QFAI:EX-0001-0201-02
  it("returns exactly one verdict, the matched IDs and a reproduction record", async () => {
    const text = await step(DIAGNOSE);
    expect(text).toMatch(
      /exactly one verdict in `diagnosis\.verdict`, one of: `missing-test`, `defective-test`, `regression`, `expectation-differs`/i,
    );
    expect(text).toMatch(/`matchedIds`, which names the BF, AC or EX IDs of the bound flow/i);
    expect(text).toMatch(/for `missing-test` it names the EX that states the case, or the AC/i);
    expect(text).toMatch(
      /`reproductionRef`, which names the record that holds the reproduction, the cause candidates and the impact/i,
    );
  });

  // QFAI:AC-0001-0201-03
  // QFAI:EX-0001-0201-03
  // QFAI:EX-0001-0201-04
  it("raises no change request for a diagnosed missing test, and one for every other scope gap", async () => {
    const text = await step(TDD);
    expect(text).toMatch(
      /send a decision, a question for the user or an out-of-scope discovery to `\/qfai-sdd` as a change request/i,
    );
    expect(text).toMatch(
      /a diagnosed missing test on behaviour an existing AC states is the one scope gap that raises no change request and adds no EX here/i,
    );
    expect(text).toMatch(/an EX that states the case is worked as an EX no test annotates/i);
    expect(text).toMatch(/where none does, `\/qfai-sdd` adds it/i);
  });

  // QFAI:AC-0001-0202-01
  // QFAI:EX-0001-0202-01
  it("fixes a regression in production code only, leaving the example covered", async () => {
    const text = await step(REGRESSION_FIX);
    expect(text).toMatch(
      /the fix changes production code only\. no test, story or contract file changes/i,
    );
    expect(text).toMatch(/the example stays annotated by the same test/i);
    expect(text).toMatch(/no `Change request:` row is appended and no evidence entry is removed/i);
  });

  // QFAI:AC-0001-0202-02
  // QFAI:EX-0001-0202-02
  it("confirms a regression fix by the same test's GREEN re-run, with its receipt", async () => {
    const text = await step(REGRESSION_FIX);
    expect(text).toMatch(/the same test turning GREEN again confirms the fix/i);
    expect(text).toMatch(
      /`testId` names that test, `rerunRef` its GREEN re-run, `reviewRef` its independent review/i,
    );
    expect(text).toMatch(/reported in the stage report/i);
  });

  // QFAI:AC-0001-0203-01
  // QFAI:EX-0001-0203-01
  it("keeps a test fix on the same annotated IDs, with a review and a re-run", async () => {
    const text = await step(TEST_FIX);
    expect(text).toMatch(/`citedBefore`, `citedAfter`/);
    expect(text).toMatch(/the fixed test annotates the same IDs as before/i);
    expect(text).toMatch(/no story, contract or `decisions\.md` file changes/i);
    expect(text).toMatch(/reported in the stage report/i);
  });

  // QFAI:AC-0001-0203-02
  // QFAI:EX-0001-0203-02
  it("makes no test fix that changes what is checked, and names qfai-sdd", async () => {
    const text = await step(TEST_FIX);
    expect(text).toMatch(/would check a different ID is not made/i);
    expect(text).toMatch(/The session stops and names `\/qfai-sdd` as the owner of the change/);
  });

  // QFAI:AC-0001-0203-03
  // QFAI:EX-0001-0203-03
  it("repairs a test whatever layer its first matched ID names", async () => {
    const text = await step(TEST_FIX);
    expect(text).toMatch(
      /repairs it, whatever layer the\s+first ID of the diagnosis's `matchedIds` names/i,
    );
    expect(text).toMatch(
      /maps a BF to an E2E test, an AC to an\s+integration or API test, and an EX/i,
    );
    expect(text).toContain("## Passes when");
    expect(text).toMatch(/A pass while the\s+diagnosis names a defective test is refused/i);
  });
});

describe("implement-acceptance", () => {
  // QFAI:AC-0001-0226-02
  // QFAI:EX-0001-0226-02
  it("writes the bodies of empty acceptance tests and keeps every annotation and file", async () => {
    const text = await step(ACCEPTANCE);
    expect(text).toMatch(/writes the assertions those bodies owe/i);
    expect(text).toMatch(/Each test keeps its annotation and its file/);
    expect(text).toMatch(/No annotation is added, moved or removed/);
  });
});
