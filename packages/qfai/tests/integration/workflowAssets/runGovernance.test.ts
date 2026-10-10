/**
 * Integration: the shared rules a workflow run relies on, as the shipped assistant tree states them.
 *
 * The stage-skill entry check, what authorizes a run's work, how each autopilot bucket is satisfied
 * inside a run, reviewer independence, routes against change types,
 * and the drift protocol's bugfix case. Each is stated once, in a rule file; the workflow core's
 * own checks are not this module's.
 */
import { describe, expect, it } from "vitest";

import { flat, readShipped, rowOf, sectionOf } from "../../helpers/shippedAssistant.js";

const OPERATING = "rule/shared-skill-operating-baseline.md";
const DELEGATION = "rule/shared-skill-delegation-baseline.md";
const RUN = "skill/qfai-run/SKILL.md";
const EXTRACTION = "skill/qfai-run/references/extraction.md";
const SCREENS = "skill/qfai-run/references/operator-screens.md";
const TARGETS = "## Independent targets under one goal";

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
  // QFAI:EX-0001-0196-57
  it("runs /qfai-implement and /qfai-sdd invoked by name standalone, each stopping at its own stage", async () => {
    const byName = rowOf(await entryCheck(), "`by-name`");
    const implement = flat(await readShipped("skill/qfai-implement/SKILL.md"));
    const sdd = flat(await readShipped("skill/qfai-sdd/SKILL.md"));
    expect(byName).toMatch(/run standalone and end at this stage/i);
    expect(byName).toMatch(/start no other stage/i);
    expect(implement).toMatch(/`implement-scaffold`.*the flow's missing acceptance tests/i);
    expect(implement).toMatch(/`implement-tdd`.*every owed example, red, green, refactor/i);
    expect(implement).toMatch(
      /ask for the next action only when proceeding requires the user's answer|when the next step needs the user's answer,? ask a question listing the next actions/i,
    );
    expect(implement).toMatch(/completion-only reports? (?:needs? no question|ask nothing)/i);
    expect(implement).toMatch(/under a no-question mode, list (?:any )?remaining actions instead/i);
    expect(sdd).toMatch(/`sdd-story`.*stories, gherkin ac and ex/i);
    expect(sdd).toMatch(
      /invoked by name, `\/qfai-sdd` runs standalone, ends at sdd and creates no run/i,
    );
  });

  // QFAI:AC-0001-0195-03
  // QFAI:EX-0001-0195-06
  it("hands a by-name request to take the change to the end to qfai-run as a whole run", async () => {
    const byName = rowOf(await entryCheck(), "`by-name`");
    const sdd = flat(await readShipped("skill/qfai-sdd/SKILL.md"));
    expect(byName).toMatch(
      /a request to take the work to the end becomes a whole run: pass it to `qfai-run`/i,
    );
    expect(byName).toMatch(/start no other stage/i);
    expect(sdd).toMatch(
      /invoked by name, `\/qfai-sdd` runs standalone, ends at sdd and creates no run/i,
    );
    expect(sdd).toMatch(/a request to go to the end is handed to a whole run through `qfai-run`/i);
  });
});

describe("governance inside a run", () => {
  // QFAI:AC-0001-0004-04
  // QFAI:EX-0001-0004-07
  it("keeps the workflow routes apart from the Change Type", async () => {
    const workflow = flat(await readShipped("rule/workflow.md"));
    expect(workflow).toMatch(/the workflow routes are orthogonal to the Change Type/i);
    expect(workflow).toMatch(
      /such as `fix-defect`, `add-feature` or `edit-text`, says which stages run/,
    );
    expect(workflow).toMatch(/neither selects the other, and a change declares both/i);
    expect(workflow).toMatch(
      /a `fix-defect` change may declare `Behavior`, and an `add-feature` change `Structural`/,
    );
    expect(workflow).toMatch(/no route maps to a Change Type/i);
    expect(workflow).toMatch(/no route declares a Change Type/i);
    expect(workflow).not.toMatch(/Do not proceed without a declared Change Type/i);
  });

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
    const remit = sectionOf(
      await readShipped("rule/references/reviewer-remit.md"),
      "## Reviewer remit",
    );
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

describe("independent targets under one goal", () => {
  // QFAI:AC-0001-0224-07
  // QFAI:EX-0001-0224-09
  it("extracts and plans each settled target separately, including newly eligible targets", async () => {
    const kinds = await passage(RUN, "## Request kinds");
    expect(kinds).toMatch(
      /(?:goal.*independent targets|independent targets.*goal).*references\/operator-screens\.md/i,
    );
    expect(kinds).toMatch(/before planning.*switching.*wait/i);
    const extraction = await passage(EXTRACTION, "## Procedure");
    expect(extraction).toMatch(
      /settled independent scopes.*extract each target separately.*planner/i,
    );
    expect(extraction).toMatch(/newly eligible target.*goal's selection criteria.*own extraction/i);
    const targets = await passage(SCREENS, TARGETS);
    expect(targets).toMatch(/plan each target separately.*scope is settled and independent/i);
    expect(targets).toMatch(
      /keep each plan's scope, stage order, steps, review and release points/i,
    );
    expect(targets).toMatch(/newly eligible targets.*goal's criteria.*own plans/i);
    expect(targets).toMatch(/out-of-scope finding.*follow-up.*never as an extra step/i);
    expect(targets).toMatch(
      /no planned stage.*(?:needed|required|needs|requires).*(?:stop|halt).*target.*owner/i,
    );
    expect(targets).toMatch(/owner.*stage skill.*invoke/i);
  });

  // QFAI:AC-0001-0224-07
  // QFAI:EX-0001-0224-10
  it("keeps unmet prerequisites and unsettled mixed findings on their existing paths", async () => {
    const extraction = await passage(EXTRACTION, "## Procedure");
    expect(extraction).toMatch(/do not infer independence.*prerequisite is unfinished/i);
    expect(extraction).toMatch(/unsettled mixed findings.*bundle\/decomposition handling/i);
    expect(extraction).toMatch(/goal is not a new intent/i);
    const targets = await passage(SCREENS, TARGETS);
    expect(targets).toMatch(/target with an unfinished prerequisite waits/i);
    expect(targets).toMatch(
      /mixed findings with unsettled scopes.*existing bundle\/decomposition handling/i,
    );
  });

  // QFAI:AC-0001-0224-08
  // QFAI:EX-0001-0224-11
  it("switches a shared checkout only after writers and gates finish and all files are clean", async () => {
    const targets = await passage(SCREENS, TARGETS);
    expect(targets).toMatch(
      /before changing the shared checkout.*wait for every writer and local gate/i,
    );
    expect(targets).toMatch(/preserve target edits.*permitted commit of only its paths/i);
    expect(targets).toMatch(/whole index and worktree are clean/i);
    expect(targets).toMatch(
      /CI-only pending gates.*DELEGATED commit allowance.*only under explicit user instruction or project policy/i,
    );
    expect(targets).toMatch(/wait never authorizes an early commit or skipped gate/i);
  });

  // QFAI:AC-0001-0224-08
  // QFAI:EX-0001-0224-12
  it("blocks dirty or live-checkout work but permits a bounded fixed-blob read-only review", async () => {
    const targets = await passage(SCREENS, TARGETS);
    expect(targets).toMatch(/unknown dirty files postpone the switch/i);
    expect(targets).toMatch(/do not stash, reset or delete them/i);
    expect(targets).toMatch(
      /reviewer using live files or (?:local|checkout-dependent) execution must finish/i,
    );
    expect(targets).toMatch(
      /read-only reviewer using only `git show <fixed SHA>:<path>`.*may continue across a clean orchestrator switch/i,
    );
    expect(targets).toMatch(/reviewer never switches the checkout/i);
    const delegation = await passage(DELEGATION, "### Orchestrator Protocol");
    expect(delegation).toMatch(/each reviewer.*fixed commit/i);
    expect(delegation).toMatch(/only read-only fixed-SHA `git show` reviews.*clean switches/i);
    expect(delegation).toMatch(
      /writers, local gates.*reviews using live files or checkout-dependent execution.*finish first/i,
    );
    expect(delegation).toMatch(
      /read-only agent never runs `git checkout` or `git switch`.*shares/i,
    );
    expect(delegation).toMatch(/reads other revisions with `git show <rev>:<path>`/i);
  });

  // QFAI:AC-0001-0224-09
  // QFAI:EX-0001-0224-13
  it("resumes only with the target's exact head and retains pending, red and review evidence honestly", async () => {
    const targets = await passage(SCREENS, TARGETS);
    expect(targets).toMatch(/existing stage reports and handoff messages.*each target's/i);
    expect(targets).toMatch(
      /plan and scope, stage and step, branch and exact head, evidence, open approval or blocker, and resume condition/i,
    );
    expect(targets).toMatch(/report waiting targets as waiting/i);
    expect(targets).toMatch(/before writing or using a result, confirm its target and head/i);
    expect(targets).toMatch(
      /green check for an older or different head does not pass the current one/i,
    );
    expect(targets).toMatch(/pending checks do not complete verification/i);
    expect(targets).toMatch(/matching red check resumes the planned gate and its fix procedure/i);
    expect(targets).toMatch(
      /review verdict bound to the commit reviewed.*never relabel it as a review of a newer head/i,
    );
    expect(targets).toMatch(/never.*add a review the plan does not name/i);
  });

  // QFAI:AC-0001-0224-10
  // QFAI:EX-0001-0224-14
  it("uses actual standing authority for its covered targets without fabricating approval", async () => {
    const targets = await passage(SCREENS, TARGETS);
    expect(targets).toMatch(
      /standing delegation only for the targets and actions it actually covers/i,
    );
    expect(targets).toMatch(/routine choices as the agent's decisions under that authority/i);
    expect(targets).toMatch(
      /(?:do not|never|without).*?(?:attribute|fabricat).*?(?:user|option).*?(?:approval|selection)|never as the user's (?:individual option )?(?:selection|approval)/i,
    );
    expect(targets).toMatch(/request to ask nothing supplies no uncovered approval/i);
  });

  // QFAI:AC-0001-0224-10
  // QFAI:EX-0001-0224-15
  it("stops only dependent target work for uncovered approval and stops all targets for a goal-wide stop", async () => {
    const targets = await passage(SCREENS, TARGETS);
    expect(targets).toMatch(
      /critical decision or release approval is missing.*stop that target before dependent work/i,
    );
    expect(targets).toMatch(/follow the existing question or no-question rules/i);
    expect(targets).toMatch(/other authorized independent work may continue/i);
    expect(targets).toMatch(/stop of the whole goal stops every target/i);
  });
});
