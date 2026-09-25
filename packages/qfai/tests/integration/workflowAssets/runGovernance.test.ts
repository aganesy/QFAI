/**
 * Integration: the shared rules a workflow run relies on, as the shipped assistant tree states them.
 *
 * The stage-skill entry check, what authorizes a run's work, how each autopilot bucket is satisfied
 * inside a run, Stage 0 reuse, actor history and grilling in a run, routes against change types,
 * and the drift protocol's bugfix case. Each is stated once, in a rule file; the workflow core's
 * own checks are not this module's.
 */
import { describe, expect, it } from "vitest";

import { flat, readShipped, rowOf, sectionOf } from "../../helpers/shippedAssistant.js";

const OPERATING = "rule/shared-skill-operating-baseline.md";
const DELEGATION = "rule/shared-skill-delegation-baseline.md";

async function entryCheck(): Promise<string> {
  return sectionOf(await readShipped(OPERATING), "## Workflow Run Entry Check");
}

async function passage(file: string, heading: string): Promise<string> {
  const text = flat(sectionOf(await readShipped(file), heading));
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

describe("the stage-skill entry check", () => {
  // QFAI:AC-0001-0202-01
  // QFAI:EX-0001-0202-01
  it("hands a request with no name and no work order to qfai-run, editing nothing", async () => {
    const passOn = rowOf(await entryCheck(), "`pass-on`");
    expect(passOn).toMatch(/`active`/);
    expect(passOn).toMatch(/neither invoked by name nor handed a QFAI work order/i);
    expect(passOn).toMatch(/edit nothing/i);
    expect(passOn).toMatch(/pass the request to `qfai-run` in the same turn/i);
    expect(passOn).toMatch(/at most one line, and no explanation of modes or stages/i);
  });

  // QFAI:EX-0001-0202-02
  it("runs no entry check under off or shadow", async () => {
    const off = rowOf(await entryCheck(), "`off`");
    expect(off).toMatch(/`off` or `shadow`/);
    expect(off).toMatch(/no entry check\. behave as when invoked by name/i);
  });

  // QFAI:AC-0001-0202-02
  // QFAI:EX-0001-0202-03
  it("does only the work of a matching work order and says nothing to the operator", async () => {
    const worker = rowOf(await entryCheck(), "`worker`");
    expect(worker).toMatch(/matches an issued one/i);
    expect(worker).toMatch(/check the run, stage and work-order IDs, then do only that work/i);
    expect(worker).toMatch(/say nothing to the operator/i);
  });

  // QFAI:EX-0001-0202-04
  it("edits nothing and returns the refusal for a work order that matches no issued one", async () => {
    const mismatch = rowOf(await entryCheck(), "`error`");
    expect(mismatch).toMatch(/matches no issued one/i);
    expect(mismatch).toMatch(/edit nothing, and return the refusal to the harness/i);
  });

  // QFAI:AC-0001-0202-03
  // QFAI:EX-0001-0202-05
  // QFAI:EX-0001-0202-06
  it("runs a stage invoked by name standalone and hands a request to go to the end to a run", async () => {
    const byName = rowOf(await entryCheck(), "`by-name`");
    expect(byName).toMatch(/run standalone and end at this stage/i);
    expect(byName).toMatch(/start no other stage/i);
    expect(byName).toMatch(
      /a request to take the work to the end becomes a whole run: pass it to `qfai-run`/i,
    );
  });
});

describe("governance inside a run", () => {
  // QFAI:AC-0001-0004-03
  // QFAI:EX-0001-0004-06
  it("states request authority and the work order's binding, excepting no article", async () => {
    const text = await passage(OPERATING, "### What authorizes a run's work");
    expect(text).toMatch(/the operator's first explicit request authorizes the run's work/i);
    expect(text).toMatch(/within the scope the checked route allows/i);
    expect(text).toMatch(
      /a QFAI work order binds the stage to its target: one business flow, or one new-story slot/i,
    );
    expect(text).toMatch(/these statements add to the constitution\. they except no article/i);
  });

  // QFAI:AC-0001-0004-04
  // QFAI:EX-0001-0004-07
  it("keeps the workflow routes apart from the Change Type", async () => {
    const workflow = flat(await readShipped("rule/workflow.md"));
    expect(workflow).toMatch(/the workflow routes are orthogonal to the Change Type/i);
    expect(workflow).toMatch(/`direct`, `bugfix`, `bounded-change`, `feature` or\s*`discovery`/);
    expect(workflow).toMatch(/neither selects the other, and a run declares both/i);
  });

  // QFAI:AC-0001-0004-02
  // QFAI:EX-0001-0004-03
  // QFAI:EX-0001-0004-04
  // QFAI:EX-0001-0004-05
  it("reuses Stage 0 output only on an equal recomputed key, and never outside a run", async () => {
    const stage0 = sectionOf(await readShipped(OPERATING), "## Stage 0");
    const text = flat(sectionOf(stage0, "### Inside a workflow run"));
    expect(text, "the Stage 0 section has ### Inside a workflow run").not.toBe("");
    expect(text).toMatch(/only when the key recorded with it, recomputed, is equal/i);
    expect(text).toMatch(/on a different key, refresh only what changed/i);
    for (const covered of [
      /the tool digest/i,
      /`qfai\.config\.yaml` and `\.qfai\/assistant\/rule\/\*\*`/,
      /the skill digests/i,
      /the input file digests/i,
      /glob membership/i,
      /the host capability state/i,
    ]) {
      expect(text).toMatch(covered);
    }
    expect(text).toMatch(/no stage-specific check is served from that output/i);
    expect(text).toMatch(/outside a run, Stage 0 runs in full at every stage start/i);
  });

  // QFAI:AC-0001-0175-02
  // QFAI:EX-0001-0175-02
  it("maps each autopilot bucket to the authorization that satisfies it, and --auto to none", async () => {
    const text = await passage(OPERATING, "## Default Autopilot Policy inside a run");
    expect(text).toMatch(
      /an `ask-user` item is satisfied only by a `human_decision` that answers it/i,
    );
    expect(text).toMatch(
      /a `hard-required` input is satisfied by `request_scope` or by the run's binding/i,
    );
    expect(text).toMatch(/an `auto-decide` item needs no authorization/i);
    expect(text).toMatch(/`--auto` satisfies nothing/i);
  });

  // QFAI:AC-0001-0175-03
  // QFAI:EX-0001-0175-03
  it("counts the run's flow binding as the supplied flow, and stops a direct call with none", async () => {
    const text = await passage(OPERATING, "## Default Autopilot Policy inside a run");
    expect(text).toMatch(/a business flow that a run's valid binding supplies counts as supplied/i);
    expect(text).toMatch(/the skill does not ask for it/i);
    expect(text).toMatch(/with no binding, the flow stays `hard-required`/i);
    expect(text).toMatch(/a direct invocation with no flow it can resolve stops at preflight/i);
  });

  // QFAI:AC-0001-0169-04
  // QFAI:EX-0001-0169-04
  it("carries the actor history and never counts an author as its own reviewer", async () => {
    const text = await passage(DELEGATION, "### Actor history in a run");
    expect(text).toMatch(/travels with every work order, in its `actorHistory` field/i);
    expect(text).toMatch(
      /author or recommender of an artifact never counts as that artifact's independent reviewer/i,
    );
    expect(text).toMatch(/no required reviewer is dropped to save tokens/i);
  });

  // QFAI:AC-0001-0169-05
  // QFAI:EX-0001-0169-05
  it("limits grilling in a run to the remaining frontier and invokes no qfai-grill", async () => {
    const text = await passage(DELEGATION, "### Grilling in a run");
    expect(text).toMatch(/takes what the work order's `settled` field records as settled/i);
    expect(text).toMatch(/works only the remaining frontier/i);
    expect(text).toMatch(/split between user sessions and delegated sessions/i);
    expect(text).toMatch(/no run invokes `qfai-grill`/i);
  });

  it("gives the two entry skills a reviewer remit", async () => {
    const remit = sectionOf(await readShipped(DELEGATION), "### Reviewer remit");
    expect(rowOf(remit, "`/qfai-maintain`")).toMatch(/changes no behaviour/i);
    expect(rowOf(remit, "`/qfai-run`")).toMatch(/it writes no artifact/i);
  });

  // QFAI:AC-0001-0002-02
  // QFAI:EX-0001-0002-12
  it("appends no change request for a bugfix that changes no protected file", async () => {
    const drift = flat(await readShipped("rule/drift-protocol.md"));
    expect(drift).toMatch(
      /a bugfix whose diff changes no file under `01_policy\/`, `02_business-flow\/` or paths\.contractsDir appends no `Change request:` row/i,
    );
    expect(drift).toMatch(
      /a row naming a story file the bugfix did not touch would state an upstream change that did not happen/i,
    );
  });
});
