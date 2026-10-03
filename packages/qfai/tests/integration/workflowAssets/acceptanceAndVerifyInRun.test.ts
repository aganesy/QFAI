/**
 * Integration: what `/qfai-verify` does when a workflow run hands it a work order.
 *
 * Reads the shipped files that state the skill's behaviour inside a run. The workflow core's
 * checks at `accept` are not this module's.
 */
import { describe, expect, it } from "vitest";

import { flat, readShipped, rowOf, sectionOf } from "../../helpers/shippedAssistant.js";

const VERIFY = "step/verify-repo-gate/STEP.md";
const OPERATING = "rule/shared-skill-operating-baseline.md";

async function section(file: string, heading: string): Promise<string> {
  const text = flat(sectionOf(await readShipped(file), heading));
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

describe("qfai-verify in a workflow run", () => {
  // QFAI:AC-0001-0208-01
  // QFAI:EX-0001-0208-01
  it("names this run's verify.json and an independent qa-gatekeeper verdict", async () => {
    const text = await section(VERIFY, "## The stage result");
    expect(text).toMatch(
      /writes this run's `\.qfai\/report\/verify\.json` and names it in `artifactRefs`/i,
    );
    expect(text).toMatch(/the qa-gatekeeper verdict is a `reviewResults` entry/i);
    expect(text).toMatch(/independent of the authors of what it reviews/i);
    expect(text).toMatch(/`gateResults` are information only/i);
  });

  // QFAI:AC-0001-0208-02
  // QFAI:EX-0001-0208-02
  it("never names another run's or another flow's verify.json", async () => {
    const text = await section(VERIFY, "## The stage result");
    expect(text).toMatch(
      /written by another run, scoped to another flow or kept in a shared location is never named/i,
    );
  });

  // QFAI:AC-0001-0208-03
  // QFAI:EX-0001-0208-03
  it("reports outcome and test observation apart, and an unrun gate as unrun", async () => {
    const text = await section(VERIFY, "## The stage result");
    expect(text).toMatch(/`outcome` and `testObservation` are reported apart/i);
    expect(text).toMatch(/a required gate that did not run is reported `unrun`, never as a pass/i);
  });

  // QFAI:AC-0001-0208-04
  // QFAI:EX-0001-0208-04
  it("leaves verify.json unchanged inside a run", async () => {
    const text = await section(VERIFY, "## The stage result");
    expect(text).toMatch(/`verify\.json` itself is unchanged inside a run/i);
    expect(text).toMatch(/qfai-verify\/references\/verify-output-contract\.md`/);
    expect(text).toMatch(/the run's values stay in the stage result/i);
  });

  // QFAI:AC-0001-0208-05
  // QFAI:EX-0001-0208-05
  it("routes each finding it did not cause to its owner", async () => {
    const raw = sectionOf(await readShipped(VERIFY), "## Findings verify did not cause");
    const text = flat(raw);
    expect(text).toMatch(/verify edits no artifact another owner holds/i);
    expect(text).toMatch(/returns `needs_repair`, with the finding listed in `debts`/i);
    expect(rowOf(raw, "| A story or contract gap ")).toMatch(/`qfai-sdd`/);
    expect(rowOf(raw, "| An acceptance-test defect ")).toMatch(/`qfai-implement`/);
    expect(rowOf(raw, "| An implementation defect ")).toMatch(/`qfai-implement`/);
    expect(text).toMatch(/these three are the only repairs verify routes/i);
  });

  // QFAI:EX-0001-0208-06
  it("blocks on a missing environment with the operator as the one who clears it", async () => {
    const text = await section(VERIFY, "## A missing environment");
    expect(text).toMatch(/returns the stage `blocked`, with the blocker `stage-blocked`/i);
    expect(text).toMatch(/`operator` as the one who clears it/i);
    expect(text).toMatch(/no debt is listed for it, and no repair is routed/i);
  });

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
