/**
 * Integration: what `/qfai-atdd` and `/qfai-verify` do when a workflow run hands them a work order.
 *
 * Reads the shipped files that state each skill's behaviour inside a run. The workflow core's
 * checks at `accept` are not this module's.
 */
import { describe, expect, it } from "vitest";

import { flat, readShipped, rowOf, sectionOf } from "../../helpers/shippedAssistant.js";

const SCAFFOLD = "step/atdd-scaffold/STEP.md";
const AUTHOR = "step/atdd-author/STEP.md";
const TEST_FIX = "step/atdd-test-fix/STEP.md";
const VERIFY = "step/verify-repo-gate/STEP.md";
const OPERATING = "rule/shared-skill-operating-baseline.md";

async function section(file: string, heading: string): Promise<string> {
  const text = flat(sectionOf(await readShipped(file), heading));
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

describe("qfai-atdd in a workflow run", () => {
  // QFAI:AC-0001-0204-01
  // QFAI:EX-0001-0204-01
  it("works only the bound flow's BF and AC items, gated by that flow, and hands over otherwise", async () => {
    const entry = sectionOf(await readShipped(OPERATING), "## Workflow Run Entry Check");
    expect(rowOf(entry, "| `pass-on`")).toMatch(/Edit nothing\. Pass the request to `qfai-run`/);
    expect(rowOf(entry, "| `worker`")).toMatch(/Check the run, stage and work-order IDs/);
    const reads = await section(SCAFFOLD, "## Reads");
    expect(reads).toMatch(/the work order's `target` names it, and no question asks which flow/i);
    const procedure = await section(SCAFFOLD, "## Procedure");
    expect(procedure).toMatch(/npx qfai validate --profile atdd --flow BF-NNNN --fail-on error/);
    expect(procedure).toMatch(
      /the tests to write are the BF and AC items of the work order's `obligations` that no test annotates/i,
    );
  });

  // QFAI:AC-0001-0204-03
  // QFAI:EX-0001-0204-03
  it("reports expected_red only for a failure at the assertion", async () => {
    const text = sectionOf(await readShipped(AUTHOR), "### RED at the assertion");
    expect(rowOf(text, "`assertion`")).toMatch(/`expected_red`/);
    for (const kind of ["collection", "import", "startup", "timeout"]) {
      expect(rowOf(text, `\`${kind}\``), kind).toMatch(/`unrun` or `blocked`/);
    }
    expect(flat(text)).toMatch(/a failure of any kind but `assertion` is never `expected_red`/i);
  });

  // QFAI:AC-0001-0204-04
  // QFAI:EX-0001-0204-04
  it("hands findings another flow owns on as debts, each with its flow and owner", async () => {
    const text = await section(AUTHOR, "## Findings another flow owns");
    expect(text).toMatch(
      /returns outcome `accepted_with_debt`, with one `debts` entry per finding/i,
    );
    expect(text).toMatch(/naming its `owningFlow` and its `resolvingOwner`/i);
    expect(text).toMatch(/a finding with no named owner is not handed on as a debt/i);
  });

  // QFAI:AC-0001-0204-05
  // QFAI:EX-0001-0204-05
  it("asks for a seam and takes RED in the same stage instance, inside the run", async () => {
    const text = await section(AUTHOR, "### The seam round trip");
    expect(text).toMatch(/returned `needs_repair` with a seam request \(`seamRequest`\)/i);
    expect(text).toMatch(/the same acceptance stage instance runs as a new attempt and takes RED/i);
    expect(text).toMatch(/only then is the full implementation handed on/i);
    expect(text).toMatch(/no second run starts/i);
    const procedure = await section(AUTHOR, "## Procedure");
    expect(procedure).toMatch(
      /`\.qfai\/assistant\/skill\/qfai-atdd\/references\/red-provenance\.md`/,
    );
  });

  // QFAI:AC-0001-0204-06
  // QFAI:EX-0001-0204-06
  it("decides each layer from the current story tree, never from the snapshot", async () => {
    const text = await section(SCAFFOLD, "## Procedure");
    expect(text).toMatch(
      /decide the layer each obligation needs from the current story tree, at every stage start/i,
    );
    expect(text).toMatch(/reused only for the inputs it covers, never for this decision/i);
    expect(text).toMatch(/an EX belongs to `\/qfai-implement`/i);
  });

  // QFAI:AC-0001-0205-01
  // QFAI:EX-0001-0205-01
  it("keeps a test fix on the same annotated IDs, with a review and a re-run", async () => {
    const result = await section(TEST_FIX, "## Result");
    expect(result).toMatch(/names the IDs the test annotates before and after the fix/i);
    expect(result).toMatch(/`citedBefore`, `citedAfter`/);
    expect(result).toMatch(/the independent review \(`reviewRef`\) and the re-run \(`rerunRef`\)/i);
    const procedure = await section(TEST_FIX, "## Procedure");
    expect(procedure).toMatch(/it annotates the same IDs as before/i);
    expect(procedure).toMatch(/no story, contract or `decisions\.md` file changes/i);
    const writes = await section(TEST_FIX, "## Writes");
    expect(writes).toMatch(
      /the re-run, the proof and the grilling block in `\.qfai\/evidence\/atdd-BF-NNNN\.md`/i,
    );
  });

  // QFAI:AC-0001-0205-02
  // QFAI:EX-0001-0205-02
  it("returns a test fix that changes what is checked as needs_repair for qfai-sdd", async () => {
    const text = await section(TEST_FIX, "## Procedure");
    expect(text).toMatch(
      /a fix after which the expectation would check a different ID is not a test fix/i,
    );
    expect(text).toMatch(/return `needs_repair`/i);
    expect(text).toMatch(/with `qfai-sdd` as its `resolvingOwner`/i);
    expect(text).toMatch(/no accepted test fix is returned for it/i);
  });

  // QFAI:AC-0001-0205-03
  // QFAI:EX-0001-0205-03
  it("takes a test fix whose first matched ID is a BF or an AC, and leaves an EX", async () => {
    const text = await section(TEST_FIX, "## When it runs");
    expect(text).toMatch(/the first ID of its `matchedIds` is a BF or an AC/i);
    expect(text).toMatch(/an EX-layer test is `\/qfai-implement`'s/i);
  });
});

describe("qfai-verify in a workflow run", () => {
  // QFAI:AC-0001-0215-01
  // QFAI:EX-0001-0215-01
  it("names this run's verify.json and an independent qa-gatekeeper verdict", async () => {
    const text = await section(VERIFY, "## The stage result");
    expect(text).toMatch(
      /writes this run's `\.qfai\/report\/verify\.json` and names it in `artifactRefs`/i,
    );
    expect(text).toMatch(/the qa-gatekeeper verdict is a `reviewResults` entry/i);
    expect(text).toMatch(/independent of the authors of what it reviews/i);
    expect(text).toMatch(/`gateResults` are information only/i);
  });

  // QFAI:AC-0001-0215-02
  // QFAI:EX-0001-0215-02
  it("never names another run's or another flow's verify.json", async () => {
    const text = await section(VERIFY, "## The stage result");
    expect(text).toMatch(
      /written by another run, scoped to another flow or kept in a shared location is never named/i,
    );
  });

  // QFAI:AC-0001-0215-03
  // QFAI:EX-0001-0215-03
  it("reports outcome and test observation apart, and an unrun gate as unrun", async () => {
    const text = await section(VERIFY, "## The stage result");
    expect(text).toMatch(/`outcome` and `testObservation` are reported apart/i);
    expect(text).toMatch(/a required gate that did not run is reported `unrun`, never as a pass/i);
  });

  // QFAI:AC-0001-0215-04
  // QFAI:EX-0001-0215-04
  it("leaves verify.json unchanged inside a run", async () => {
    const text = await section(VERIFY, "## The stage result");
    expect(text).toMatch(/`verify\.json` itself is unchanged inside a run/i);
    expect(text).toMatch(/qfai-verify\/references\/verify-output-contract\.md`/);
    expect(text).toMatch(/the run's values stay in the stage result/i);
  });

  // QFAI:AC-0001-0215-05
  // QFAI:EX-0001-0215-05
  it("routes each finding it did not cause to its owner", async () => {
    const raw = sectionOf(await readShipped(VERIFY), "## Findings verify did not cause");
    const text = flat(raw);
    expect(text).toMatch(/verify edits no artifact another owner holds/i);
    expect(text).toMatch(/returns `needs_repair`, with the finding listed in `debts`/i);
    expect(rowOf(raw, "| A story or contract gap ")).toMatch(/`qfai-sdd`/);
    expect(rowOf(raw, "| An acceptance-test defect ")).toMatch(/`qfai-atdd`/);
    expect(rowOf(raw, "| An implementation defect ")).toMatch(/`qfai-implement`/);
    expect(text).toMatch(/these three are the only repairs verify routes/i);
  });

  // QFAI:EX-0001-0215-06
  it("blocks on a missing environment with the operator as the one who clears it", async () => {
    const text = await section(VERIFY, "## A missing environment");
    expect(text).toMatch(/returns the stage `blocked`, with the blocker `stage-blocked`/i);
    expect(text).toMatch(/`operator` as the one who clears it/i);
    expect(text).toMatch(/no debt is listed for it, and no repair is routed/i);
  });

  // QFAI:AC-0001-0215-06
  // QFAI:EX-0001-0215-07
  it("runs only the work order's gates and hands over a request with no work order", async () => {
    const entry = sectionOf(await readShipped(OPERATING), "## Workflow Run Entry Check");
    expect(rowOf(entry, "| `pass-on`")).toMatch(/Edit nothing\. Pass the request to `qfai-run`/);
    expect(rowOf(entry, "| `worker`")).toMatch(/then do only that work/);
    const steps = await section(OPERATING, "### A work order's steps");
    expect(steps).toMatch(
      /runs the steps the work order names, in its `steps:` list, and no other/i,
    );
  });
});
