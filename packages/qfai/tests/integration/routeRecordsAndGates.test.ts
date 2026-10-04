/**
 * What a route records and runs outside the discussion stage: no grilling
 * record, the gates once in verify, and the reviews its plan names.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { defaultRoutingEntries } from "../helpers/shippedAssistant.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const assistant = path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant");
const read = (relative: string): Promise<string> =>
  readFile(path.join(assistant, relative), "utf-8");
const flat = (text: string): string => text.replace(/\s+/g, " ");

async function stepNames(): Promise<string[]> {
  return (await readdir(path.join(assistant, "step"), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

describe("a route outside the discussion stage writes no grilling record", () => {
  // QFAI:AC-0001-0223-02
  // QFAI:EX-0001-0223-09
  it("keeps the record to the discussion stage and the choice to the final report", async () => {
    const record = flat(await read("step/common-grilling-record/STEP.md"));
    expect(record).toContain("Only the discussion stage writes this record.");
    expect(record).toContain("reports what it settled in its final report");

    for (const step of await stepNames()) {
      if (step.startsWith("discussion-") || step === "common-grilling-record") continue;
      const text = await read(`step/${step}/STEP.md`);
      expect(text, step).not.toContain("common-grilling-record");
      expect(text, step).not.toContain("## Grilling Session");
    }

    const baseline = flat(await read("rule/shared-skill-delegation-baseline.md"));
    expect(baseline).not.toContain("grilling(-/none): none");
    expect(baseline).toContain(
      "A stage that fans work out to agents in parallel records the fan-out in this table",
    );
    expect(baseline).toContain("**The stage's final report is the record.**");

    const article = flat(await read("rule/constitution.md"))
      .split("## Article IX")[1]
      ?.split("## Article X")[0];
    expect(article).toContain("Nothing is recorded beyond the stage's final report.");
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

describe("the reviews a route runs are the ones its plan names", () => {
  // QFAI:AC-0001-0161-06
  // QFAI:EX-0001-0161-07
  it("routes no review phase, blocking agent or reviewer profile to a step", async () => {
    for (const entry of await defaultRoutingEntries()) {
      if (typeof entry.step !== "string") continue;
      expect([undefined, "default"], entry.step).toContain(entry.review_profile);
      const phases: unknown[] = Array.isArray(entry.phases) ? entry.phases : [];
      for (const phase of phases) {
        if (typeof phase !== "object" || phase === null) continue;
        expect(Reflect.get(phase, "id"), entry.step).not.toBe("review");
        expect(Object.keys(phase), entry.step).not.toContain("blocking_agents");
      }
    }
  });
});

describe("implement invoked by name validates its flow once", () => {
  // QFAI:AC-0001-0094-04
  // QFAI:EX-0001-0094-05
  it("runs the flow-scoped validate at completion and never --spec", async () => {
    const skill = flat(await read("skill/qfai-implement/SKILL.md"));
    expect(skill).toContain(
      "Invoked by name, it runs `npx qfai validate --profile tdd --fail-on error --flow BF-NNNN` once, at completion",
    );
    expect(skill).toContain("Inside a route it runs no validate: the verify stage does.");
    expect(skill).not.toMatch(/qfai validate[^.]*--spec\b/);
  });
});
