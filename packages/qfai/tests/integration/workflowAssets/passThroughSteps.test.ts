/**
 * Integration: what the shipped steps say about passing with evidence, the verify steps a route
 * adds, and what the routes ask of `sdd-triage` and the review cycle.
 *
 * Reads the shipped step files and `assets/defaults/`. Whether `accept` takes a pass is the
 * workflow core's, not this module's.
 */
import { describe, expect, it } from "vitest";

import { loadBuiltInPlans } from "../../../src/core/workflow/plans.js";
import {
  defaultRoutingEntries,
  flat,
  frontMatterOf,
  readShipped,
  sectionOf,
} from "../../helpers/shippedAssistant.js";

/** Every step a plan may mark pass-through. */
const PASS_THROUGH = [
  "sdd-flow",
  "sdd-contract",
  "sdd-cycle",
  "sdd-story",
  "common-design-md",
  "discussion-pack",
  "discussion-uiux",
  "triage-investigate",
  "implement-bisect",
  "implement-minimize",
  "implement-scaffold",
  "implement-tdd",
  "implement-credentials",
  "implement-sweep",
  "implement-test-fix",
  "maintain-edit",
  "verify-change-note",
];

async function passesWhen(step: string): Promise<string> {
  return flat(sectionOf(await readShipped(`step/${step}/STEP.md`), "## Passes when"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

describe("a step that may pass with evidence", () => {
  // QFAI:AC-0001-0216-04
  // QFAI:EX-0001-0216-08
  it("states what it reads first and what shows it has nothing to write", async () => {
    for (const step of PASS_THROUGH) {
      const text = await passesWhen(step);
      expect(text, `${step} has a Passes when section`).not.toBe("");
      expect(text, `${step}: what it reads first`).toMatch(/Read first: /);
      expect(text, `${step}: when it passes`).toMatch(/\bthe step passes\b/i);
      expect(text, `${step}: what the pass names`).toMatch(/the pass names|naming that ID/i);
    }
    expect(await passesWhen("verify-change-note")).toMatch(
      /nothing a user sees changed; - the project keeps no changelog/i,
    );
    expect(await passesWhen("maintain-edit")).toMatch(
      /the step passes when no document the change makes wrong exists/i,
    );
    const baseline = flat(
      sectionOf(
        await readShipped("rule/shared-skill-operating-baseline.md"),
        "### A pass-through step",
      ),
    );
    expect(baseline).toMatch(/always runs/i);
    expect(baseline).toMatch(
      /writes nothing and states why; the stage's review reads that statement/i,
    );
    expect(baseline).toMatch(/a pass is not a skip/i);
  });

  // QFAI:AC-0001-0216-04
  // QFAI:EX-0001-0216-07
  it("lets sdd-story pass in an sdd stage when the change stays in the documents that own the truth", async () => {
    const text = await passesWhen("sdd-story");
    expect(text).toMatch(/passes in two cases, and the pass names both facts it rests on/i);
    expect(text).toMatch(
      /in an append stage\*\*, when an existing example already states the case the diagnosis matched/i,
    );
    expect(text).toMatch(
      /in an `sdd` stage\*\*, when the change stays inside the documents that own the truth, as `sdd-triage` recorded the owner, and adds and changes no example/i,
    );
    expect(text).toMatch(
      /the pass names the owning document and says that no example is added or changed/i,
    );
    const triage = flat(
      sectionOf(await readShipped("step/sdd-triage/STEP.md"), "## Which surface owns the truth"),
    );
    expect(triage).toMatch(/record the owner/i);
  });

  // QFAI:AC-0001-0186-01
  // QFAI:EX-0001-0186-11
  it("lets sdd-story pass in an append stage citing the example that states the case, and has implement-tdd test it", async () => {
    expect(await passesWhen("sdd-story")).toMatch(
      /the pass cites that example, and no row is appended to `decisions\.md`/i,
    );
    expect(flat(await readShipped("step/implement-tdd/STEP.md"))).toMatch(
      /an EX that states the case is worked as an EX no test annotates/i,
    );
  });

  // QFAI:AC-0001-0216-01
  // QFAI:EX-0001-0216-01
  it("runs add-feature's sdd-flow, common-design-md and sdd-cycle every time, and has the review read why each wrote nothing", async () => {
    const plan = (await loadBuiltInPlans()).find((each) => each.route === "add-feature");
    const marked = (plan?.stages ?? [])
      .flatMap((stage) => stage.steps)
      .filter((step) => ["sdd-flow", "common-design-md", "sdd-cycle"].includes(step.name));
    expect(marked.map((step) => [step.name, step.passThrough])).toEqual([
      ["sdd-flow", true],
      ["common-design-md", true],
      ["sdd-cycle", true],
    ]);
    for (const step of ["sdd-flow", "common-design-md", "sdd-cycle"]) {
      expect(await passesWhen(step), step).toMatch(/Read first: /);
    }
    const baseline = flat(
      sectionOf(
        await readShipped("rule/shared-skill-operating-baseline.md"),
        "### A pass-through step",
      ),
    );
    expect(baseline).toMatch(
      /writes nothing and states why; the stage's review reads that statement/i,
    );
  });

  // QFAI:AC-0001-0216-04
  // QFAI:EX-0001-0216-09
  it("lets implement-scaffold pass when every BF and AC already has its test, and write the missing one otherwise", async () => {
    const plan = (await loadBuiltInPlans()).find((each) => each.route === "apply-settled");
    const scaffold = plan?.stages
      .flatMap((stage) => stage.steps)
      .find((step) => step.name === "implement-scaffold");
    expect(scaffold?.passThrough).toBe(true);
    expect(await passesWhen("implement-scaffold")).toMatch(
      /the step passes when every one already has an annotating test at its layer/i,
    );
    const procedure = flat(
      sectionOf(await readShipped("step/implement-scaffold/STEP.md"), "## Procedure"),
    );
    expect(procedure).toMatch(
      /for each story with an acceptance criterion no test annotates, run `npx qfai atdd scaffold --story US-NNNN-NNNN`/i,
    );
    expect(procedure).toMatch(/the command never overwrites an existing test/i);
  });

  it("leaves no step with a skip condition a plan predicate decided", async () => {
    for (const step of PASS_THROUGH) {
      const text = await readShipped(`step/${step}/STEP.md`);
      expect(sectionOf(text, "## Skipped when"), step).toBe("");
      expect(text, step).not.toMatch(/when: proposed/);
    }
  });
});

describe("the verify steps a route adds", () => {
  it("gives each its review profile and a routing entry that names it", async () => {
    const profiles: Record<string, string> = {
      "verify-change-note": "default",
      "verify-repeat-run": "default",
      "verify-external": "default",
      "verify-manual": "default",
      "verify-advisory": "default",
      "verify-release-notes": "default",
    };
    const routing = await defaultRoutingEntries();
    for (const [step, profile] of Object.entries(profiles)) {
      const front = frontMatterOf(await readShipped(`step/${step}/STEP.md`));
      expect(front.owner, step).toBe("qfai-verify");
      expect(front["routing-profile"], step).toBe(profile);
      const entry = routing.filter(isRecord).find((each) => each.step === step);
      expect(entry?.review_profile, step).toBe(profile);
    }
  });

  it("publishes, tags and sends nothing", async () => {
    const advisory = flat(await readShipped("step/verify-advisory/STEP.md"));
    expect(advisory).toMatch(/nothing was published, requested or sent/i);
    const notes = flat(await readShipped("step/verify-release-notes/STEP.md"));
    expect(notes).toMatch(/no tag, publication or version edit was made/i);
    const note = flat(await readShipped("step/verify-change-note/STEP.md"));
    expect(note).toMatch(/never names a version, adds a release heading/i);
    const external = flat(await readShipped("step/verify-external/STEP.md"));
    expect(external).toMatch(/the step sends nothing itself/i);
  });
});

describe("what the routes ask of sdd-triage and the review cycle", () => {
  // QFAI:AC-0001-0215-02
  // QFAI:EX-0001-0215-08
  it("has sdd-triage decide the owner, wire or retire, and stop outside a settled record", async () => {
    const text = await readShipped("step/sdd-triage/STEP.md");
    const owner = flat(sectionOf(text, "## Which surface owns the truth"));
    expect(owner).toMatch(/an in-force `decisions\.md` row that settles it/i);
    expect(owner).toMatch(/the surface that does not own the truth is the one that changes/i);
    const inert = flat(sectionOf(text, "## A mechanism nothing runs"));
    expect(inert).toMatch(/report `branch: \{ outcome: retire \}`/);
    const settled = flat(sectionOf(text, "## Settled mode"));
    expect(settled).toMatch(/`mode: settled`/);
    expect(settled).toMatch(/write nothing, and report `branch: \{ outcome: outside-record \}`/i);
    const point = flat(sectionOf(text, "## At a decision point"));
    expect(point).toMatch(/`adopted` as `\{ step, decision, reason \}`/);
    expect(point).toMatch(/return `awaiting_input` and change nothing/i);
    expect(point).toMatch(/raises `gate:user` through `raise`/i);
  });
});
