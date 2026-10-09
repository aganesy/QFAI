/**
 * Integration: what `/qfai-implement` does when a workflow run hands it a work order.
 *
 * Reads the shipped `qfai-implement` steps a run names, and the shared rule every worker follows.
 * The workflow core's checks at `accept` are not this module's.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";
import { flat, readShipped, rowOf, sectionOf } from "../../helpers/shippedAssistant.js";

const OPERATING = "rule/shared-skill-operating-baseline.md";
const IMPLEMENT_SKILL = "skill/qfai-implement/SKILL.md";
const TDD = "step/implement-tdd/STEP.md";
const DIAGNOSE = "step/implement-diagnose/STEP.md";
const REGRESSION_FIX = "step/implement-regression-fix/STEP.md";
const TEST_FIX = "step/implement-test-fix/STEP.md";
const ACCEPTANCE = "step/implement-acceptance/STEP.md";

async function step(file: string): Promise<string> {
  const text = flat(await readShipped(file));
  expect(text, `${file} is shipped`).not.toBe("");
  return text;
}

describe("qfai-implement in a workflow run", () => {
  // QFAI:AC-0001-0200-01
  // QFAI:EX-0001-0200-01
  it("works only the work order's examples and hands over a request with no work order", async () => {
    const entry = sectionOf(await readShipped(OPERATING), "## Workflow Run Entry Check");
    expect(rowOf(entry, "| `pass-on`")).toMatch(/Edit nothing\. Pass the request to `qfai-run`/);
    expect(rowOf(entry, "| `step`")).toMatch(/Do only that step.s work/);
    const steps = flat(sectionOf(await readShipped(OPERATING), "### A plan's steps"));
    expect(steps).toMatch(
      /runs the steps of the plan `npx qfai workflow plan` returned, stage by stage, and no other/i,
    );
  });

  // QFAI:AC-0001-0201-02
  // QFAI:EX-0001-0201-02
  it("returns exactly one verdict, the matched IDs and a reproduction record", async () => {
    const text = await step(DIAGNOSE);
    expect(text).toMatch(
      /exactly one verdict in `diagnosis\.verdict`, one of: `missing-test`, `defective-test`, `regression`, `expectation-differs`/i,
    );
    expect(text).toMatch(/`matchedIds`, which names the BF, AC or EX IDs of the bound flow/i);
    expect(text).toMatch(/for `missing-test` it names the EX that states the case, or the AC/i);
    expect(text).toMatch(
      /`reproductionRef`, which names the record that holds the reproduction, the cause candidates and the impact/i,
    );
  });

  // QFAI:AC-0001-0201-03
  // QFAI:EX-0001-0201-03
  // QFAI:EX-0001-0201-04
  it("raises no change request for a diagnosed missing test, and one for every other scope gap", async () => {
    const text = await step(TDD);
    expect(text).toMatch(
      /send a decision, a question for the user or an out-of-scope discovery to `\/qfai-sdd` as a change request/i,
    );
    expect(text).toMatch(
      /a diagnosed missing test on behaviour an existing AC states is the one scope gap that raises no change request/i,
    );
    expect(text).toMatch(/an EX that states the case is worked as an EX no test annotates/i);
    expect(text).toMatch(/where none does, this step appends it/i);
  });

  // QFAI:AC-0001-0202-01
  // QFAI:EX-0001-0202-01
  it("fixes a regression in production code only, leaving the example covered", async () => {
    const text = await step(REGRESSION_FIX);
    expect(text).toMatch(
      /the fix changes production code only\. no test, story or contract file changes/i,
    );
    expect(text).toMatch(/the example stays annotated by the same test/i);
    expect(text).toMatch(/no `Change request:` row is appended and no evidence entry is removed/i);
  });

  // QFAI:AC-0001-0203-01
  // QFAI:EX-0001-0203-01
  it("keeps a test fix on the same annotated IDs, with a review and a re-run", async () => {
    const text = await step(TEST_FIX);
    expect(text).toMatch(/`citedBefore`, `citedAfter`/);
    expect(text).toMatch(/the fixed test annotates the same IDs as before/i);
    expect(text).toMatch(/no story, contract or `decisions\.md` file changes/i);
    expect(text).toMatch(/reported in the stage report/i);
  });

  // QFAI:AC-0001-0203-02
  // QFAI:EX-0001-0203-02
  it("makes no test fix that changes what is checked, and names qfai-sdd", async () => {
    const text = await step(TEST_FIX);
    expect(text).toMatch(/would check a different ID is not made/i);
    expect(text).toMatch(/The session stops and names `\/qfai-sdd` as the owner of the change/);
  });

  // QFAI:AC-0001-0203-03
  // QFAI:EX-0001-0203-03
  // QFAI:AC-0001-0216-04
  // QFAI:EX-0001-0216-05
  it("repairs a test whatever layer its first matched ID names", async () => {
    const text = await step(TEST_FIX);
    expect(text).toMatch(
      /repairs it, whatever layer the\s+first ID of the diagnosis's `matchedIds` names/i,
    );
    expect(text).toMatch(
      /maps a BF to an E2E test, an AC to an\s+integration or API test, and an EX/i,
    );
    expect(text).toContain("## Passes when");
    expect(text).toMatch(/A pass while the\s+diagnosis names a defective test is refused/i);
  });
});

describe("the implement-tdd micro-cycle", () => {
  // QFAI:AC-0001-0091-01
  // QFAI:EX-0001-0091-01
  it("takes an unannotated example through an observed Red, Green and Refactor and writes no ledger status", async () => {
    const text = await step(TDD);
    expect(text).toMatch(/the flow's EX IDs that no test annotates, in EX ID order/i);
    expect(text).toMatch(/annotate it `QFAI:EX-NNNN-NNNN-NN` on the comment line directly before/i);
    expect(text).toMatch(
      /\*\*Red:\*\* Run the Test command from `tech\.md` for the selected test alone\. Observe the assertion fail/i,
    );
    expect(text).toMatch(
      /\*\*Green:\*\* Write the minimum production code that makes this test pass/i,
    );
    expect(text).toMatch(/Run the same selector and record command and outcome/i);
    expect(text).toMatch(
      /\*\*Refactor:\*\* Improve the tested code without changing its behavior\. Re-run the selector and record the result/i,
    );
    expect(text).toMatch(
      /done for an example when its RED, GREEN and Refactor results are observed/i,
    );
    expect(flat(await readShipped(IMPLEMENT_SKILL))).toMatch(/reads or writes no ledger status/i);
  });

  // QFAI:AC-0001-0091-02
  // QFAI:EX-0001-0091-02
  it("writes the least production code that passes the selected test and generalizes no further", async () => {
    const text = await step(TDD);
    expect(text).toMatch(
      /Write the minimum production code that makes this test pass\. Do not generalize to an untested case/i,
    );
    expect(text).toMatch(
      /Minimal is measured against the example's obligation, not the test's inputs: a value hard-coded to match the test meets neither/i,
    );
  });

  // QFAI:AC-0001-0091-03
  it("takes the Test command from the Standard commands section of tech.md and from no other file", async () => {
    const text = await step(TDD);
    expect(text).toMatch(
      /Read the \*\*Standard commands\*\* section of `<paths\.contractsDir>\/tech\.md`/i,
    );
    expect(text).toMatch(/Obtain the Test command only from that section/i);
    expect(text).toMatch(/Lint, Typecheck and Build run once, in the verify stage/i);
    const commands = flat(sectionOf(await readShipped(OPERATING), "## Standard Commands"));
    expect(commands).toMatch(/Read them there and nowhere else/i);
    expect(commands).toMatch(
      /Install, Format, Test, Lint, Typecheck, Build, Skeleton and Validate come from that section/i,
    );
    expect(commands).toMatch(/Do not infer one from the package manager/i);
  });

  // QFAI:EX-0001-0091-07
  it("records an observation as an EX row under the configured specs directory, never as a test-case row", async () => {
    const rule = flat(
      await readFile(
        path.join(getInitAssetsDir(), "root", ".agents", "rules", "minimal-implementation.md"),
        "utf-8",
      ),
    );
    expect(rule).toContain(
      "An observed failure has an example in the owning story's `03_Example.md` and a test that annotates its EX ID. Resolve `paths.specsDir` from `qfai.config.yaml`",
    );
    expect(rule).toContain(`the default is \`${defaultConfig.paths.specsDir}\``);
    expect(rule).not.toContain("06_Test-Cases");
  });
});

describe("implement-acceptance", () => {
  // QFAI:AC-0001-0226-02
  // QFAI:EX-0001-0226-02
  it("writes the bodies of empty acceptance tests and keeps every annotation and file", async () => {
    const text = await step(ACCEPTANCE);
    expect(text).toMatch(/writes the assertions those bodies owe/i);
    expect(text).toMatch(/Each test keeps its annotation and its file/);
    expect(text).toMatch(/No annotation is added, moved or removed/);
  });
});
