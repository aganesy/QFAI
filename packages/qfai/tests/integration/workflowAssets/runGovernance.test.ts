/**
 * Integration: the shared rules a workflow run relies on, as the shipped assistant tree states them.
 *
 * The stage-skill entry check, what authorizes a run's work, how each autopilot bucket is satisfied
 * inside a run, reviewer independence, routes against change types,
 * and the drift protocol's bugfix case. Each is stated once, in a rule file; the workflow core's
 * own checks are not this module's.
 */
import { describe, expect, it } from "vitest";

import {
  flat,
  readShipped,
  rowOf,
  sectionOf,
  shippedExists,
} from "../../helpers/shippedAssistant.js";

const OPERATING = "rule/shared-skill-operating-baseline.md";
const DELEGATION = "rule/shared-skill-delegation-baseline.md";
const RUN = "skill/qfai-run/SKILL.md";
const EXTRACTION = "skill/qfai-run/references/extraction.md";
const SCREENS = "skill/qfai-run/references/operator-screens.md";
const TARGETS = "## Independent targets under one goal";

const REACHED_OBSERVATIONS = "skill/qfai-run/references/reached-step-observations.md";

async function observedPassage(heading: string): Promise<string> {
  expect(shippedExists(REACHED_OBSERVATIONS), "the shipped reached-step guide exists").toBe(true);
  return passage(REACHED_OBSERVATIONS, heading);
}

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
      /CI-only pending gates.*DELEGATED commit allowance.*only under (?:explicit |a )user instruction or project policy/i,
    );
    expect(targets).toMatch(
      /(?:wait never authorizes an early commit|waiting alone never authorizes a commit) or skipped gate/i,
    );
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
  // QFAI:EX-0001-0224-16
  // QFAI:EX-0001-0224-17
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
    const finalReport = sectionOf(await readShipped(SCREENS), "## Final report");
    const receipt = flat(
      finalReport
        .split(/\r?\n(?=- )/)
        .find((paragraph) => paragraph.startsWith("- For a CI wait")) ?? "",
    );
    const contract = await readShipped("skill/qfai-verify/references/verify-output-contract.md");
    const verdictReceipt = flat(
      contract
        .split(/\r?\n\s*\r?\n/)
        .find((paragraph) => paragraph.startsWith("The stage report records")) ?? "",
    );
    const gateReport = sectionOf(await readShipped("step/verify-repo-gate/STEP.md"), "## Report");
    const gateReceipt = flat(
      gateReport
        .split(/\r?\n\s*\r?\n/)
        .find((paragraph) => paragraph.startsWith("For a `DELEGATED` gate")) ?? "",
    );
    for (const evidence of [receipt, verdictReceipt, gateReceipt]) {
      expect(evidence).toMatch(/target.*current head.*run ID or URL/i);
      expect(evidence).toMatch(/check.*actual outcome and counts.*blocker and resume condition/i);
      expect(evidence).toMatch(/(?:no run exists|no run yet means no result)/i);
    }
    expect(receipt).toMatch(
      /missing, red or mismatched evidence stops formal completion or merge/i,
    );
    expect(receipt).toMatch(/every required check.*actual passing evidence.*current head/i);
    expect(verdictReceipt).toMatch(/no result.*invent neither/i);
    expect(verdictReceipt).toMatch(/green.*actual passing evidence.*same target and head/i);
    expect(verdictReceipt).toMatch(/missing or mismatched evidence remains pending/i);
    expect(verdictReceipt).toMatch(/completion or merge.*every required check.*current head/i);
    expect(verdictReceipt).toMatch(/stage report.*summary.*add no verdict fields or states/i);
    expect(gateReceipt).toMatch(
      /another head does not pass this head.*missing or mismatched result remains pending/i,
    );
    expect(gateReceipt).toMatch(/keep earlier failures visible/i);
    const completion = flat(
      gateReport
        .split(/\r?\n\s*\r?\n/)
        .find((paragraph) => paragraph.startsWith("Name pending checks")) ?? "",
    );
    expect(completion).toMatch(
      /covered verification commit.*DELEGATED allowance.*does not complete verification/i,
    );
    expect(completion).toMatch(
      /formal completion or merge.*every required check.*current target and head/i,
    );
    expect(completion).toMatch(/pending, red, missing or mismatched evidence stops completion/i);
    expect(completion).toMatch(/existing fix procedure.*own covered authority/i);
    const publication = flat(
      finalReport
        .split(/\r?\n(?=- )/)
        .find((paragraph) => paragraph.startsWith("- Report repository outcome")) ?? "",
    );
    expect(publication).toMatch(/repository outcome separately from external publication/i);
    expect(publication).toMatch(/local commit is not a push or pull request/i);
    expect(publication).toMatch(
      /passing repository checks do not prove.*deployment.*package publication.*external effect/i,
    );
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

// QFAI:AC-0001-0224-09
describe("CI receipts qualify the target's verification evidence", () => {
  const GATE = "step/common-gate-run/STEP.md";
  const RECEIPT = ".qfai/assistant/step/common-gate-run/STEP.md#ci-evidence";
  const OUTPUT = "skill/qfai-verify/references/verify-output-contract.md";

  // QFAI:EX-0001-0224-20
  it("requires full execution identity and purpose instead of accepting a branch overview", async () => {
    const evidence = await passage(GATE, "## CI evidence");
    expect(evidence).toMatch(/branch overview.*not a formal verification receipt/i);
    expect(evidence).toMatch(/current full head SHA.*verification.*purpose/i);
    expect(evidence).toMatch(/workflow identity and name.*event.*run ID or URL.*run attempt/i);
    expect(evidence).toMatch(
      /job identity and name.*check identity and name.*status and conclusion/i,
    );
    expect(evidence).toMatch(
      /for test checks, actual test counts.*executed behavior.*job log or artifact/i,
    );
    expect(evidence).toMatch(/distinguish missing counts from zero executed tests/i);
    expect(evidence).toMatch(
      /for lint, build and other non-test checks, evidence of actual execution and results.*do not invent test counts for these checks/i,
    );
    expect(evidence).toMatch(
      /closed-pull-request cleanup purpose.*evidence.*closed.*selected for cleanup rather than verification/i,
    );
    expect(evidence).toMatch(
      /same head SHA and check name do not make two runs the same verification/i,
    );
    expect(evidence).toMatch(
      /`pull_request` event or later timestamp alone does not prove closed cleanup/i,
    );
    expect(evidence).toMatch(/confirmed closed cleanup SKIP.*neither.*behavioral PASS.*override/i);
    expect(evidence).toMatch(
      /matrix job skipped.*selection policy.*SKIP does not prove.*behavior ran/i,
    );
    expect(evidence).toMatch(/unavailable identity or purpose.*unknown and unverified/i);
    expect(evidence).toMatch(/remaining blocker and resume condition/i);
    expect(evidence).toMatch(
      /job IDs and check IDs separately where present.*record their absence/i,
    );
    expect(evidence).toMatch(/check\/job.*ambiguous.*unverified.*job and check are distinguished/i);
    expect(evidence).toMatch(
      /for a test check, if an actual reported run.*missing workflow, event, attempt, job, purpose, counts and logs remain unknown/i,
    );
    expect(evidence).toMatch(/unverified.*gaps as blockers.*synthetic rows do not fill them/i);
  });

  // QFAI:EX-0001-0224-18
  it("works through distinct verification and cleanup receipts without filling actual unknowns", async () => {
    const gate = await readShipped(GATE);
    const evidence = flat(sectionOf(gate, "## CI evidence"));
    expect(evidence).toMatch(
      /retain an identified successful verification.*target and head.*later run is confirmed closed cleanup.*SKIP does not replace it/i,
    );
    const example = sectionOf(gate, "### Synthetic worked example");
    const explanation = flat(example);
    expect(explanation).toMatch(/synthetic, not evidence from an actual repository/i);
    expect(explanation).toMatch(/they concern test checks for the required unit suite/i);
    expect(explanation).toMatch(
      /full head `a{40}`.*required verification `unit suite`.*check name `tests`/i,
    );
    const earlier = rowOf(example, "Earlier verification");
    const later = rowOf(example, "Later verification");
    const cleanup = rowOf(example, "Closed cleanup");
    expect(earlier).toMatch(/`71`.*`CI`.*`push`.*`91001`.*`1`.*`81001`.*`unit`.*`71001`.*`tests`/);
    expect(earlier).toMatch(
      /`completed`.*`success`.*29 passed.*0 failed.*29 unit tests executed.*unit-success[.]log/,
    );
    expect(later).toMatch(
      /`71`.*`CI`.*`workflow_dispatch`.*`91002`.*`2`.*`81002`.*`unit`.*`71002`.*`tests`/,
    );
    expect(later).toMatch(
      /same unit suite.*`completed`.*`failure`.*28 passed.*1 failed.*29 unit tests executed.*unit-failure[.]log/,
    );
    expect(cleanup).toMatch(
      /`72`.*`Cleanup`.*`pull_request`.*`91003`.*`3`.*`81003`.*`unit`.*`71003`.*`tests`/,
    );
    expect(cleanup).toMatch(
      /payload action.*`closed`.*target state is closed.*selection job log confirms cleanup only/i,
    );
    expect(cleanup).toMatch(
      /`completed`.*`skipped`.*0 executed.*no unit test coverage.*cleanup-selection[.]log.*no test log/i,
    );
    expect(explanation).toMatch(
      /verification remains FAIL.*cleanup SKIP neither clears it nor proves.*passed/i,
    );
    expect(explanation).toMatch(
      /for a test check, if an actual reported run.*missing workflow, event, attempt, job, purpose, counts and logs remain unknown/i,
    );
    expect(explanation).toMatch(/unverified.*gaps as blockers.*synthetic rows do not fill them/i);
  });

  // QFAI:EX-0001-0224-19
  it("keeps current-head failures authoritative and the receipt outside the closed verdict fields", async () => {
    const evidence = await passage(GATE, "## CI evidence");
    expect(evidence).toMatch(/green result for an old SHA does not verify the current head/i);
    expect(evidence).toMatch(
      /later failure.*same verification.*current head cannot be replaced by its older success/i,
    );
    expect(evidence).toMatch(
      /keep the failure visible until a matching verification actually passes/i,
    );
    expect(evidence).toMatch(/missing logs or unknown purpose leave execution unverified/i);
    expect(evidence).toMatch(
      /for test checks, missing counts or zero executed tests do not prove behavioral coverage/i,
    );
    expect(evidence).toMatch(
      /receipt details belong in the stage report.*do not add fields or states to `verify[.]json`/i,
    );
    const targets = await passage(SCREENS, TARGETS);
    expect(targets).toMatch(/matching red check resumes the planned gate and its fix procedure/i);
    const contract = await readShipped(OUTPUT);
    const report = await passage("step/verify-repo-gate/STEP.md", "## Report");
    for (const text of [flat(contract), report]) {
      expect(text).toContain(RECEIPT);
      expect(text).toMatch(/(?:keep|receipt).*stage report/i);
      expect(text).toMatch(
        /overview.*confirmed closed cleanup SKIP.*do(?:es)? not replace actual verification/i,
      );
    }
    const gateFields = contract.split("Each entry of `gates`")[1]?.split("A gate")[0] ?? "";
    const names = [...gateFields.matchAll(/^\| `(?<name>[^`]+)` +\|/gm)].map(
      (match) => match.groups?.name,
    );
    expect(names).toEqual(["status", "baseline", "reason", "check", "ci"]);
    expect(rowOf(gateFields, "`ci`")).toMatch(/`"green"`.*`"red"`.*`"pending"`/);
    expect(rowOf(gateFields, "`ci`")).not.toMatch(/unverified|skipped/i);
  });
});

// QFAI:AC-0001-0224-12
describe("reached-step observations in the existing report", () => {
  // QFAI:EX-0001-0224-33
  it("binds reached work and actual gate results to its owner, target and source", async () => {
    const comparison = await observedPassage("## The stage comparison");
    expect(comparison).toMatch(/existing stage report.*not a new schema/i);
    expect(comparison).toMatch(/plan step.*owner.*purpose.*target.*source identity/i);
    expect(comparison).toMatch(/actual input reads.*action or output.*artifact references/i);
    expect(comparison).toMatch(/applicable Gate observations/i);
    const gates = await observedPassage("## Gate observations");
    expect(gates).toMatch(/actual command.*purpose.*status.*observed result.*available exit/i);
    expect(gates).toMatch(/for test commands.*actual executed case counts/i);
    const entry = flat(await readShipped(RUN));
    const baseline = flat(await readShipped(OPERATING));
    expect(entry).toContain("references/reached-step-observations.md");
    expect(baseline).toContain("skill/qfai-run/references/reached-step-observations.md");
  });

  // QFAI:EX-0001-0224-34
  it("keeps a declaration or read receipt distinct from procedural evidence", async () => {
    const missing = await observedPassage("## Missing proof and observed omission");
    expect(missing).toMatch(
      /plan declaration.*content-read receipt.*neither.*execution.*understanding.*adherence/i,
    );
    expect(missing).toMatch(
      /missing evidence.*UNVERIFIED.*missing proof or blocker.*owner.*resume condition/i,
    );
    expect(missing).toMatch(/absence alone does not prove.*action was omitted/i);
  });

  // QFAI:EX-0001-0224-35
  it("does not use an unrelated green build to complete a design step", async () => {
    const binding = await observedPassage("## Purpose and source binding");
    expect(binding).toMatch(/unrelated green build.*cannot complete.*design step/i);
    expect(binding).toMatch(/required artifact.*procedural proof.*UNVERIFIED/i);
    expect(binding).toMatch(/owner.*resume condition/i);
  });

  // QFAI:EX-0001-0224-36
  it("reports positive omission evidence as incomplete rather than merely absent proof", async () => {
    const omission = await observedPassage("## Missing proof and observed omission");
    expect(omission).toMatch(/positive target-bound evidence.*required action was not performed/i);
    expect(omission).toMatch(/observed omission.*evidence.*incomplete/i);
    expect(omission).toMatch(/existing authorized owner procedure/i);
    expect(omission).toMatch(/do not add.*step.*route.*review.*gate/i);
  });

  // QFAI:EX-0001-0224-37
  it("records a reached no-write pass and its actual Passes when inputs", async () => {
    const pass = await observedPassage("## No-write passes");
    expect(pass).toMatch(/actual input reads.*source identity.*Passes when.*condition.*reason/i);
    expect(pass).toMatch(/step ran.*writing nothing.*not a skip/i);
    expect(pass).toMatch(/applicable Gate observations.*planned independent review/i);
  });

  // QFAI:EX-0001-0224-38
  it("compares only reached work before the selected stop or termination", async () => {
    const reach = await observedPassage("## Reach and termination");
    expect(reach).toMatch(
      /finite set.*whose turn was reached.*selected scope.*declared stop or termination/i,
    );
    expect(reach).toMatch(/excluded or unreached work.*neither.*omission.*completed/i);
    expect(reach).toMatch(/preserve.*order.*scope.*stop.*pass-through/i);
  });

  // QFAI:EX-0001-0224-39
  it("refuses wrong target, source or purpose before consuming proof or resuming writes", async () => {
    const binding = await observedPassage("## Purpose and source binding");
    expect(binding).toMatch(
      /check.*target.*source identity.*purpose.*before.*consuming evidence.*resuming writes/i,
    );
    expect(binding).toMatch(/wrong target.*old source.*wrong purpose.*UNVERIFIED/i);
    expect(binding).toMatch(/matching command name or totals.*not.*proof/i);
  });

  // QFAI:EX-0001-0224-40
  it("recovers existing receipts without repeating external actions to manufacture evidence", async () => {
    const recovery = await observedPassage("## Recover existing receipts safely");
    expect(recovery).toMatch(/inspect existing receipts.*recover.*target-bound proof/i);
    expect(recovery).toMatch(
      /do not repeat.*irreversible or external action.*manufacture evidence/i,
    );
    expect(recovery).toMatch(/unavailable.*safely.*blocker.*owner.*resume condition/i);
    expect(recovery).toMatch(/only genuinely owed work.*existing covered authority/i);
  });

  // QFAI:EX-0001-0224-41
  it("retains failed, unrun and pending commands without invented non-test counts", async () => {
    const gates = await observedPassage("## Gate observations");
    expect(gates).toMatch(/FAIL.*UNRUN.*pending.*cannot.*PASS/i);
    expect(gates).toMatch(/non-test commands.*no invented case counts/i);
    expect(gates).toMatch(/delegated transport.*not formal completion/i);
    expect(gates).toMatch(/artifact reference.*available.*outcome/i);
  });

  // QFAI:EX-0001-0224-42
  it("uses the already-planned independent review without an engine or new gate", async () => {
    const review = await observedPassage("## Existing review and limits");
    expect(review).toMatch(
      /already-planned independent reviewer.*reached work.*actual observations/i,
    );
    expect(review).toMatch(/unresolved proof.*without.*extra review or gate/i);
    expect(review).toMatch(/preserve.*reviewer independence.*count.*route.*plan order/i);
    expect(review).toMatch(
      /no engine.*command.*plan key.*runtime schema.*ledger.*automatic obedience detector/i,
    );
    expect(review).toMatch(/passing instruction fixture.*does not prove.*host.*adherence/i);
  });
});
