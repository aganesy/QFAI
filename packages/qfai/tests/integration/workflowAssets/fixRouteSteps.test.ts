// QFAI:AC-0001-0094-03
// QFAI:AC-0001-0186-01
// QFAI:AC-0001-0225-03
/**
 * Integration: what the steps of a fix route do between the diagnosis and the commit — the failing
 * test the diagnosis writes, the example the implement stage appends, the one test run while
 * implementing, and the local commit that ends a change route.
 *
 * Reads the shipped `STEP.md` files. How a session follows them is not this module's.
 */
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

async function section(step: string, heading: string): Promise<string> {
  const text = flat(sectionOf(await readShipped(`step/${step}/STEP.md`), heading));
  expect(text, `${step} has ${heading}`).not.toBe("");
  return text;
}

describe("a fix route from the diagnosis to the commit", () => {
  // QFAI:EX-0001-0186-14
  it("reproduces the failure with a failing test written before any production code changes", async () => {
    const text = await section("implement-diagnose", "## The failing test");
    expect(text).toMatch(/a command or manual steps alone reproduce nothing/i);
    expect(text).toMatch(
      /write the test that should have caught it, before any production code changes/i,
    );
    expect(text).toMatch(/observe its assertion fail for the reported behaviour \(Red\)/i);
  });

  // QFAI:EX-0001-0186-15
  it("puts an example that would contradict a rule to the user before writing it", async () => {
    const text = await section("implement-tdd", "## A diagnosed missing example");
    expect(text).toMatch(
      /an EX that would contradict a story, an AC, another EX or a rule is put to the user before anything is written/i,
    );
  });

  // QFAI:EX-0001-0186-16
  it("appends the missing example without asking on revert-culprit too, and reports it", async () => {
    const text = await section("implement-tdd", "## A diagnosed missing example");
    expect(text).toMatch(
      /on every route of the `fix` family, `improve-performance` included, and on `revert-culprit`/i,
    );
    expect(text).toMatch(/the behaviour a reverted change broke/i);
    expect(text).toMatch(/the step asks the user nothing/i);
    expect(text).toMatch(/list the EX in the run's final report/i);
  });

  // QFAI:EX-0001-0094-02
  it("passes the implement step without a ledger when every example is annotated", async () => {
    const text = await section("implement-tdd", "## Passes when");
    expect(text).toMatch(/the step passes when every example has an annotating test/i);
    expect(text).not.toMatch(/ledger/i);
  });

  // QFAI:EX-0001-0225-09
  it("runs only the test being written while implementing, and every other gate in verify", async () => {
    const text = flat(await readShipped("step/implement-tdd/STEP.md"));
    expect(text).toMatch(/while implementing, run only the selected test/i);
    expect(text).toMatch(
      /the full suite, lint, typecheck, build and `npx qfai validate` run once, in the verify stage/i,
    );
  });

  // QFAI:EX-0001-0225-07
  it("commits exactly the paths the run wrote, and pushes nothing", async () => {
    const step = flat(await readShipped("step/verify-commit/STEP.md"));
    expect(step).toMatch(
      /stage exactly the tracked deliverables the run wrote, with `git add <those paths>`/i,
    );
    expect(step).toMatch(/never `git add -A`/i);
    expect(step).toMatch(
      /already modified before the run and then written by it is committed whole; the final report names it/i,
    );
    expect(step).toMatch(/in the final report: the commit, and the files it holds/i);
    expect(step).toMatch(/the step never pushes, opens a pull request or merges/i);
  });

  // QFAI:EX-0001-0225-08
  it("makes no commit when a verify gate failed", async () => {
    const procedure = await section("verify-commit", "## Procedure");
    expect(procedure).toMatch(/stop when a verify gate failed or did not run, and say which/i);
  });

  // QFAI:EX-0001-0225-07
  it("never stages an ignored file, and reruns the gates after a hook-driven code fix", async () => {
    const procedure = await section("verify-commit", "## Procedure");
    expect(procedure).toMatch(/never `git add -A`, `git add \.` or `git add -f`/i);
    expect(procedure).toMatch(/never a file git ignores, such as `\.qfai\/report\/\*`/i);
    expect(procedure).toMatch(
      /when the fix changes code or tests, rerun the verify gates first, and the code review too when behaviour changed/i,
    );
  });

  it("leaves the backport's commit to verify-commit", async () => {
    const procedure = await section("implement-backport", "## Procedure");
    expect(procedure).toMatch(/`git cherry-pick -n -x`/);
    expect(procedure).toMatch(/`verify-commit` makes the commit/);
  });

  it("works the diagnosis's matched example first, and skips an example under a test exception", async () => {
    const text = await section("implement-tdd", "## Select the examples");
    expect(text).toMatch(
      /on a fix route, the EX the diagnosis matched or this step appended, first/i,
    );
    expect(text).toMatch(/it is still owed/i);
    expect(text).toMatch(/opening `Test exception:` names, with Status DONE, is exempt/i);
  });

  it("asks which rule owns the AC when several cite its examples", async () => {
    const text = await section("implement-tdd", "## A diagnosed missing example");
    expect(text).toMatch(/the contract rule the diagnosis names as owning that AC/i);
    expect(text).toMatch(/stop and ask the user which one; never pick one/i);
  });
});

describe("the evidence gates on a fix-intermittent route", () => {
  // QFAI:AC-0001-0220-05
  // QFAI:EX-0001-0220-27
  it("checks an existing ordinary Red on entry and otherwise retains the real stress harness", async () => {
    const step = await readShipped("step/implement-stress-harness/STEP.md");
    const paragraphs = sectionOf(step, "### Applicability on entry")
      .split(/\r?\n\s*\r?\n/u)
      .map(flat);
    const eligibility =
      paragraphs.find((paragraph) => /ordinary/i.test(paragraph) && /Red/.test(paragraph)) ?? "";
    expect(eligibility, "the stress exception needs a bounded existing-proof condition").toMatch(
      /(?:pre-existing|pre-entry|before.*enter).*executed.*Red|executed.*Red.*(?:pre-existing|pre-entry|before.*enter)/i,
    );
    expect(eligibility).toMatch(/(?:same|matching).*signature/i);
    expect(eligibility).toMatch(/(?:verified|established|confirmed).*ordinary.*state-dependent/i);
    for (const dependency of ["clock", "order", "parallelism", "load", "timing", "race"]) {
      expect(eligibility).toMatch(new RegExp(`(?:no|without).*\\b${dependency}\\b`, "i"));
    }
    const refusal = paragraphs.find((paragraph) => /unknown|missing/i.test(paragraph)) ?? "";
    expect(refusal).toMatch(/(?:missing|unrun|unexecuted).*Red/i);
    expect(refusal).toMatch(/(?:wrong|different|mismatch).*signature/i);
    expect(refusal).toMatch(/(?:unknown|uncertain).*cause/i);
    const operational =
      paragraphs.find(
        (paragraph) => /tools?|waits?|time/i.test(paragraph) && /(?:not|never|no)/i.test(paragraph),
      ) ?? "";
    const race =
      paragraphs.find((paragraph) => /(?:controlled|deterministic).*race/i.test(paragraph)) ?? "";
    expect(race).toMatch(
      /(?:controlled|deterministic).*race.*(?:harness|required)|(?:harness|required).*(?:controlled|deterministic).*race/i,
    );
    expect(operational).toMatch(
      /(?:tools?|waits?|time).*not.*(?:exception|exempt|reason|ground)|(?:not|never).*(?:tools?|waits?|time).*(?:exception|exempt|reason|ground)/i,
    );
    const record = paragraphs.find((paragraph) => paragraph.includes("applicabilityGate")) ?? "";
    const proof = paragraphs.find((paragraph) => /still runs/i.test(paragraph)) ?? "";
    expect(proof).toMatch(/still runs.*(?:verify|inspect|check).*proof/i);
    expect(record).toMatch(/applicabilityGate.*proof|proof.*applicabilityGate/i);
    expect(record).toMatch(/applicabilityGate.*(?:reason|why)/i);
    expect(record).toMatch(
      /(?:not|no).*stress.*(?:run|execut)|(?:not|no).*(?:run|execut).*stress/i,
    );
    const actual = flat(sectionOf(step, "### When a harness is required"));
    expect(actual).toMatch(/write the harness beside the project's tests/i);
    expect(actual).toMatch(/run it a recorded number of times at the current revision/i);
    expect(actual).toMatch(/failure appears at least once.*reported signature/i);
    expect(flat(sectionOf(step, "## Gate"))).toMatch(/harness reproduces.*recorded rate/i);
  });

  // QFAI:AC-0001-0220-05
  // QFAI:EX-0001-0220-27
  it("checks prior Red and current Green only for an ordinary fix and never exempts quarantine", async () => {
    const step = await readShipped("step/verify-repeat-run/STEP.md");
    const paragraphs = sectionOf(step, "### Applicability on entry")
      .split(/\r?\n\s*\r?\n/u)
      .map(flat);
    const eligibility =
      paragraphs.find((paragraph) => /ordinary/i.test(paragraph) && /Red/.test(paragraph)) ?? "";
    expect(eligibility, "repeat applicability must be limited to the ordinary fix route").toMatch(
      /only.*fix-intermittent/i,
    );
    expect(eligibility).toMatch(/diagnosis.*(?:verifies|confirmed|verified).*ordinary.*cause/i);
    expect(eligibility).toMatch(/(?:prior|previous).*executed.*Red/i);
    expect(eligibility).toMatch(/(?:same|matching).*signature/i);
    expect(eligibility).toMatch(
      /(?:observed|executed).*Green.*(?:exact.*current|current.*exact).*revision/i,
    );
    expect(eligibility).toMatch(/(?:no|without).*timing.*load.*(?:uncertainty|dependence)/i);
    const refusal = paragraphs.find((paragraph) => /unknown|missing/i.test(paragraph)) ?? "";
    expect(refusal).toMatch(/(?:missing|unrun|unexecuted).*Red/i);
    expect(refusal).toMatch(/(?:wrong|different|mismatch).*signature/i);
    expect(refusal).toMatch(/(?:stale|older).*Green|Green.*(?:stale|older)/i);
    expect(refusal).toMatch(/pending.*(?:CI|Green)|(?:CI|Green).*pending/i);
    expect(refusal).toMatch(/(?:unknown|uncertain).*cause/i);
    const operational =
      paragraphs.find(
        (paragraph) => /tools?|waits?|time/i.test(paragraph) && /(?:not|never|no)/i.test(paragraph),
      ) ?? "";
    expect(operational).toMatch(
      /(?:tools?|waits?|time).*not.*(?:exception|exempt|reason|ground)|(?:not|never).*(?:tools?|waits?|time).*(?:exception|exempt|reason|ground)/i,
    );
    const quarantine =
      paragraphs.find(
        (paragraph) =>
          /quarantine/i.test(paragraph) &&
          /always|all.*real.*runs|never.*exception/i.test(paragraph),
      ) ?? "";
    expect(quarantine).toMatch(/quarantine.*(?:always|never.*exception|all.*real.*runs)/i);
    const record = paragraphs.find((paragraph) => paragraph.includes("applicabilityGate")) ?? "";
    const proof = paragraphs.find((paragraph) => /still runs/i.test(paragraph)) ?? "";
    expect(proof).toMatch(/still runs.*(?:verify|inspect|check).*proof/i);
    expect(record).toMatch(/applicabilityGate.*proof|proof.*applicabilityGate/i);
    expect(record).toMatch(/applicabilityGate.*(?:reason|why)/i);
    expect(record).toMatch(
      /(?:not|no).*(?:repeat|consecutive).*(?:run|execut)|(?:not|no).*(?:run|execut).*(?:repeat|consecutive)/i,
    );
    const actual = flat(sectionOf(step, "### When repeated runs are required"));
    expect(actual).toMatch(/fix the number of runs before the first one/i);
    expect(actual).toMatch(/record every run in order/i);
    expect(actual).toMatch(/one failure ends the step/i);
    expect(actual).toMatch(/when every run passed, lift the quarantine/i);
    expect(flat(sectionOf(step, "## Gate"))).toMatch(
      /every run is recorded.*all of them passed on the same revision/i,
    );
  });
});

describe("where qfai-run runs the policy check and the commit", () => {
  it("checks policy after planning, writing nothing on a route that changes nothing", async () => {
    const work = flat(sectionOf(await readShipped("skill/qfai-run/SKILL.md"), "## The work"));
    expect(work).toMatch(/then run `common-policy-check` once/i);
    expect(work).toMatch(
      /on a route that changes no file, one that closes, answers or asks, it reads and reports and writes nothing/i,
    );
    expect(work.indexOf("**Extract.**")).toBeLessThan(work.indexOf("common-policy-check"));
  });

  it("commits after an end release point, so the commit holds the approval", async () => {
    const work = flat(
      sectionOf(await readShipped("skill/qfai-run/references/stage-points.md"), "## Release point"),
    );
    expect(work).toMatch(/`verify-commit` runs after that, so the commit holds the approval/i);
  });

  it("starts a stage skill invoked by name with the policy check", async () => {
    const baseline = flat(
      sectionOf(
        await readShipped("rule/shared-skill-operating-baseline.md"),
        "### A parent skill invoked by name",
      ),
    );
    expect(baseline).toMatch(/2\. Run `common-policy-check` once/);
  });
});

describe("a verify gate that fails on the base commit or cannot run", () => {
  it("runs the failing gate on the base commit and records the comparison", async () => {
    const text = await section("common-gate-run", "## A failure that predates the change");
    expect(text).toMatch(/run it again on the base commit/i);
    expect(text).toMatch(/baseline `same`/i);
    expect(text).toMatch(/baseline `different`/i);
    expect(text).toMatch(/baseline `unrun`, with the reason/i);
    expect(text).toMatch(/never turns it into a pass/i);
  });

  it("keeps the stop before the commit and lists such gates apart", async () => {
    const text = await section("verify-repo-gate", "## A failure the run did not cause");
    expect(text).toMatch(
      /top-level `status` stays `"FAIL"`, so the run stops before `verify-commit`/i,
    );
    expect(text).toMatch(/apart from the failures the run caused/i);

    const procedure = await section("verify-commit", "## Procedure");
    expect(procedure).toMatch(/fails the same way on the base commit is still a failed gate/i);
  });

  it("lets verify.json record UNRUN and the baseline on a gate", async () => {
    const contract = flat(
      await readShipped("skill/qfai-verify/references/verify-output-contract.md"),
    );
    expect(contract).toMatch(/`"PASS"`, `"FAIL"`, `"UNRUN"` or `"DELEGATED"`/);
    expect(contract).toMatch(/`baseline` \| string/);
    expect(contract).toMatch(/still makes the top-level `status` `"FAIL"`/);
  });
});
