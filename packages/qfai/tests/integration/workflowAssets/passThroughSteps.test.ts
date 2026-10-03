/**
 * Integration: what the shipped steps say about passing with evidence, the verify steps a route
 * adds, and what the routes ask of `sdd-triage` and the review cycle.
 *
 * Reads the shipped step files and `assets/defaults/`. Whether `accept` takes a pass is the
 * workflow core's, not this module's.
 */
import { describe, expect, it } from "vitest";

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
    expect(baseline).toMatch(/`passes` as `\{ step, reason, evidenceRef \}`/);
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
      "verify-repeat-run": "runtime-heavy",
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
  it("has sdd-triage decide the owner, wire or retire, and stop outside a settled record", async () => {
    const text = await readShipped("step/sdd-triage/STEP.md");
    const owner = flat(sectionOf(text, "## Which surface owns the truth"));
    expect(owner).toMatch(/an in-force `decisions\.md` row that settles it/i);
    expect(owner).toMatch(/the surface that does not own the truth is the one that changes/i);
    const inert = flat(sectionOf(text, "## A mechanism nothing runs"));
    expect(inert).toMatch(/report `branch: \{ outcome: retire \}`/);
    const settled = flat(sectionOf(text, "## Settled mode"));
    expect(settled).toMatch(/`mode: settled`/);
    expect(settled).toMatch(/report `branch: \{ outcome: outside-record \}`/);
    const point = flat(sectionOf(text, "## At a decision point"));
    expect(point).toMatch(/`adopted` as `\{ step, decision, reason \}`/);
    expect(point).toMatch(/return `awaiting_input` and change nothing/i);
    expect(point).toMatch(/raises `gate:user` through `raise`/i);
  });
});
