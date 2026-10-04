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
  it("commits only the files the run changed, and pushes nothing", async () => {
    const step = flat(await readShipped("step/verify-commit/STEP.md"));
    expect(step).toMatch(/stage only the files the run changed/i);
    expect(step).toMatch(/a file that was already modified before the run started stays out/i);
    expect(step).toMatch(/in the final report: the commit, and the files it holds/i);
    expect(step).toMatch(/the step never pushes, opens a pull request or merges/i);
  });

  // QFAI:EX-0001-0225-08
  it("makes no commit when a verify gate failed", async () => {
    const procedure = await section("verify-commit", "## Procedure");
    expect(procedure).toMatch(/stop when a verify gate failed or did not run, and say which/i);
  });
});
