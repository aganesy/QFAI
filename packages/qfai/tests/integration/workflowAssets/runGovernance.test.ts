/**
 * Integration: the shared rules a workflow run relies on, as the shipped assistant tree states them.
 *
 * The stage-skill entry check, what authorizes a run's work, how each autopilot bucket is satisfied
 * inside a run, Stage 0 reuse, reviewer independence, routes against change types,
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
  // QFAI:AC-0001-0195-01
  // QFAI:EX-0001-0195-01
  it("hands a request with no name and no work order to qfai-run, editing nothing", async () => {
    const passOn = rowOf(await entryCheck(), "`pass-on`");
    expect(passOn).toMatch(/`active`/);
    expect(passOn).toMatch(/neither invoked by name nor run by `qfai-run`/i);
    expect(passOn).toMatch(/edit nothing/i);
    expect(passOn).toMatch(/pass the request to `qfai-run` in the same turn/i);
    expect(passOn).toMatch(/at most one line, and no explanation of modes or stages/i);
  });

  // QFAI:EX-0001-0195-02
  it("runs no entry check under off or shadow", async () => {
    const off = rowOf(await entryCheck(), "`off`");
    expect(off).toMatch(/`off` or `shadow`/);
    expect(off).toMatch(/no entry check\. behave as when invoked by name/i);
  });

  // QFAI:AC-0001-0195-03
  // QFAI:EX-0001-0195-05
  // QFAI:EX-0001-0195-06
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
  // QFAI:AC-0001-0163-04
  // QFAI:EX-0001-0163-04
  it("never counts an author as its own reviewer, and drops no required reviewer", async () => {
    const text = await passage(DELEGATION, "## Reviewer independence");
    expect(text).toMatch(
      /authored or recommended an artifact never counts as that artifact's independent reviewer/i,
    );
    expect(text).toMatch(/no required reviewer is dropped to save tokens/i);
    expect(text).toMatch(/a required review that cannot be delegated stops the stage/i);
  });

  it("gives the two entry skills a reviewer remit", async () => {
    const remit = sectionOf(await readShipped(DELEGATION), "### Reviewer remit");
    expect(rowOf(remit, "`/qfai-maintain`")).toMatch(/changes no behaviour/i);
    expect(rowOf(remit, "`/qfai-run`")).toMatch(/the artifacts the session writes/i);
  });

  // QFAI:AC-0001-0002-02
  // QFAI:EX-0001-0002-07
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
