/**
 * Integration: what `/qfai-implement` does when a workflow run hands it a work order.
 *
 * Reads the shipped `qfai-implement/references/orchestrated-mode.md`, and the `SKILL.md` line that
 * sends scope gaps to `/qfai-sdd`. The workflow core's checks at `accept` are not this module's.
 */
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

const REFERENCE = "skill/qfai-implement/references/orchestrated-mode.md";

async function section(heading: string): Promise<string> {
  const text = flat(sectionOf(await readShipped(REFERENCE), heading));
  expect(text, `${REFERENCE} has ${heading}`).not.toBe("");
  return text;
}

describe("qfai-implement in a workflow run", () => {
  // QFAI:EX-0001-0207-01
  it("works only the work order's examples and hands over a request with no work order", async () => {
    const entry = await section("## Entry check");
    expect(entry).toMatch(
      /a request with no work order and no name is passed to `qfai-run` with nothing edited/i,
    );
    expect(entry).toMatch(/then does only that work order's work/i);
  });

  // QFAI:EX-0001-0207-03
  it("takes the flow from the work order's target and asks nothing about it", async () => {
    const text = await section("## The bound flow");
    expect(text).toMatch(/a work order whose `target` binds a flow supplies the flow/i);
    expect(text).toMatch(/run with `--flow BF-NNNN` for it, and no question asks which flow/i);
    expect(text).toMatch(
      /with no work order, the skill chooses the flow as it does when invoked by name/i,
    );
  });

  // QFAI:EX-0001-0207-04
  it("resumes at the checkpoint example and records no progress state of its own", async () => {
    const text = await section("## Resuming a long stage");
    expect(text).toMatch(/resumes at the example its work order's `checkpointRef` names/i);
    expect(text).toMatch(/the result names EX IDs and records no progress state of its own/i);
    expect(text).toMatch(/the phase order of `SKILL\.md` is unchanged on resume/i);
  });

  // QFAI:EX-0001-0207-05
  it("selects the next example from its own fresh flow-scoped validate", async () => {
    const text = await section("## The example selection");
    expect(text).toMatch(
      /runs `npx qfai validate --profile tdd --flow BF-NNNN` itself at every stage start/i,
    );
    expect(text).toMatch(/never taken from the snapshot/i);
  });

  // QFAI:EX-0001-0207-06
  it("lands only the minimal seam and leaves the target test failing at its assertion", async () => {
    const text = await section("## `seam-only`");
    expect(text).toMatch(/only the minimal connection the target test needs is landed/i);
    expect(text).toMatch(/the test is left failing at its assertion/i);
    expect(text).toMatch(/names the target test in `seam\.targetTestId`/i);
    expect(text).toMatch(/the main implementation waits until the acceptance stage has taken RED/i);
  });

  // QFAI:EX-0001-0207-07
  it("blocks on a cause outside its write areas and repairs one inside them", async () => {
    const text = await section("## `seam-only`");
    expect(text).toMatch(
      /a cause outside the stage's write areas, such as a missing environment, is returned `blocked`/i,
    );
    expect(text).toMatch(/`operator` as its `resolvingOwner`/i);
    expect(text).toMatch(
      /a cause the stage can repair inside its write areas is returned `needs_repair`, never `blocked`/i,
    );
    expect(text).toMatch(/none of these results reports a `pass` observation/i);
    expect(text).toMatch(/a reissued seam-only work order is served as a new attempt/i);
  });

  // QFAI:EX-0001-0208-01
  it("changes no tracked file while diagnosing, and names its record as an artifact", async () => {
    const text = await section("## `diagnose-only`");
    expect(text).toMatch(/changes no file git tracks/i);
    expect(text).toMatch(/the result names no changed file/i);
    expect(text).toMatch(/named in `artifactRefs`, not in `changedFiles`/i);
  });

  // QFAI:EX-0001-0208-02
  it("returns exactly one of four verdicts, the matched IDs and a reproduction record", async () => {
    const text = await section("## `diagnose-only`");
    expect(text).toMatch(
      /exactly one verdict in `diagnosis\.verdict`, one of: `missing-test`, `defective-test`, `regression`, `expectation-differs`/i,
    );
    expect(text).toMatch(/`matchedIds` names the BF, AC or EX IDs of the bound flow/i);
    expect(text).toMatch(/for `missing-test` it names the EX that states the case, or the AC/i);
    expect(text).toMatch(
      /`reproductionRef` names the record that holds the reproduction, the cause candidates and the impact/i,
    );
  });

  // QFAI:EX-0001-0208-03
  // QFAI:EX-0001-0208-04
  it("raises no change request for a diagnosed missing test, and one for every other scope gap", async () => {
    const skill = flat(await readShipped("skill/qfai-implement/SKILL.md"));
    expect(skill).toMatch(
      /send a decision, a question for the user or an out-of-scope discovery to `\/qfai-sdd` as a change request/i,
    );
    expect(skill).toMatch(
      /a diagnosed missing test on behaviour an existing AC states is the one scope gap that raises no change request and adds no EX here/i,
    );
    expect(skill).toMatch(/an EX that states the case is worked as an EX no test annotates/i);
    expect(skill).toMatch(/where none does, `\/qfai-sdd` adds it/i);
  });

  // QFAI:EX-0001-0209-01
  it("fixes a regression in production code only, leaving the example covered", async () => {
    const text = await section("## `regression-fix`");
    expect(text).toMatch(
      /the fix changes production code only\. no test, story or contract file changes/i,
    );
    expect(text).toMatch(/the example stays annotated by the same test/i);
    expect(text).toMatch(/no `Change request:` row is appended and no evidence entry is removed/i);
  });

  // QFAI:EX-0001-0209-02
  it("confirms a regression fix by the same test's GREEN re-run, with its receipt", async () => {
    const text = await section("## `regression-fix`");
    expect(text).toMatch(/the same test turning GREEN again confirms the fix/i);
    expect(text).toMatch(
      /`testId` names that test, `rerunRef` its GREEN re-run, `reviewRef` its independent review/i,
    );
    expect(text).toMatch(/recorded in `\.qfai\/evidence\/implement-BF-NNNN\.md`/);
  });

  // QFAI:EX-0001-0210-01
  it("keeps a test fix on the same annotated IDs, with a review and a re-run", async () => {
    const text = await section("## `test-fix`");
    expect(text).toMatch(/`citedBefore`, `citedAfter`/);
    expect(text).toMatch(/the fixed test annotates the same IDs as before/i);
    expect(text).toMatch(/no story, contract or `decisions\.md` file changes/i);
    expect(text).toMatch(/recorded in `\.qfai\/evidence\/implement-BF-NNNN\.md`/);
  });

  // QFAI:EX-0001-0210-02
  it("returns a test fix that changes what is checked as needs_repair for qfai-sdd", async () => {
    const text = await section("## `test-fix`");
    expect(text).toMatch(/would check a different ID returns `needs_repair`/i);
    expect(text).toMatch(/with `qfai-sdd` as its `resolvingOwner`/i);
  });

  // QFAI:EX-0001-0210-03
  it("takes a test fix whose first matched ID is an EX, and leaves a BF or an AC", async () => {
    const text = await section("## `test-fix`");
    expect(text).toMatch(/the first ID of the diagnosis's `matchedIds` is an EX/i);
    expect(text).toMatch(/a BF or an AC is `qfai-atdd`'s/i);
  });
});
