/**
 * What a route records and runs outside the discussion stage: no grilling
 * record, the gates once in verify, and the reviews its plan names.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { planOf } from "../../src/core/workflow/plan.js";
import { readRule } from "../helpers/ruleWithReferences.js";
import { minimalProject, removeProjects } from "./workflow/workflowProject.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const assistant = path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant");
const read = (relative: string): Promise<string> => readRule(path.join(assistant, relative));
const flat = (text: string): string => text.replace(/\s+/g, " ");
const GRILLING_RULE = "packages/qfai/assets/init/root/.agents/rules/grilling.md";

async function stepNames(): Promise<string[]> {
  return (await readdir(path.join(assistant, "step"), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

describe("no stage writes a grilling record beside the deliberation record", () => {
  // QFAI:AC-0001-0223-02
  // QFAI:EX-0001-0223-09
  it("keeps a session's results to rows of the run's deliberation record", async () => {
    const record = flat(await read("step/common-grilling-record/STEP.md"));
    expect(record).toContain(
      "Apart from those rows, no stage writes a grilling record, a session table or a marker saying that no session was held.",
    );
    expect(record).toContain(
      "No row for a step that held no session: nothing is written to say none was held.",
    );

    for (const step of await stepNames()) {
      const text = await read(`step/${step}/STEP.md`);
      expect(text, step).not.toContain("## Grilling Session");
      if (step.startsWith("discussion-") || step === "common-grilling-record") continue;
      expect(text, step).not.toContain("common-grilling-record");
    }
    expect(flat(await readFile(path.join(repoRoot, GRILLING_RULE), "utf-8"))).toContain(
      "**The record's path in the final report**",
    );

    const baseline = flat(await read("rule/shared-skill-delegation-baseline.md"));
    expect(baseline).not.toContain("grilling(-/none): none");
    expect(baseline).toContain(
      "A stage that fans work out to agents in parallel records the fan-out in this table",
    );
    expect(baseline).toContain(
      "**A reviewer reads a recommendation from the session, never from a record.**",
    );

    const article = flat(await read("rule/constitution.md"))
      .split("## Article IX")[1]
      ?.split("## Article X")[0];
    expect(article).toContain(
      "A decision the agents take is an Agent decisions row of the run's deliberation record, and no report lists it.",
    );
  });
});

describe("the gates run once, in the verify stage", () => {
  // QFAI:AC-0001-0225-03
  // QFAI:EX-0001-0225-09
  it("runs only the test being written before verify, and no gate before the review", async () => {
    const workflow = flat(await read("rule/workflow.md"));
    expect(workflow).toContain(
      "While implementing, run only the test being written. Lint, typecheck, build, the full suite and `npx qfai validate` run once, in the verify stage.",
    );

    const review = flat(await read("step/common-review-cycle/STEP.md"));
    expect(review).toContain("The review runs no gate of its own.");
    expect(review).not.toContain("common-gate-run");

    for (const step of [
      "implement-regression-fix",
      "implement-test-fix",
      "implement-refactor",
      "implement-retire",
      "implement-revert",
      "implement-sweep",
      "implement-dep-bump",
    ]) {
      const text = flat(await read(`step/${step}/STEP.md`));
      expect(text, step).not.toMatch(/Lint, Typecheck and Build/);
      expect(text, step).not.toContain("project gates pass");
    }
    expect((await stepNames()).includes("implement-checkpoint")).toBe(false);
  });
});

describe("implement invoked by name validates its flow once", () => {
  // QFAI:AC-0001-0094-04
  // QFAI:EX-0001-0094-05
  it("runs the flow-scoped validate at completion", async () => {
    const skill = flat(await read("skill/qfai-implement/SKILL.md"));
    expect(skill).toContain(
      "Invoked by name, it runs `npx qfai validate --profile tdd --fail-on error --flow BF-NNNN` once, at completion",
    );
    expect(skill).toContain("Inside a route it runs no validate: the verify stage does.");
  });
});

describe("a step with no open design decision starts no griller", () => {
  // QFAI:AC-0001-0223-06
  afterEach(removeProjects);

  const rule = async (): Promise<string> =>
    flat(
      await readFile(
        path.join(repoRoot, "packages/qfai/assets/init/root/.agents/rules/grilling.md"),
        "utf-8",
      ),
    );

  /** The steps `npx qfai workflow plan --route <route>` runs, in order. */
  async function plannedSteps(route: string): Promise<string[]> {
    const document = await planOf(await minimalProject(), { route });
    if (!document.ok || !("stages" in document)) throw new Error(`${route} does not plan`);
    return document.stages.flatMap((stage) => stage.steps.map((step) => step.name));
  }

  /** The planned steps whose own text calls for a grilling session or a griller. */
  async function grillingSteps(route: string): Promise<string[]> {
    const steps = await plannedSteps(route);
    expect(steps.length, route).toBeGreaterThan(0);
    const texts = await Promise.all(
      steps.map((step) => readFile(path.join(assistant, "step", step, "STEP.md"), "utf-8")),
    );
    return steps.filter((_, index) => /grill/i.test(texts[index] ?? ""));
  }

  // QFAI:EX-0001-0223-10
  it("plans a merge with no step that starts a griller, and the rule holds no session for it", async () => {
    expect(await grillingSteps("run-operation")).toEqual([]);
    const text = await rule();
    expect(text).toContain(
      "**Most steps hold no session.** An operation such as a merge or a push,",
    );
    expect(text).toContain("Start no griller for them.");
    expect(text).toContain(
      "Decide from what is written, write no session record, and list nothing for the user.",
    );
  });

  // QFAI:EX-0001-0223-11
  it("plans a fix the story tree states with no step that starts a griller", async () => {
    expect(await grillingSteps("fix-defect")).toEqual([]);
    expect(await rule()).toContain(
      "a fix whose expected behaviour the story tree already states have no open design decision.",
    );
  });

  // QFAI:EX-0001-0223-12
  it("still grills a design decision the repository cannot settle, and only a critical one reaches the user", async () => {
    const steps = await plannedSteps("add-feature");
    expect(steps[0]).toBe("sdd-triage");
    const triage = flat(await read("step/sdd-triage/STEP.md"));
    expect(triage).toContain("references/sdd-pre-draft-grilling.md");
    const checkpoint = flat(await read("skill/qfai-sdd/references/sdd-pre-draft-grilling.md"));
    expect(checkpoint).toContain(
      "When the frontier holds a design decision the repository cannot settle, the agent settles the frontier in a delegated grilling session",
    );
    expect(checkpoint).toContain("It asks the user each critical decision the frontier holds.");
    const text = await rule();
    expect(text).toMatch(
      /\| Delegated +\| Any other stage, when it meets a design decision the request needs and the repository cannot settle +\| The session agent, interviewed by a griller +\| Critical decisions only +\|/,
    );
    expect(text).toContain("A critical decision met on the way still goes to the user.");
    expect(text).toContain(
      "**An Agent decisions row** of the run's deliberation record: at least three options, the recommendation taken",
    );
    // `sdd-triage` names no kind of session, so the default decides it.
    expect(text).toContain("**Delegated is the default where a session is held.**");
    expect(flat(await read("skill/qfai-grilling/SKILL.md"))).toContain(
      "A stage that says nothing holds a delegated session where one is held.",
    );
  });
});
