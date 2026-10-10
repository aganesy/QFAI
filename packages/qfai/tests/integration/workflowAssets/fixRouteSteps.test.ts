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
    expect(text).toMatch(/list the EX\b.*\bin the run's final report/i);
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

  // QFAI:AC-0001-0206-01
  // QFAI:AC-0001-0206-03
  // QFAI:EX-0001-0206-01
  // QFAI:EX-0001-0206-03
  it("selects an equivalent existing owner and stops unresolved obligations before writing", async () => {
    const diagnosed = sectionOf(
      await readShipped("step/implement-tdd/STEP.md"),
      "## A diagnosed missing example",
    );
    const ownership = flat(
      diagnosed.split("- Before appending the EX")[1]?.split("- Append exactly one EX")[0] ?? "",
    );
    expect(ownership, "owner selection needs its own eligibility and equivalence policy").toMatch(
      /existing.*rules.*cite.*matched AC.*state.*expected obligation/i,
    );
    expect(ownership).toMatch(/(?:prefer|retain|use).*existing owner.*(?:qualif|eligible)/i);
    expect(ownership).toMatch(/(?:sole|only).*qualifying rule/i);
    expect(ownership).toMatch(/only.*rules.*(?:proven|confirmed|demonstrably).*equivalent/i);
    expect(ownership).toMatch(
      /conditions.*(?:outcomes|results).*exceptions.*(?:authority|authorization)/i,
    );
    expect(ownership).toMatch(/(?:most|greatest|highest).*distinct.*existing EXs?.*that AC/i);
    expect(ownership).toMatch(/(?:exclud|without|not count).*new EX/i);
    expect(ownership).toMatch(/tie.*(?:ascending|stable|lowest).*BR ID/i);
    expect(ownership).toMatch(/(?:never|do not|not).*majority.*different.*(?:behaviour|behavior)/i);
    expect(ownership).toMatch(/no rule qualifies.*stop/i);
    expect(ownership).toMatch(/(?:behaviour|behavior) differs.*equivalence.*uncertain.*stop/i);
    expect(ownership).toMatch(
      /stop dependent work.*qfai-sdd.*drift-protocol\.md.*before changing.*AC.*EX/i,
    );
    expect(ownership).toMatch(/add no rule.*change no rule statement/i);
    const bullets = diagnosed.split(/\r?\n(?=- )/u);
    const citingRule = flat(
      bullets.find((bullet) => bullet.startsWith("- Add the new EX ID")) ?? "",
    );
    expect(citingRule).toMatch(/new EX ID.*selected rule.*Examples cell/i);
    expect(citingRule).toMatch(/(?:the rule's|its) Statement is unchanged/i);
    expect(citingRule).toMatch(/(?:asks? no|no extra).*question/i);
    const report = flat(bullets.find((bullet) => bullet.startsWith("- List the EX")) ?? "");
    expect(report).toMatch(/chosen BR.*reason.*final report/i);
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
